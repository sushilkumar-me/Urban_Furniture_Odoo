from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


# AnalyticNested: embedded inside BudgetResponse.
# Shows the full analytic account without a second API call.
class AnalyticNested(BaseModel):
    id:            int
    analytic_name: str
    type:          Optional[str] = None

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    analytic_account_id: int
    budget_name:         str

    # date type (not datetime) — client sends "2026-04-01" string.
    # pydantic automatically converts it to Python date object.
    # FastAPI serializes it back to "2026-04-01" in JSON response.
    start_date:          date
    end_date:            date

    planned_amount:      float
    responsible_person:  Optional[str] = None

    # Validate that end_date is after start_date.
    # A budget period where end is before start makes no sense.
    # model_validator runs AFTER all individual fields are validated.
    @field_validator("planned_amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v < 0:
            raise ValueError("planned_amount cannot be negative.")
        return v


class BudgetUpdate(BaseModel):
    analytic_account_id: Optional[int]   = None
    budget_name:         Optional[str]   = None
    start_date:          Optional[date]  = None
    end_date:            Optional[date]  = None
    planned_amount:      Optional[float] = None
    responsible_person:  Optional[str]   = None

    @field_validator("planned_amount", mode="before")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError("planned_amount cannot be negative.")
        return v


class BudgetResponse(BaseModel):
    id:                  int
    analytic_account_id: int

    # Nested analytic account — shows name and type in the response.
    analytic_account:    Optional[AnalyticNested] = None

    budget_name:         str
    start_date:          Optional[date]     = None
    end_date:            Optional[date]     = None
    planned_amount:      Decimal
    responsible_person:  Optional[str]      = None
    created_at:          Optional[datetime] = None

    model_config = {"from_attributes": True}
