from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AnalyticAccountCreate(BaseModel):
    analytic_name: str
    type:          Optional[str] = None
    description:   Optional[str] = None


class AnalyticAccountUpdate(BaseModel):
    analytic_name: Optional[str] = None
    type:          Optional[str] = None
    description:   Optional[str] = None


class AnalyticAccountResponse(BaseModel):
    id:            int
    analytic_name: str
    type:          Optional[str] = None
    description:   Optional[str] = None
    created_at:    Optional[datetime] = None

    model_config = {"from_attributes": True}
