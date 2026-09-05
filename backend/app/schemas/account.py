from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AccountCreate(BaseModel):
    account_name: str
    account_type: str


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    account_type: Optional[str] = None


class AccountResponse(BaseModel):
    id:           int
    account_name: str
    account_type: str
    created_at:   Optional[datetime] = None

    model_config = {"from_attributes": True}
