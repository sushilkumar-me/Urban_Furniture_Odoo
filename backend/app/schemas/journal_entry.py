from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

from app.schemas.account import AccountResponse
from app.schemas.journal import JournalResponse
from app.schemas.contact import ContactResponse
from app.schemas.user import UserResponse


# ---- ITEM SCHEMAS ------------------------------------------

class JournalEntryItemBase(BaseModel):
    account_id:  int
    partner_id:  Optional[int] = None
    debit:       float = 0.0
    credit:      float = 0.0
    description: Optional[str] = None


class JournalEntryItemCreate(JournalEntryItemBase):
    @model_validator(mode="after")
    def validate_debit_credit(self):
        d = float(self.debit or 0.0)
        c = float(self.credit or 0.0)
        if d < 0 or c < 0:
            raise ValueError("Debit and Credit amounts cannot be negative.")
        if not ((d > 0 and c == 0) or (c > 0 and d == 0)):
            raise ValueError("Each line must have either a positive Debit OR a positive Credit (not both, and neither can be zero).")
        return self


class JournalEntryItemUpdate(BaseModel):
    account_id:  Optional[int] = None
    partner_id:  Optional[int] = None
    debit:       Optional[float] = None
    credit:      Optional[float] = None
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_debit_credit(self):
        if self.debit is not None or self.credit is not None:
            d = float(self.debit if self.debit is not None else 0.0)
            c = float(self.credit if self.credit is not None else 0.0)
            if d < 0 or c < 0:
                raise ValueError("Debit and Credit amounts cannot be negative.")
            if not ((d > 0 and c == 0) or (c > 0 and d == 0)):
                raise ValueError("Each line must have either a positive Debit OR a positive Credit (not both, and neither can be zero).")
        return self


class JournalEntryItemResponse(BaseModel):
    id:               int
    journal_entry_id: int
    account_id:       int
    account:          Optional[AccountResponse] = None
    partner_id:       Optional[int] = None
    partner:          Optional[ContactResponse] = None
    debit:            Decimal
    credit:           Decimal
    description:      Optional[str] = None

    model_config = {"from_attributes": True}


# ---- ENTRY SCHEMAS -----------------------------------------

class JournalEntryCreate(BaseModel):
    journal_id: int
    entry_date: date
    reference:  Optional[str] = None
    items:      Optional[List[JournalEntryItemCreate]] = []


class JournalEntryUpdate(BaseModel):
    journal_id: Optional[int] = None
    entry_date: Optional[date] = None
    reference:  Optional[str] = None


class JournalEntryResponse(BaseModel):
    id:           int
    journal_id:   int
    journal:      Optional[JournalResponse] = None
    created_by:   int
    creator:      Optional[UserResponse] = None
    entry_number: str
    entry_date:   date
    reference:    Optional[str] = None
    status:       str
    created_at:   Optional[datetime] = None
    items:        List[JournalEntryItemResponse] = []
    total_debit:  Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    is_balanced:  bool = False

    model_config = {"from_attributes": True}
