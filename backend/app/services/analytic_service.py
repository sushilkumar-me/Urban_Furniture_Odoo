from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.analytic_account import AnalyticAccount
from app.schemas.analytic_account import AnalyticAccountCreate, AnalyticAccountUpdate

ALLOWED_TYPES = {"Income", "Expense", "Expenses", "Project", "Department", "Product", "General"}


def create_analytic_account(data: AnalyticAccountCreate, db: Session) -> AnalyticAccount:

    if data.type and data.type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    new_account = AnalyticAccount(**data.model_dump())
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


def get_all_analytic_accounts(db: Session) -> list:
    return db.query(AnalyticAccount).order_by(
        AnalyticAccount.type.asc(),
        AnalyticAccount.analytic_name.asc()
    ).all()


def get_analytic_account_by_id(account_id: int, db: Session) -> AnalyticAccount:
    account = db.query(AnalyticAccount).filter(AnalyticAccount.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"Analytic account with id {account_id} not found."
        )
    return account


def update_analytic_account(account_id: int, data: AnalyticAccountUpdate, db: Session) -> AnalyticAccount:
    account = get_analytic_account_by_id(account_id, db)
    update_data = data.model_dump(exclude_unset=True)

    if "type" in update_data and update_data["type"] and update_data["type"] not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    for key, value in update_data.items():
        setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return account


def delete_analytic_account(account_id: int, db: Session) -> dict:
    account = get_analytic_account_by_id(account_id, db)
    try:
        db.delete(account)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete '{account.analytic_name}'. "
                   f"It is linked to budgets or order items. Remove those first."
        )
    return {"message": f"Analytic account '{account.analytic_name}' deleted successfully."}
