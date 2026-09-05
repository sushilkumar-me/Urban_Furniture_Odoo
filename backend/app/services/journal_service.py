from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.journal import Journal
from app.models.account import Account
from app.schemas.journal import JournalCreate, JournalUpdate

ALLOWED_TYPES = {"Sale", "Sales", "Purchase", "Bank", "Cash", "General"}


def create_journal(data: JournalCreate, db: Session) -> Journal:

    if data.journal_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"journal_type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    if not db.query(Account).filter(Account.id == data.default_account_id).first():
        raise HTTPException(
            status_code=400,
            detail=f"Account with id {data.default_account_id} does not exist."
        )

    new_journal = Journal(**data.model_dump())
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    return new_journal


def get_all_journals(db: Session) -> list:
    return db.query(Journal).order_by(Journal.journal_type.asc(), Journal.journal_name.asc()).all()


def get_journal_by_id(journal_id: int, db: Session) -> Journal:
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise HTTPException(
            status_code=404,
            detail=f"Journal with id {journal_id} not found."
        )
    return journal


def update_journal(journal_id: int, data: JournalUpdate, db: Session) -> Journal:
    journal = get_journal_by_id(journal_id, db)
    update_data = data.model_dump(exclude_unset=True)

    if "journal_type" in update_data and update_data["journal_type"] not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"journal_type must be one of: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    if "default_account_id" in update_data:
        if not db.query(Account).filter(Account.id == update_data["default_account_id"]).first():
            raise HTTPException(
                status_code=400,
                detail=f"Account with id {update_data['default_account_id']} does not exist."
            )

    for key, value in update_data.items():
        setattr(journal, key, value)

    db.commit()
    db.refresh(journal)
    return journal


def delete_journal(journal_id: int, db: Session) -> dict:
    journal = get_journal_by_id(journal_id, db)
    try:
        db.delete(journal)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete '{journal.journal_name}'. "
                   f"It has journal entries linked to it. Remove those entries first."
        )
    return {"message": f"Journal '{journal.journal_name}' deleted successfully."}
