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
        admin_login = "TEST_ADMIN"
        user = db.query(User).filter(User.login_id == admin_login).first()
        if not user:
            user = User(
                name="Test Admin",
                login_id=admin_login,
                email="test_admin_purchase@example.com",
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
def setup_vendor_and_product(auth_header):
    """Ensure a test Vendor and a test Product exist in the DB."""
    db = SessionLocal()
    try:
        # 1. Vendor Contact
        vendor = db.query(Contact).filter(Contact.email == "vendor_procure@example.com").first()
        if not vendor:
            vendor = Contact(
                contact_type="Vendor",
                name="Prime Wood Supplies",
                email="vendor_procure@example.com",
                phone="9876543210",
                city="Mumbai",
                state="Maharashtra",
                country="India"
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)

        # 2. Category
        category = db.query(Category).filter(Category.category_name == "Raw Materials").first()
        if not category:
            category = Category(
                category_name="Raw Materials",
                description="Lumber and hardware for furniture"
            )
            db.add(category)
            db.commit()
            db.refresh(category)

        # 3. Products
        prod1 = db.query(Product).filter(Product.product_name == "Teak Wood Plank").first()
        if not prod1:
            prod1 = Product(
                category_id=category.id,
                product_name="Teak Wood Plank",
                product_type="Goods",
                sales_price=2500.00,
                cost_price=1500.00
            )
            db.add(prod1)

        prod2 = db.query(Product).filter(Product.product_name == "Steel Bracket Set").first()
        if not prod2:
            prod2 = Product(
                category_id=category.id,
                product_name="Steel Bracket Set",
                product_type="Goods",
                sales_price=500.00,
                cost_price=300.00
            )
            db.add(prod2)

        db.commit()
        db.refresh(prod1)
        db.refresh(prod2)

        return {
            "vendor_id": vendor.id,
            "product1_id": prod1.id,
            "product2_id": prod2.id,
        }
    finally:
        db.close()


def test_complete_purchase_workflow(auth_header, setup_vendor_and_product):
    headers = {"Authorization": auth_header["Authorization"]}
    user_id = auth_header["user_id"]
    vendor_id = setup_vendor_and_product["vendor_id"]
    p1_id = setup_vendor_and_product["product1_id"]
    p2_id = setup_vendor_and_product["product2_id"]

    ts = int(time.time())
    po_number = f"PO-TEST-{ts}"

    # =========================================================================
    # STEP 1: CREATE PURCHASE ORDER (Draft)
    # =========================================================================
    po_payload = {
        "vendor_id": vendor_id,
        "created_by": user_id,
        "po_number": po_number,
        "po_date": "2026-09-06",
        "items": [
            {
                "product_id": p1_id,
                "quantity": 10,
                "unit_price": 1500.00
            }
        ]
    }
    po_res = client.post("/purchase-orders/", json=po_payload, headers=headers)
    assert po_res.status_code == 201, po_res.text
    po_data = po_res.json()
    po_id = po_data["id"]
    assert po_data["po_number"] == po_number
    assert po_data["status"] == "Draft"
    assert float(po_data["total_amount"]) == 15000.00
    assert len(po_data["items"]) == 1

    # =========================================================================
    # STEP 2: PURCHASE ORDER ITEMS (CRUD & Recalculation)
    # =========================================================================
    # 2a. Fetch items for this PO
    items_res = client.get(f"/purchase-order-items/by-po/{po_id}", headers=headers)
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) == 1
    first_item_id = items[0]["id"]

    # 2b. Add a second item to the Draft PO
    add_item_payload = {
        "product_id": p2_id,
        "quantity": 5,
        "unit_price": 300.00
    }
    add_res = client.post(f"/purchase-order-items/by-po/{po_id}", json=add_item_payload, headers=headers)
    assert add_res.status_code == 201, add_res.text
    new_item = add_res.json()
    new_item_id = new_item["id"]
    assert float(new_item["total"]) == 1500.00

    # Verify parent PO total updated: 15000 + 1500 = 16500
    po_check = client.get(f"/purchase-orders/{po_id}", headers=headers).json()
    assert float(po_check["total_amount"]) == 16500.00

    # 2c. Update line item quantity: change second item qty from 5 to 10
    update_res = client.patch(
        f"/purchase-order-items/{new_item_id}",
        json={"quantity": 10},
        headers=headers
    )
    assert update_res.status_code == 200, update_res.text
    updated_item = update_res.json()
    assert updated_item["quantity"] == 10
    assert float(updated_item["total"]) == 3000.00

    # Verify parent PO total updated: 15000 + 3000 = 18000
    po_check = client.get(f"/purchase-orders/{po_id}", headers=headers).json()
    assert float(po_check["total_amount"]) == 18000.00

    # 2d. Delete second item
    del_res = client.delete(f"/purchase-order-items/{new_item_id}", headers=headers)
    assert del_res.status_code == 200, del_res.text

    # Verify parent PO total dropped back to 15000
    po_check = client.get(f"/purchase-orders/{po_id}", headers=headers).json()
    assert float(po_check["total_amount"]) == 15000.00

    # =========================================================================
    # STEP 3: PO STATUS CONFIRMATION & EDIT LOCKING
    # =========================================================================
    # Cannot create a bill while PO is Draft
    bill_fail = client.post("/vendor-bills/", json={
        "purchase_order_id": po_id,
        "bill_number": f"BILL-FAIL-{ts}",
        "bill_date": "2026-09-06"
    }, headers=headers)
    assert bill_fail.status_code == 400

    # Confirm the PO
    confirm_res = client.patch(f"/purchase-orders/{po_id}/status", json={"status": "Confirmed"}, headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "Confirmed"

    # Verify items cannot be modified after confirmation
    locked_res = client.post(f"/purchase-order-items/by-po/{po_id}", json=add_item_payload, headers=headers)
    assert locked_res.status_code == 400
    assert "Draft" in locked_res.json()["detail"]

    # =========================================================================
    # STEP 4: VENDOR BILL (Creation & Posting)
    # =========================================================================
    bill_number = f"BILL-INV-{ts}"
    bill_payload = {
        "purchase_order_id": po_id,
        "bill_number": bill_number,
        "bill_date": "2026-09-06",
        "due_date": "2026-09-20"
    }
    bill_res = client.post("/vendor-bills/", json=bill_payload, headers=headers)
    assert bill_res.status_code == 201, bill_res.text
    bill_data = bill_res.json()
    bill_id = bill_data["id"]
    assert bill_data["bill_number"] == bill_number
    assert bill_data["status"] == "Draft"
    assert float(bill_data["total_amount"]) == 15000.00

    # Duplicate bill check (1-to-1 PO constraint)
    dup_res = client.post("/vendor-bills/", json={
        "purchase_order_id": po_id,
        "bill_number": f"BILL-DUP-{ts}",
        "bill_date": "2026-09-06"
    }, headers=headers)
    assert dup_res.status_code == 400

    # Cannot pay Draft bill
    pay_fail = client.post("/payments/", json={
        "vendor_bill_id": bill_id,
        "payment_type": "Send",
        "payment_method": "Bank Transfer",
        "payment_date": "2026-09-06",
        "amount": 15000.00
    }, headers=headers)
    assert pay_fail.status_code == 400

    # Post the bill
    post_res = client.patch(f"/vendor-bills/{bill_id}", json={"status": "Posted"}, headers=headers)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "Posted"

    # =========================================================================
    # STEP 5: PAYMENT (Execution & Status Synchronization)
    # =========================================================================
    payment_payload = {
        "vendor_bill_id": bill_id,
        "payment_type": "Send",
        "payment_method": "Bank Transfer",
        "payment_date": "2026-09-06",
        "amount": 15000.00,
        "note": "Settled in full via HDFC transfer"
    }
    pay_res = client.post("/payments/", json=payment_payload, headers=headers)
    assert pay_res.status_code == 201, pay_res.text
    pay_data = pay_res.json()
    payment_id = pay_data["id"]
    assert float(pay_data["amount"]) == 15000.00

    # Verify bill status automatically transitioned to Paid
    bill_check = client.get(f"/vendor-bills/{bill_id}", headers=headers).json()
    assert bill_check["status"] == "Paid"

    # Verify payment listing by bill
    by_bill_res = client.get(f"/payments/by-bill/{bill_id}", headers=headers)
    assert by_bill_res.status_code == 200
    assert len(by_bill_res.json()) >= 1

    # Verify deleting payment reverts bill status to Posted
    del_pay_res = client.delete(f"/payments/{payment_id}", headers=headers)
    assert del_pay_res.status_code == 200
    bill_reverted = client.get(f"/vendor-bills/{bill_id}", headers=headers).json()
    assert bill_reverted["status"] == "Posted"
