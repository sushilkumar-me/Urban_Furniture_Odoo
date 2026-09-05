from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.analytic_account import AnalyticAccountCreate, AnalyticAccountUpdate, AnalyticAccountResponse
from app.services.analytic_service import (
    create_analytic_account,
    get_all_analytic_accounts,
    get_analytic_account_by_id,
    update_analytic_account,
    delete_analytic_account
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/analytic-accounts",
    tags=["Analytic Accounts"]
)


@router.get("/", response_model=List[AnalyticAccountResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_analytic_accounts(db=db)


@router.get("/{account_id}", response_model=AnalyticAccountResponse)
def get_one(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_analytic_account_by_id(account_id=account_id, db=db)


@router.post("/", response_model=AnalyticAccountResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: AnalyticAccountCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_analytic_account(data=data, db=db)


@router.put("/{account_id}", response_model=AnalyticAccountResponse)
def update(
    account_id: int,
    data: AnalyticAccountUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_analytic_account(account_id=account_id, data=data, db=db)


@router.delete("/{account_id}", status_code=status.HTTP_200_OK)
def delete(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_analytic_account(account_id=account_id, db=db)
