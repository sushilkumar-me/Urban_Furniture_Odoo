import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.account import Account
from app.models.journal import Journal
from app.models.contact import Contact
from app.services.auth_service import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    db = SessionLocal()
    try:
        admin_login = "JE_ADMIN"
        user = db.query(User).filter(User.login_id == admin_login).first()
        if not user:
            user = User(
                name="JE Test Admin",
                login_id=admin_login,
                email="je_admin@example.com",
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
def setup_accounting_data(auth_header):
    db = SessionLocal()
    try:
        # Accounts
        bank = db.query(Account).filter(Account.account_name == "HDFC Bank Account").first()
        if not bank:
            bank = Account(account_name="HDFC Bank Account", account_type="Asset")
            db.add(bank)

        exp = db.query(Account).filter(Account.account_name == "Office Furniture Expense").first()
        if not exp:
            exp = Account(account_name="Office Furniture Expense", account_type="Expense")
            db.add(exp)

        rev = db.query(Account).filter(Account.account_name == "Furniture Sales Revenue").first()
        if not rev:
            rev = Account(account_name="Furniture Sales Revenue", account_type="Revenue")
            db.add(rev)

        db.commit()
        db.refresh(bank)
        db.refresh(exp)
        db.refresh(rev)

        # Journal
        gen_journal = db.query(Journal).filter(Journal.journal_name == "General Operations").first()
        if not gen_journal:
            gen_journal = Journal(
                journal_name="General Operations",
                journal_type="General",
                default_account_id=bank.id
            )
            db.add(gen_journal)
            db.commit()
            db.refresh(gen_journal)

        # Partner
        partner = db.query(Contact).filter(Contact.name == "Global Wood Supplier").first()
        if not partner:
            partner = Contact(contact_type="Vendor", name="Global Wood Supplier", email="wood@supplier.com")
            db.add(partner)
            db.commit()
            db.refresh(partner)

        return {
            "bank_id": bank.id,
            "expense_id": exp.id,
            "revenue_id": rev.id,
            "journal_id": gen_journal.id,
            "partner_id": partner.id
        }
    finally:
        db.close()


def test_complete_journal_entry_workflow(auth_header, setup_accounting_data):
    headers = {"Authorization": auth_header["Authorization"]}
    data = setup_accounting_data

    # 1. Create a Draft Journal Entry
    today = date.today().isoformat()
    entry_payload = {
        "journal_id": data["journal_id"],
        "entry_date": today,
        "reference": "Monthly Office Supplies Adjustment",
        "items": []
    }
    r = client.post("/journal-entries/", json=entry_payload, headers=headers)
    assert r.status_code == 201, r.text
    entry = r.json()
    entry_id = entry["id"]
    assert entry["status"] == "Draft"
    assert entry["entry_number"].startswith("JE/")
    assert entry["total_debit"] == "0.00"
    assert entry["total_credit"] == "0.00"
    assert entry["is_balanced"] is False

    # 2. Test constraint: adding line with both debit and credit should fail
    invalid_item = {
        "account_id": data["expense_id"],
        "debit": 1500.0,
        "credit": 1500.0,
        "description": "Invalid both sides"
    }
    r_bad = client.post(f"/journal-entries/{entry_id}/items", json=invalid_item, headers=headers)
    assert r_bad.status_code in [400, 422]

    # 3. Test constraint: adding line with neither debit nor credit should fail
    zero_item = {
        "account_id": data["expense_id"],
        "debit": 0.0,
        "credit": 0.0,
        "description": "Zero amount"
    }
    r_zero = client.post(f"/journal-entries/{entry_id}/items", json=zero_item, headers=headers)
    assert r_zero.status_code in [400, 422]

    # 4. Add Debit line: Expense +₹5,000
    debit_item = {
        "account_id": data["expense_id"],
        "partner_id": data["partner_id"],
        "debit": 5000.0,
        "credit": 0.0,
        "description": "Office desks and chairs acquisition"
    }
    r_deb = client.post(f"/journal-entries/{entry_id}/items", json=debit_item, headers=headers)
    assert r_deb.status_code == 201, r_deb.text

    # 5. Add partial Credit line: Bank -₹3,000
    partial_credit = {
        "account_id": data["bank_id"],
        "debit": 0.0,
        "credit": 3000.0,
        "description": "Direct bank payment"
    }
    r_cred1 = client.post(f"/journal-entries/{entry_id}/items", json=partial_credit, headers=headers)
    assert r_cred1.status_code == 201, r_cred1.text

    # Check entry: Debit=5000, Credit=3000, Unbalanced
    r_check = client.get(f"/journal-entries/{entry_id}", headers=headers)
    assert r_check.status_code == 200
    assert r_check.json()["total_debit"] == "5000.00"
    assert r_check.json()["total_credit"] == "3000.00"
    assert r_check.json()["is_balanced"] is False

    # 6. Attempt to post unbalanced entry -> Must FAIL with 400
    r_post_unbalanced = client.post(f"/journal-entries/{entry_id}/post", headers=headers)
    assert r_post_unbalanced.status_code == 400
    assert "Total Debits" in r_post_unbalanced.json()["detail"]

    # 7. Add second Credit line to balance: Bank -₹2,000 (now total credits = 5000)
    second_credit = {
        "account_id": data["bank_id"],
        "debit": 0.0,
        "credit": 2000.0,
        "description": "Second bank payment instalment"
    }
    r_cred2 = client.post(f"/journal-entries/{entry_id}/items", json=second_credit, headers=headers)
    assert r_cred2.status_code == 201, r_cred2.text
    item2_id = r_cred2.json()["id"]

    # Check entry: Debit=5000, Credit=5000, Balanced!
    r_check2 = client.get(f"/journal-entries/{entry_id}", headers=headers)
    assert r_check2.status_code == 200
    assert r_check2.json()["total_debit"] == "5000.00"
    assert r_check2.json()["total_credit"] == "5000.00"
    assert r_check2.json()["is_balanced"] is True

    # 8. Post the balanced entry -> Success!
    r_post_success = client.post(f"/journal-entries/{entry_id}/post", headers=headers)
    assert r_post_success.status_code == 200
    posted_entry = r_post_success.json()
    assert posted_entry["status"] == "Posted"
    assert posted_entry["is_balanced"] is True

    # 9. Verify immutability of Posted entry:
    # Cannot modify header
    r_upd = client.put(f"/journal-entries/{entry_id}", json={"reference": "Changed"}, headers=headers)
    assert r_upd.status_code == 400

    # Cannot add item
    r_add_item = client.post(f"/journal-entries/{entry_id}/items", json=debit_item, headers=headers)
    assert r_add_item.status_code == 400

    # Cannot edit item
    r_edit_item = client.put(f"/journal-entries/items/{item2_id}", json={"credit": 2500.0}, headers=headers)
    assert r_edit_item.status_code == 400

    # Cannot delete item
    r_del_item = client.delete(f"/journal-entries/items/{item2_id}", headers=headers)
    assert r_del_item.status_code == 400

    # Cannot delete posted entry
    r_del_entry = client.delete(f"/journal-entries/{entry_id}", headers=headers)
    assert r_del_entry.status_code == 400


def test_atomic_journal_entry_creation_and_deletion(auth_header, setup_accounting_data):
    headers = {"Authorization": auth_header["Authorization"]}
    data = setup_accounting_data

    # Create entry with balanced lines directly
    payload = {
        "journal_id": data["journal_id"],
        "entry_date": date.today().isoformat(),
        "reference": "Atomic Balanced Entry",
        "items": [
            {
                "account_id": data["bank_id"],
                "debit": 1200.0,
                "credit": 0.0,
                "description": "Deposit received"
            },
            {
                "account_id": data["revenue_id"],
                "debit": 0.0,
                "credit": 1200.0,
                "description": "Sales revenue recognised"
            }
        ]
    }
    r = client.post("/journal-entries/", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    res = r.json()
    assert res["status"] == "Draft"
    assert len(res["items"]) == 2
    assert res["total_debit"] == "1200.00"
    assert res["total_credit"] == "1200.00"
    assert res["is_balanced"] is True

    # Delete draft entry
    r_del = client.delete(f"/journal-entries/{res['id']}", headers=headers)
    assert r_del.status_code == 200
