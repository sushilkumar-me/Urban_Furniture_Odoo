import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    db = SessionLocal()
    try:
        login_id = "DASH_ADM"
        user = db.query(User).filter(User.login_id == login_id).first()
        if not user:
            user = User(
                name="Dashboard Admin",
                login_id=login_id,
                email="dash_admin@example.com",
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


def test_dashboard_summary_api(auth_header):
    headers = {"Authorization": auth_header["Authorization"]}

    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()

    # 1. KPIs validation
    assert "kpis" in data
    kpis = data["kpis"]
    assert "total_sales" in kpis
    assert "total_purchases" in kpis
    assert "net_profit" in kpis
    assert "accounts_receivable" in kpis
    assert "accounts_payable" in kpis
    assert "bank_balance" in kpis
    assert "open_sales_orders_count" in kpis
    assert "open_purchase_orders_count" in kpis
    assert "products_count" in kpis
    assert "contacts_count" in kpis

    # 2. Charts series validation
    assert "chart_data" in data
    assert isinstance(data["chart_data"], list)
    assert len(data["chart_data"]) > 0
    for bar in data["chart_data"]:
        assert "label" in bar
        assert "sales" in bar
        assert "purchases" in bar

    # 3. Department budget progress validation
    assert "budget_progress" in data
    assert isinstance(data["budget_progress"], list)

    # 4. Recent transactions validation
    assert "recent_transactions" in data
    assert isinstance(data["recent_transactions"], list)
    for txn in data["recent_transactions"]:
        assert "type" in txn
        assert "number" in txn
        assert "amount" in txn
        assert "status" in txn
