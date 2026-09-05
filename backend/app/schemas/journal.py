from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AccountNested(BaseModel):
    id:           int
    account_name: str
    account_type: str

    model_config = {"from_attributes": True}


class JournalCreate(BaseModel):
    journal_name:       str
    journal_type:       str
    default_account_id: int


class JournalUpdate(BaseModel):
    journal_name:       Optional[str] = None
    journal_type:       Optional[str] = None
    default_account_id: Optional[int] = None


class JournalResponse(BaseModel):
    id:                 int
    journal_name:       str
    journal_type:       str
    default_account_id: int
    default_account:    Optional[AccountNested] = None
    created_at:         Optional[datetime] = None

    model_config = {"from_attributes": True}
