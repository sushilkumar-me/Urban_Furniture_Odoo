import pytest
from datetime import date
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
        login_id = "REPORT_ADMIN"
        user = db.query(User).filter(User.login_id == login_id).first()
        if not user:
            user = User(
                name="Report Test Admin",
                login_id=login_id,
                email="report_admin@example.com",
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


def test_profit_and_loss_report(auth_header):
    headers = {"Authorization": auth_header["Authorization"]}

    # Request Profit & Loss without dates (all-time)
    r = client.get("/reports/profit-and-loss", headers=headers)
    assert r.status_code == 200, r.text
    pnl = r.json()

    assert "income" in pnl
    assert "expenses" in pnl
    assert "gross_profit" in pnl
    assert "net_profit" in pnl
    assert "net_margin_percentage" in pnl

    total_income = Decimal(str(pnl["income"]["total"]))
    total_expenses = Decimal(str(pnl["expenses"]["total"]))
    net_profit = Decimal(str(pnl["net_profit"]))

    # Verify arithmetic: Net Profit = Total Income - Total Expenses
    assert net_profit == total_income - total_expenses

    # Request with date filters
    today = date.today().isoformat()
    r_filtered = client.get(f"/reports/profit-and-loss?start_date=2026-01-01&end_date={today}", headers=headers)
    assert r_filtered.status_code == 200


def test_balance_sheet_report(auth_header):
    headers = {"Authorization": auth_header["Authorization"]}

    # Request Balance Sheet
    r = client.get("/reports/balance-sheet", headers=headers)
    assert r.status_code == 200, r.text
    bs = r.json()

    assert "assets" in bs
    assert "liabilities" in bs
    assert "equity" in bs
    assert "total_assets" in bs
    assert "total_liabilities" in bs
    assert "total_equity" in bs
    assert "total_liabilities_and_equity" in bs
    assert "is_balanced" in bs
    assert "difference" in bs

    total_assets = Decimal(str(bs["total_assets"]))
    total_liab = Decimal(str(bs["total_liabilities"]))
    total_equity = Decimal(str(bs["total_equity"]))
    total_liab_eq = Decimal(str(bs["total_liabilities_and_equity"]))

    # Verify arithmetic: Liabilities & Equity = Total Liabilities + Total Equity
    assert total_liab_eq == total_liab + total_equity

    # Verify Balance Sheet equation: Assets = Liabilities + Equity (within floating point precision)
    diff = Decimal(str(bs["difference"]))
    assert abs(diff) < Decimal("0.05")
    assert bs["is_balanced"] is True


def test_budget_report(auth_header):
    headers = {"Authorization": auth_header["Authorization"]}

    # Request Budget vs Actual Report
    r = client.get("/reports/budget-report", headers=headers)
    assert r.status_code == 200, r.text
    rep = r.json()

    assert "items" in rep
    assert "total_planned" in rep
    assert "total_actual" in rep
    assert "total_variance" in rep
    assert "overall_utilization_percentage" in rep

    total_planned = Decimal(str(rep["total_planned"]))
    total_actual = Decimal(str(rep["total_actual"]))
    total_var = Decimal(str(rep["total_variance"]))

    # Verify overall variance: Total Variance = Total Planned - Total Actual
    assert total_var == total_planned - total_actual

    # Verify individual item calculations
    for item in rep["items"]:
        planned = Decimal(str(item["planned_amount"]))
        actual = Decimal(str(item["actual_amount"]))
        var = Decimal(str(item["variance"]))
        assert var == planned - actual
        assert item["status"] in ["Under Budget", "Near Limit", "Over Budget"]
