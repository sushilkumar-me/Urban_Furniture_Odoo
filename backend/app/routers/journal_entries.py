from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.journal_entry import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryResponse,
    JournalEntryItemCreate,
    JournalEntryItemUpdate,
    JournalEntryItemResponse
)
from app.services.journal_entry_service import (
    create_journal_entry,
    get_all_journal_entries,
    get_journal_entry_by_id,
    update_journal_entry,
    post_journal_entry,
    delete_journal_entry,
    add_journal_entry_item,
    update_journal_entry_item,
    delete_journal_entry_item
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])


@router.get("/", response_model=List[JournalEntryResponse])
def get_all(
    journal_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_journal_entries(db=db, journal_id=journal_id, status=status)


@router.get("/{entry_id}", response_model=JournalEntryResponse)
def get_one(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_journal_entry_by_id(entry_id=entry_id, db=db)


@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    user_id = current_user.get("id", 1)
    return create_journal_entry(data=data, user_id=user_id, db=db)


@router.put("/{entry_id}", response_model=JournalEntryResponse)
def update(
    entry_id: int,
    data: JournalEntryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_journal_entry(entry_id=entry_id, data=data, db=db)


@router.post("/{entry_id}/post", response_model=JournalEntryResponse)
def post_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return post_journal_entry(entry_id=entry_id, db=db)


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
def delete(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_journal_entry(entry_id=entry_id, db=db)


# ---- ITEM ENDPOINTS ----------------------------------------

@router.post("/{entry_id}/items", response_model=JournalEntryItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    entry_id: int,
    data: JournalEntryItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return add_journal_entry_item(entry_id=entry_id, data=data, db=db)


@router.put("/items/{item_id}", response_model=JournalEntryItemResponse)
def update_item(
    item_id: int,
    data: JournalEntryItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_journal_entry_item(item_id=item_id, data=data, db=db)


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_journal_entry_item(item_id=item_id, db=db)
