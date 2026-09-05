from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.models.journal_entry import JournalEntry
from app.models.journal_entry_item import JournalEntryItem
from app.models.journal import Journal
from app.models.account import Account
from app.models.contact import Contact
from app.schemas.journal_entry import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryResponse,
    JournalEntryItemCreate,
    JournalEntryItemUpdate,
    JournalEntryItemResponse
)


def _compute_entry_totals(entry: JournalEntry) -> dict:
    """Helper to compute debit, credit sums and balanced status."""
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    for item in entry.items:
        if item.debit:
            total_debit += Decimal(str(item.debit))
        if item.credit:
            total_credit += Decimal(str(item.credit))

    is_balanced = (total_debit == total_credit) and (total_debit > 0)
    return {
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": is_balanced
    }


def _build_entry_response(entry: JournalEntry) -> JournalEntryResponse:
    totals = _compute_entry_totals(entry)
    resp = JournalEntryResponse.model_validate(entry)
    resp.total_debit = totals["total_debit"]
    resp.total_credit = totals["total_credit"]
    resp.is_balanced = totals["is_balanced"]
    return resp


def generate_entry_number(db: Session) -> str:
    """Generates next sequential entry number, e.g. JE/2026/0001"""
    current_year = datetime.now().year
    prefix = f"JE/{current_year}/"

    latest = db.query(JournalEntry).filter(
        JournalEntry.entry_number.like(f"{prefix}%")
    ).order_by(JournalEntry.id.desc()).first()

    if latest and latest.entry_number:
        try:
            last_seq = int(latest.entry_number.split("/")[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1

    return f"{prefix}{new_seq:04d}"


def create_journal_entry(data: JournalEntryCreate, user_id: int, db: Session) -> JournalEntryResponse:
    # 1. Validate Journal exists
    journal = db.query(Journal).filter(Journal.id == data.journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail=f"Journal with id {data.journal_id} not found.")

    # 2. Generate entry number
    entry_number = generate_entry_number(db)

    # 3. Create entry in Draft status
    entry = JournalEntry(
        journal_id=data.journal_id,
        created_by=user_id,
        entry_number=entry_number,
        entry_date=data.entry_date,
        reference=data.reference,
        status="Draft"
    )
    db.add(entry)
    db.flush()

    # 4. Insert items if provided
    if data.items:
        for item_in in data.items:
            # Validate account exists
            account = db.query(Account).filter(Account.id == item_in.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account with id {item_in.account_id} does not exist.")

            # Validate partner if provided
            if item_in.partner_id:
                partner = db.query(Contact).filter(Contact.id == item_in.partner_id).first()
                if not partner:
                    raise HTTPException(status_code=400, detail=f"Partner/Contact with id {item_in.partner_id} does not exist.")

            item = JournalEntryItem(
                journal_entry_id=entry.id,
                account_id=item_in.account_id,
                partner_id=item_in.partner_id,
                debit=item_in.debit,
                credit=item_in.credit,
                description=item_in.description
            )
            db.add(item)

    db.commit()
    db.refresh(entry)
    return _build_entry_response(entry)


def get_all_journal_entries(
    db: Session,
    journal_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[JournalEntryResponse]:
    query = db.query(JournalEntry)
    if journal_id:
        query = query.filter(JournalEntry.journal_id == journal_id)
    if status:
        query = query.filter(JournalEntry.status == status)

    entries = query.order_by(JournalEntry.created_at.desc(), JournalEntry.id.desc()).all()
    return [_build_entry_response(e) for e in entries]


def get_journal_entry_by_id(entry_id: int, db: Session) -> JournalEntryResponse:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Journal entry with id {entry_id} not found.")
    return _build_entry_response(entry)


def update_journal_entry(entry_id: int, data: JournalEntryUpdate, db: Session) -> JournalEntryResponse:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Journal entry with id {entry_id} not found.")

    if entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Cannot edit a Posted journal entry.")

    if data.journal_id is not None:
        journal = db.query(Journal).filter(Journal.id == data.journal_id).first()
        if not journal:
            raise HTTPException(status_code=404, detail=f"Journal with id {data.journal_id} not found.")
        entry.journal_id = data.journal_id

    if data.entry_date is not None:
        entry.entry_date = data.entry_date

    if data.reference is not None:
        entry.reference = data.reference

    db.commit()
    db.refresh(entry)
    return _build_entry_response(entry)


def post_journal_entry(entry_id: int, db: Session) -> JournalEntryResponse:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Journal entry with id {entry_id} not found.")

    if entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Journal entry is already Posted.")

    if len(entry.items) < 2:
        raise HTTPException(
            status_code=400,
            detail="A journal entry must contain at least 2 line items to be posted."
        )

    totals = _compute_entry_totals(entry)
    total_debit = totals["total_debit"]
    total_credit = totals["total_credit"]

    if total_debit == Decimal("0.00") and total_credit == Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Cannot post an entry with zero amounts.")

    if total_debit != total_credit:
        diff = abs(total_debit - total_credit)
        raise HTTPException(
            status_code=400,
            detail=f"Double Entry Error: Total Debits (₹{total_debit}) must equal Total Credits (₹{total_credit}). Difference: ₹{diff}."
        )

    entry.status = "Posted"
    db.commit()
    db.refresh(entry)
    return _build_entry_response(entry)


def delete_journal_entry(entry_id: int, db: Session) -> dict:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Journal entry with id {entry_id} not found.")

    if entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Cannot delete a Posted journal entry.")

    db.delete(entry)
    db.commit()
    return {"message": f"Journal entry {entry.entry_number} deleted successfully."}


# ---- ITEM OPERATIONS ---------------------------------------

def add_journal_entry_item(entry_id: int, data: JournalEntryItemCreate, db: Session) -> JournalEntryItemResponse:
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Journal entry with id {entry_id} not found.")

    if entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Cannot add line items to a Posted journal entry.")

    account = db.query(Account).filter(Account.id == data.account_id).first()
    if not account:
        raise HTTPException(status_code=400, detail=f"Account with id {data.account_id} does not exist.")

    if data.partner_id:
        partner = db.query(Contact).filter(Contact.id == data.partner_id).first()
        if not partner:
            raise HTTPException(status_code=400, detail=f"Partner with id {data.partner_id} does not exist.")

    item = JournalEntryItem(
        journal_entry_id=entry.id,
        account_id=data.account_id,
        partner_id=data.partner_id,
        debit=data.debit,
        credit=data.credit,
        description=data.description
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return JournalEntryItemResponse.model_validate(item)


def update_journal_entry_item(item_id: int, data: JournalEntryItemUpdate, db: Session) -> JournalEntryItemResponse:
    item = db.query(JournalEntryItem).filter(JournalEntryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Journal entry item with id {item_id} not found.")

    if item.journal_entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Cannot edit items in a Posted journal entry.")

    if data.account_id is not None:
        account = db.query(Account).filter(Account.id == data.account_id).first()
        if not account:
            raise HTTPException(status_code=400, detail=f"Account with id {data.account_id} does not exist.")
        item.account_id = data.account_id

    if data.partner_id is not None:
        if data.partner_id != 0:
            partner = db.query(Contact).filter(Contact.id == data.partner_id).first()
            if not partner:
                raise HTTPException(status_code=400, detail=f"Partner with id {data.partner_id} does not exist.")
            item.partner_id = data.partner_id
        else:
            item.partner_id = None

    if data.debit is not None:
        item.debit = data.debit
    if data.credit is not None:
        item.credit = data.credit
    if data.description is not None:
        item.description = data.description

    db.commit()
    db.refresh(item)
    return JournalEntryItemResponse.model_validate(item)


def delete_journal_entry_item(item_id: int, db: Session) -> dict:
    item = db.query(JournalEntryItem).filter(JournalEntryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Journal entry item with id {item_id} not found.")

    if item.journal_entry.status == "Posted":
        raise HTTPException(status_code=400, detail="Cannot delete items from a Posted journal entry.")

    db.delete(item)
    db.commit()
    return {"message": "Journal entry item deleted successfully."}
