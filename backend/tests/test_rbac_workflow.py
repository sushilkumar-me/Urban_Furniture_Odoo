import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.contact import Contact
from app.services.auth_service import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def rbac_users():
    """Ensure 4 distinct role users exist with appropriate contacts for scoped RBAC testing."""
    db = SessionLocal()
    try:
        # 1. Customer Contact
        cust_contact = db.query(Contact).filter(Contact.email == "test_customer@urbanfurniture.com").first()
        if not cust_contact:
            cust_contact = Contact(
                name="Test Customer Sarah",
                email="test_customer@urbanfurniture.com",
                phone="9876543210",
                contact_type="Customer"
            )
            db.add(cust_contact)
            db.commit()

        # 2. Vendor Contact
        vend_contact = db.query(Contact).filter(Contact.email == "test_vendor@timbercraft.com").first()
        if not vend_contact:
            vend_contact = Contact(
                name="Test Vendor Timber Craft",
                email="test_vendor@timbercraft.com",
                phone="9123456780",
                contact_type="Vendor"
            )
            db.add(vend_contact)
            db.commit()

        # 3. Create Users
        accounts = {
            "Admin": {
                "name": "RBAC Test Admin",
                "login_id": "TEST_ADM",
                "email": "test_admin@urbanfurniture.com",
                "role": "Admin"
            },
            "Accountant": {
                "name": "RBAC Test Accountant",
                "login_id": "TEST_ACC",
                "email": "test_accountant@urbanfurniture.com",
                "role": "Accountant"
            },
            "Customer": {
                "name": "RBAC Test Customer",
                "login_id": "TEST_CUST",
                "email": "test_customer@urbanfurniture.com",
                "role": "Customer"
            },
            "Vendor": {
                "name": "RBAC Test Vendor",
                "login_id": "TEST_VEND",
                "email": "test_vendor@timbercraft.com",
                "role": "Vendor"
            }
        }

        tokens = {}
        for role, data in accounts.items():
            user = db.query(User).filter(User.login_id == data["login_id"]).first()
            if not user:
                user = User(
                    name=data["name"],
                    login_id=data["login_id"],
                    email=data["email"],
                    password_hash=hash_password("password123"),
                    role=data["role"],
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            token = create_access_token(data={
                "sub": user.login_id,
                "id": user.id,
                "role": user.role,
                "email": user.email,
                "name": user.name
            })
            tokens[role] = {"Authorization": f"Bearer {token}", "email": user.email, "id": user.id}

        return tokens
    finally:
        db.close()


# ==============================================================================
# 1. ADMIN ROLE TESTS
# ==============================================================================

def test_admin_access_full_dashboard(rbac_users):
    """Admin has full access to Executive Dashboard summary."""
    headers = {"Authorization": rbac_users["Admin"]["Authorization"]}
    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "kpis" in data
    assert "chart_data" in data


def test_admin_can_register_user(rbac_users):
    """Admin is permitted to provision new users."""
    headers = {"Authorization": rbac_users["Admin"]["Authorization"]}
    unique_id = f"REG_{id(rbac_users) % 10000}"
    payload = {
        "name": "Provisioned By Admin",
        "login_id": unique_id,
        "email": f"{unique_id.lower()}@urbanfurniture.com",
        "password": "password123",
        "role": "Accountant"
    }
    response = client.post("/auth/register", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    assert response.json()["login_id"] == unique_id


# ==============================================================================
# 2. ACCOUNTANT ROLE TESTS
# ==============================================================================

def test_accountant_access_dashboard(rbac_users):
    """Accountant can view financial dashboard and reports."""
    headers = {"Authorization": rbac_users["Accountant"]["Authorization"]}
    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 200, response.text


def test_accountant_forbidden_from_user_registration(rbac_users):
    """Accountant MUST NOT be able to provision users (Admin only)."""
    headers = {"Authorization": rbac_users["Accountant"]["Authorization"]}
    payload = {
        "name": "Illegal User",
        "login_id": "ILLEGAL_01",
        "email": "illegal@urbanfurniture.com",
        "password": "password123",
        "role": "Accountant"
    }
    response = client.post("/auth/register", json=payload, headers=headers)
    assert response.status_code == 403, f"Expected 403 but got {response.status_code}: {response.text}"
    assert "Admin role required" in response.json()["detail"]


# ==============================================================================
# 3. CUSTOMER ROLE TESTS
# ==============================================================================

def test_customer_forbidden_from_admin_dashboard(rbac_users):
    """Customer cannot access executive financial dashboard."""
    headers = {"Authorization": rbac_users["Customer"]["Authorization"]}
    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 403, response.text


def test_customer_access_customer_summary(rbac_users):
    """Customer can access their own portal summary."""
    headers = {"Authorization": rbac_users["Customer"]["Authorization"]}
    response = client.get("/dashboard/customer-summary", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "total_invoiced" in data
    assert "total_paid" in data
    assert "outstanding_due" in data


def test_customer_cannot_view_vendor_bills(rbac_users):
    """Customer cannot see internal vendor bills (403)."""
    headers = {"Authorization": rbac_users["Customer"]["Authorization"]}
    response = client.get("/vendor-bills/", headers=headers)
    assert response.status_code == 403, response.text


def test_customer_can_view_own_invoices(rbac_users):
    """Customer can query /customer-invoices/ and gets only invoices for their email."""
    headers = {"Authorization": rbac_users["Customer"]["Authorization"]}
    response = client.get("/customer-invoices/", headers=headers)
    assert response.status_code == 200, response.text
    invoices = response.json()
    for inv in invoices:
        cust_email = inv.get("sales_order", {}).get("customer", {}).get("email")
        if cust_email:
            assert cust_email.lower() == rbac_users["Customer"]["email"].lower()


def test_customer_update_profile(rbac_users):
    """Customer can update their own profile."""
    headers = {"Authorization": rbac_users["Customer"]["Authorization"]}
    response = client.put("/auth/profile", json={"name": "Sarah Customer Updated"}, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Sarah Customer Updated"


# ==============================================================================
# 4. VENDOR ROLE TESTS
# ==============================================================================

def test_vendor_forbidden_from_admin_dashboard(rbac_users):
    """Vendor cannot access executive financial dashboard."""
    headers = {"Authorization": rbac_users["Vendor"]["Authorization"]}
    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 403, response.text


def test_vendor_access_vendor_summary(rbac_users):
    """Vendor can access their supplier portal summary."""
    headers = {"Authorization": rbac_users["Vendor"]["Authorization"]}
    response = client.get("/dashboard/vendor-summary", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "total_billed" in data
    assert "total_received" in data
    assert "pending_balance" in data


def test_vendor_cannot_view_customer_invoices(rbac_users):
    """Vendor cannot see customer invoices (403)."""
    headers = {"Authorization": rbac_users["Vendor"]["Authorization"]}
    response = client.get("/customer-invoices/", headers=headers)
    assert response.status_code == 403, response.text


def test_vendor_can_view_own_bills(rbac_users):
    """Vendor can query /vendor-bills/ and gets only bills for their vendor contact."""
    headers = {"Authorization": rbac_users["Vendor"]["Authorization"]}
    response = client.get("/vendor-bills/", headers=headers)
    assert response.status_code == 200, response.text
    bills = response.json()
    for bill in bills:
        vend_email = bill.get("purchase_order", {}).get("vendor", {}).get("email")
        if vend_email:
            assert vend_email.lower() == rbac_users["Vendor"]["email"].lower()


def test_vendor_update_profile(rbac_users):
    """Vendor can update their own profile."""
    headers = {"Authorization": rbac_users["Vendor"]["Authorization"]}
    response = client.put("/auth/profile", json={"name": "Timber Supplies Rep"}, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Timber Supplies Rep"
