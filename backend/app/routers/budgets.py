from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.services.budget_service import (
    create_budget,
    get_all_budgets,
    get_budget_by_id,
    get_budgets_by_analytic,
    update_budget,
    delete_budget
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"]
)


@router.get("/", response_model=List[BudgetResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_budgets(db=db)


# IMPORTANT: This route MUST come before /{budget_id}.
# If /{budget_id} came first, FastAPI would try to parse
# "by-analytic" as an integer → 422 error.
@router.get("/by-analytic/{analytic_account_id}", response_model=List[BudgetResponse])
def get_by_analytic(
    analytic_account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_budgets_by_analytic(analytic_account_id=analytic_account_id, db=db)


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_one(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_budget_by_id(budget_id=budget_id, db=db)


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_budget(data=data, db=db)


@router.put("/{budget_id}", response_model=BudgetResponse)
def update(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_budget(budget_id=budget_id, data=data, db=db)


@router.delete("/{budget_id}", status_code=status.HTTP_200_OK)
def delete(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_budget(budget_id=budget_id, db=db)
