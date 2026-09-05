import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.contact import Contact
from app.models.category import Category
from app.models.product import Product
from app.services.auth_service import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    """Create a verified Admin user and generate a Bearer authorization token."""
    db = SessionLocal()
    try:
        admin_login = "SALES_ADMIN"
        user = db.query(User).filter(User.login_id == admin_login).first()
        if not user:
            user = User(
                name="Test Sales Admin",
                login_id=admin_login,
                email="test_admin_sales@example.com",
                password_hash=hash_password("password123"),
                role="Admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(data={"sub": user.login_id, "id": user.id, "role": user.role})
        return {"Authorization": f"Bearer {token}", "user_id": user.id}
    finally:
        db.close()


@pytest.fixture(scope="module")
def setup_customer_and_product(auth_header):
    """Ensure a test Customer contact and finished product exist in the DB."""
    db = SessionLocal()
    try:
        # 1. Customer Contact
        customer = db.query(Contact).filter(Contact.email == "customer_sales@example.com").first()
        if not customer:
            customer = Contact(
                contact_type="Customer",
                name="Elite Interior Designs",
                email="customer_sales@example.com",
                phone="9123456780",
                city="Bengaluru",
                state="Karnataka",
                country="India"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        # 2. Category
        category = db.query(Category).filter(Category.category_name == "Living Room").first()
        if not category:
            category = Category(
                category_name="Living Room",
                description="Living room luxury furniture"
            )
            db.add(category)
            db.commit()
            db.refresh(category)

        # 3. Products
        prod1 = db.query(Product).filter(Product.product_name == "Leather Chesterfield Sofa").first()
        if not prod1:
            prod1 = Product(
                category_id=category.id,
                product_name="Leather Chesterfield Sofa",
                product_type="Goods",
                sales_price=45000.00,
                cost_price=28000.00
            )
            db.add(prod1)

        prod2 = db.query(Product).filter(Product.product_name == "Solid Oak Coffee Table").first()
        if not prod2:
            prod2 = Product(
                category_id=category.id,
                product_name="Solid Oak Coffee Table",
                product_type="Goods",
                sales_price=12000.00,
                cost_price=7000.00
            )
            db.add(prod2)

        db.commit()
        db.refresh(prod1)
        db.refresh(prod2)

        return {
            "customer_id": customer.id,
            "product1_id": prod1.id,
            "product2_id": prod2.id,
        }
    finally:
        db.close()


def test_complete_sales_workflow(auth_header, setup_customer_and_product):
    headers = {"Authorization": auth_header["Authorization"]}
    user_id = auth_header["user_id"]
    customer_id = setup_customer_and_product["customer_id"]
    p1_id = setup_customer_and_product["product1_id"]
    p2_id = setup_customer_and_product["product2_id"]

    ts = int(time.time())
    so_number = f"SO-TEST-{ts}"

    # =========================================================================
    # STEP 1: CREATE SALES ORDER (Draft Quotation)
    # =========================================================================
    so_payload = {
        "customer_id": customer_id,
        "created_by": user_id,
        "so_number": so_number,
        "so_date": "2026-09-06",
        "items": [
            {
                "product_id": p1_id,
                "quantity": 2,
                "unit_price": 45000.00
            }
        ]
    }
    so_res = client.post("/sales-orders/", json=so_payload, headers=headers)
    assert so_res.status_code == 201, so_res.text
    so_data = so_res.json()
    so_id = so_data["id"]
    assert so_data["so_number"] == so_number
    assert so_data["status"] == "Draft"
    assert float(so_data["total_amount"]) == 90000.00
    assert len(so_data["items"]) == 1

    # =========================================================================
    # STEP 2: SALES ORDER ITEMS (CRUD & Recalculation)
    # =========================================================================
    # 2a. Fetch line items for this SO
    items_res = client.get(f"/sales-order-items/by-so/{so_id}", headers=headers)
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) == 1

    # 2b. Add a second item to the Draft SO (Coffee Table: 1 * 12000)
    add_item_payload = {
        "product_id": p2_id,
        "quantity": 1,
        "unit_price": 12000.00
    }
    add_res = client.post(f"/sales-order-items/by-so/{so_id}", json=add_item_payload, headers=headers)
    assert add_res.status_code == 201, add_res.text
    new_item = add_res.json()
    new_item_id = new_item["id"]
    assert float(new_item["total"]) == 12000.00

    # Verify parent SO total updated: 90000 + 12000 = 102000
    so_check = client.get(f"/sales-orders/{so_id}", headers=headers).json()
    assert float(so_check["total_amount"]) == 102000.00

    # 2c. Update line item quantity: change coffee table qty from 1 to 2
    update_res = client.patch(
        f"/sales-order-items/{new_item_id}",
        json={"quantity": 2},
        headers=headers
    )
    assert update_res.status_code == 200, update_res.text
    updated_item = update_res.json()
    assert updated_item["quantity"] == 2
    assert float(updated_item["total"]) == 24000.00

    # Verify parent SO total updated: 90000 + 24000 = 114000
    so_check = client.get(f"/sales-orders/{so_id}", headers=headers).json()
    assert float(so_check["total_amount"]) == 114000.00

    # 2d. Delete second item
    del_res = client.delete(f"/sales-order-items/{new_item_id}", headers=headers)
    assert del_res.status_code == 200, del_res.text

    # Verify parent SO total dropped back to 90000
    so_check = client.get(f"/sales-orders/{so_id}", headers=headers).json()
    assert float(so_check["total_amount"]) == 90000.00

    # =========================================================================
    # STEP 3: SO STATUS CONFIRMATION & EDIT LOCKING
    # =========================================================================
    # Cannot create an invoice while SO is Draft
    inv_fail = client.post("/customer-invoices/", json={
        "sales_order_id": so_id,
        "invoice_number": f"INV-FAIL-{ts}",
        "invoice_date": "2026-09-06"
    }, headers=headers)
    assert inv_fail.status_code == 400

    # Confirm the SO
    confirm_res = client.patch(f"/sales-orders/{so_id}/status", json={"status": "Confirmed"}, headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "Confirmed"

    # Verify items cannot be modified after confirmation
    locked_res = client.post(f"/sales-order-items/by-so/{so_id}", json=add_item_payload, headers=headers)
    assert locked_res.status_code == 400
    assert "Draft" in locked_res.json()["detail"]

    # =========================================================================
    # STEP 4: CUSTOMER INVOICE (Creation & Posting)
    # =========================================================================
    inv_number = f"INV-TEST-{ts}"
    inv_payload = {
        "sales_order_id": so_id,
        "invoice_number": inv_number,
        "invoice_date": "2026-09-06",
        "due_date": "2026-09-20"
    }
    inv_res = client.post("/customer-invoices/", json=inv_payload, headers=headers)
    assert inv_res.status_code == 201, inv_res.text
    inv_data = inv_res.json()
    invoice_id = inv_data["id"]
    assert inv_data["invoice_number"] == inv_number
    assert inv_data["status"] == "Draft"
    assert float(inv_data["total_amount"]) == 90000.00

    # Duplicate invoice check (1-to-1 SO constraint)
    dup_res = client.post("/customer-invoices/", json={
        "sales_order_id": so_id,
        "invoice_number": f"INV-DUP-{ts}",
        "invoice_date": "2026-09-06"
    }, headers=headers)
    assert dup_res.status_code == 400

    # Cannot pay Draft invoice
    pay_fail = client.post("/payments/", json={
        "customer_invoice_id": invoice_id,
        "payment_type": "Receive",
        "payment_method": "UPI",
        "payment_date": "2026-09-06",
        "amount": 90000.00
    }, headers=headers)
    assert pay_fail.status_code == 400

    # Post the invoice
    post_res = client.patch(f"/customer-invoices/{invoice_id}", json={"status": "Posted"}, headers=headers)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "Posted"

    # =========================================================================
    # STEP 5: PAYMENT RECEIPT (Settlement & Status Reversal)
    # =========================================================================
    payment_payload = {
        "customer_invoice_id": invoice_id,
        "payment_type": "Receive",
        "payment_method": "Bank Transfer",
        "payment_date": "2026-09-06",
        "amount": 90000.00,
        "note": "Payment received via ICICI NEFT from client"
    }
    pay_res = client.post("/payments/", json=payment_payload, headers=headers)
    assert pay_res.status_code == 201, pay_res.text
    pay_data = pay_res.json()
    payment_id = pay_data["id"]
    assert float(pay_data["amount"]) == 90000.00
    assert pay_data["payment_type"] == "Receive"

    # Verify invoice status automatically transitioned to Paid
    inv_check = client.get(f"/customer-invoices/{invoice_id}", headers=headers).json()
    assert inv_check["status"] == "Paid"

    # Verify payment listing by invoice
    by_inv_res = client.get(f"/payments/by-invoice/{invoice_id}", headers=headers)
    assert by_inv_res.status_code == 200
    assert len(by_inv_res.json()) >= 1

    # Verify deleting payment reverts invoice status to Posted
    del_pay_res = client.delete(f"/payments/{payment_id}", headers=headers)
    assert del_pay_res.status_code == 200
    inv_reverted = client.get(f"/customer-invoices/{invoice_id}", headers=headers).json()
    assert inv_reverted["status"] == "Posted"
