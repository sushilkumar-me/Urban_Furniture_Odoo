from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate

ALLOWED_TYPES = {"Asset", "Liability", "Equity", "Income", "Expense"}


def create_account(data: AccountCreate, db: Session) -> Account:

    if data.account_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"account_type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    if db.query(Account).filter(Account.account_name == data.account_name).first():
        raise HTTPException(
            status_code=400,
            detail=f"Account '{data.account_name}' already exists."
        )

    new_account = Account(**data.model_dump())
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


def get_all_accounts(db: Session) -> list:
    return db.query(Account).order_by(
        Account.account_type.asc(),
        Account.account_name.asc()
    ).all()


def get_accounts_by_type(account_type: str, db: Session) -> list:
    if account_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"account_type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )
    return db.query(Account).filter(
        Account.account_type == account_type
    ).order_by(Account.account_name.asc()).all()


def get_account_by_id(account_id: int, db: Session) -> Account:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"Account with id {account_id} not found."
        )
    return account


def update_account(account_id: int, data: AccountUpdate, db: Session) -> Account:
    account = get_account_by_id(account_id, db)
    update_data = data.model_dump(exclude_unset=True)

    if "account_type" in update_data and update_data["account_type"] not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"account_type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    if "account_name" in update_data:
        existing = db.query(Account).filter(
            Account.account_name == update_data["account_name"],
            Account.id != account_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Account '{update_data['account_name']}' already exists."
            )

    for key, value in update_data.items():
        setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return account


def delete_account(account_id: int, db: Session) -> dict:
    account = get_account_by_id(account_id, db)
    try:
        db.delete(account)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete '{account.account_name}'. "
                   f"It is used in journal entries. Remove those entries first."
        )
    return {"message": f"Account '{account.account_name}' deleted successfully."}
