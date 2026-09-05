from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services.account_service import (
    create_account,
    get_all_accounts,
    get_account_by_id,
    get_accounts_by_type,
    update_account,
    delete_account
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/accounts",
    tags=["Chart of Accounts"]
)


@router.get("/", response_model=List[AccountResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_accounts(db=db)


@router.get("/by-type/{account_type}", response_model=List[AccountResponse])
def get_by_type(
    account_type: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_accounts_by_type(account_type=account_type, db=db)


@router.get("/{account_id}", response_model=AccountResponse)
def get_one(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_account_by_id(account_id=account_id, db=db)


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_account(data=data, db=db)


@router.put("/{account_id}", response_model=AccountResponse)
def update(
    account_id: int,
    data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_account(account_id=account_id, data=data, db=db)


@router.delete("/{account_id}", status_code=status.HTTP_200_OK)
def delete(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_account(account_id=account_id, db=db)
