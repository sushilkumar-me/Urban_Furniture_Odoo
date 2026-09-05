from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.journal import JournalCreate, JournalUpdate, JournalResponse
from app.services.journal_service import (
    create_journal,
    get_all_journals,
    get_journal_by_id,
    update_journal,
    delete_journal
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/journals",
    tags=["Journals"]
)


@router.get("/", response_model=List[JournalResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_journals(db=db)


@router.get("/{journal_id}", response_model=JournalResponse)
def get_one(
    journal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_journal_by_id(journal_id=journal_id, db=db)


@router.post("/", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: JournalCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_journal(data=data, db=db)


@router.put("/{journal_id}", response_model=JournalResponse)
def update(
    journal_id: int,
    data: JournalUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_journal(journal_id=journal_id, data=data, db=db)


@router.delete("/{journal_id}", status_code=status.HTTP_200_OK)
def delete(
    journal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_journal(journal_id=journal_id, db=db)
