from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.budget import Budget
from app.models.analytic_account import AnalyticAccount
from app.schemas.budget import BudgetCreate, BudgetUpdate


def create_budget(data: BudgetCreate, db: Session) -> Budget:

    # Validate the analytic account exists
    if not db.query(AnalyticAccount).filter(AnalyticAccount.id == data.analytic_account_id).first():
        raise HTTPException(
            status_code=400,
            detail=f"Analytic account with id {data.analytic_account_id} does not exist."
        )

    # Validate end_date is after start_date.
    # A budget where end comes before start is invalid.
    # Example of bad input: start=2026-12-01, end=2026-01-01
    if data.end_date <= data.start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be after start_date."
        )

    new_budget = Budget(**data.model_dump())
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget


def get_all_budgets(db: Session) -> list:
    # Order by start_date descending → most recent budgets appear first
    return db.query(Budget).order_by(Budget.start_date.desc()).all()


def get_budgets_by_analytic(analytic_account_id: int, db: Session) -> list:
    # Filter budgets for one specific analytic account.
    # Useful for viewing all budgets of "Sofa Department" for example.
    return db.query(Budget).filter(
        Budget.analytic_account_id == analytic_account_id
    ).order_by(Budget.start_date.desc()).all()


def get_budget_by_id(budget_id: int, db: Session) -> Budget:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=404,
            detail=f"Budget with id {budget_id} not found."
        )
    return budget


def update_budget(budget_id: int, data: BudgetUpdate, db: Session) -> Budget:
    budget = get_budget_by_id(budget_id, db)
    update_data = data.model_dump(exclude_unset=True)

    # If changing the analytic account, verify the new one exists
    if "analytic_account_id" in update_data:
        if not db.query(AnalyticAccount).filter(
            AnalyticAccount.id == update_data["analytic_account_id"]
        ).first():
            raise HTTPException(
                status_code=400,
                detail=f"Analytic account with id {update_data['analytic_account_id']} does not exist."
            )

    # If both dates are being changed, validate the new range
    # We need to check the UPDATED values, not the current stored values
    new_start = update_data.get("start_date", budget.start_date)
    new_end   = update_data.get("end_date",   budget.end_date)
    if new_end <= new_start:
        raise HTTPException(
            status_code=400,
            detail="end_date must be after start_date."
        )

    for key, value in update_data.items():
        setattr(budget, key, value)

    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(budget_id: int, db: Session) -> dict:
    budget = get_budget_by_id(budget_id, db)
    db.delete(budget)
    db.commit()
    return {"message": f"Budget '{budget.budget_name}' deleted successfully."}
