import sys
sys.path.insert(0, '.')
from datetime import date
from decimal import Decimal
from sqlalchemy import text
from passlib.context import CryptContext

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.contact import Contact
from app.models.category import Category
from app.models.product import Product
from app.models.analytic_account import AnalyticAccount
from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.customer_invoice import CustomerInvoice
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.vendor_bill import VendorBill
from app.models.payment import Payment

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def setup_rbac():
    print("1. Updating PostgreSQL constraint users_role_check...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"))
        conn.execute(text("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Admin', 'Accountant', 'Customer', 'Vendor'));"))
        conn.commit()
    print("   Constraint successfully updated to allow ['Admin', 'Accountant', 'Customer', 'Vendor']!")

    db = SessionLocal()
    try:
        print("\n2. Setting up Demo Users & Contacts...")
        hashed_pw = hash_password("password123")

        # --- A. ADMIN USER ---
        admin = db.query(User).filter(User.login_id == "ADMIN001").first()
        if not admin:
            admin = User(
                name="Admin User",
                login_id="ADMIN001",
                email="admin@urbanfurniture.com",
                password_hash=hashed_pw,
                role="Admin",
                is_active=True
            )
            db.add(admin)
        else:
            admin.password_hash = hashed_pw
            admin.role = "Admin"

        # --- B. ACCOUNTANT USER ---
        accountant = db.query(User).filter(User.login_id == "JA001").first()
        if not accountant:
            accountant = User(
                name="John Accountant",
                login_id="JA001",
                email="john@urbanfurniture.com",
                password_hash=hashed_pw,
                role="Accountant",
                is_active=True
            )
            db.add(accountant)
        else:
            accountant.password_hash = hashed_pw
            accountant.role = "Accountant"

        # --- C. CUSTOMER CONTACT & USER ---
        customer_contact = db.query(Contact).filter(Contact.email == "sarah@urbanfurniture.com").first()
        if not customer_contact:
            customer_contact = Contact(
                contact_type="Customer",
                name="Sarah Customer",
                email="sarah@urbanfurniture.com",
                phone="+91 98765 11111",
                city="Bengaluru",
                state="Karnataka",
                country="India"
            )
            db.add(customer_contact)
            db.flush()

        customer_user = db.query(User).filter(User.login_id == "SC001").first()
        if not customer_user:
            customer_user = User(
                name="Sarah Customer",
                login_id="SC001",
                email="sarah@urbanfurniture.com",
                password_hash=hashed_pw,
                role="Customer",
                is_active=True
            )
            db.add(customer_user)
        else:
            customer_user.password_hash = hashed_pw
            customer_user.role = "Customer"
            customer_user.email = "sarah@urbanfurniture.com"

        # --- D. VENDOR CONTACT & USER ---
        vendor_contact = db.query(Contact).filter(Contact.email == "timber@supplies.com").first()
        if not vendor_contact:
            vendor_contact = Contact(
                contact_type="Vendor",
                name="Timber Craft Supplies Ltd",
                email="timber@supplies.com",
                phone="+91 98765 22222",
                city="Mumbai",
                state="Maharashtra",
                country="India"
            )
            db.add(vendor_contact)
            db.flush()

        vendor_user = db.query(User).filter(User.login_id == "VC001").first()
        if not vendor_user:
            # Check email collision
            existing_by_email = db.query(User).filter(User.email == "timber@supplies.com").first()
            if existing_by_email:
                existing_by_email.role = "Vendor"
                existing_by_email.login_id = "VC001"
                existing_by_email.password_hash = hashed_pw
                vendor_user = existing_by_email
            else:
                vendor_user = User(
                    name="Timber Craft Vendor",
                    login_id="VC001",
                    email="timber@supplies.com",
                    password_hash=hashed_pw,
                    role="Vendor",
                    is_active=True
                )
                db.add(vendor_user)
        else:
            vendor_user.password_hash = hashed_pw
            vendor_user.role = "Vendor"
            vendor_user.email = "timber@supplies.com"

        db.commit()
        db.refresh(admin)
        db.refresh(accountant)
        db.refresh(customer_user)
        db.refresh(vendor_user)
        print("   Users setup successfully:")
        print(f"   - Admin:      {admin.login_id} (Role: {admin.role})")
        print(f"   - Accountant: {accountant.login_id} (Role: {accountant.role})")
        print(f"   - Customer:   {customer_user.login_id} (Role: {customer_user.role})")
        print(f"   - Vendor:     {vendor_user.login_id} (Role: {vendor_user.role})")

        # --- 3. Seed Sample Customer Invoices & Vendor Bills for Demo ---
        print("\n3. Ensuring Sample Orders & Invoices for Customer & Vendor...")
        cat = db.query(Category).first()
        if not cat:
            cat = Category(category_name="Office Furniture", description="Office essentials")
            db.add(cat)
            db.flush()

        prod = db.query(Product).first()
        if not prod:
            prod = Product(
                category_id=cat.id,
                product_name="Ergonomic Desk Chair",
                product_type="Goods",
                sales_price=Decimal("12500.00"),
                cost_price=Decimal("7000.00")
            )
            db.add(prod)
            db.flush()

        # Customer Order & Invoices for Sarah
        existing_so = db.query(SalesOrder).filter(SalesOrder.customer_id == customer_contact.id).first()
        if not existing_so:
            so = SalesOrder(
                customer_id=customer_contact.id,
                created_by=admin.id,
                so_number="SO-SARAH-001",
                so_date=date.today(),
                status="Confirmed",
                total_amount=Decimal("25000.00")
            )
            db.add(so)
            db.flush()

            so_item = SalesOrderItem(
                sales_order_id=so.id,
                product_id=prod.id,
                quantity=2,
                unit_price=Decimal("12500.00"),
                total=Decimal("25000.00")
            )
            db.add(so_item)

            inv1 = CustomerInvoice(
                sales_order_id=so.id,
                invoice_number="INV-SARAH-001",
                invoice_date=date.today(),
                due_date=date.today(),
                status="Posted",
                total_amount=Decimal("25000.00")
            )
            db.add(inv1)
            db.flush()

            # Add payment for part of invoice
            pmt = Payment(
                customer_invoice_id=inv1.id,
                payment_type="Receive",
                payment_method="UPI",
                payment_date=date.today(),
                amount=Decimal("10000.00"),
                note="Partial advance payment by customer"
            )
            db.add(pmt)

        # Vendor Order & Bills for Timber Craft
        existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.vendor_id == vendor_contact.id).first()
        if not existing_po:
            po = PurchaseOrder(
                vendor_id=vendor_contact.id,
                created_by=admin.id,
                po_number="PO-TIMBER-001",
                po_date=date.today(),
                status="Confirmed",
                total_amount=Decimal("70000.00")
            )
            db.add(po)
            db.flush()

            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=prod.id,
                quantity=10,
                unit_price=Decimal("7000.00"),
                total=Decimal("70000.00")
            )
            db.add(po_item)

            bill1 = VendorBill(
                purchase_order_id=po.id,
                bill_number="BILL-TIMBER-001",
                bill_date=date.today(),
                due_date=date.today(),
                status="Posted",
                total_amount=Decimal("70000.00")
            )
            db.add(bill1)
            db.flush()

            pmt2 = Payment(
                vendor_bill_id=bill1.id,
                payment_type="Send",
                payment_method="Bank Transfer",
                payment_date=date.today(),
                amount=Decimal("35000.00"),
                note="50% advance to timber supplier"
            )
            db.add(pmt2)

        db.commit()
        print("   Sample transaction data created successfully for Customer & Vendor!")
    finally:
        db.close()

if __name__ == "__main__":
    setup_rbac()
