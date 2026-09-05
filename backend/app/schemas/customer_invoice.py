from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.schemas.sales_order import CustomerNested


# Nested SO summary shown inside invoice response
class SONested(BaseModel):
    id:           int
    so_number:    str
    status:       str
    total_amount: Decimal
    customer:     Optional[CustomerNested] = None
    model_config = {"from_attributes": True}


class CustomerInvoiceCreate(BaseModel):
    sales_order_id: int
    invoice_number: str
    invoice_date:   date
    due_date:       Optional[date]  = None
    total_amount:   Optional[float] = None


class CustomerInvoiceUpdate(BaseModel):
    invoice_number: Optional[str]   = None
    invoice_date:   Optional[date]  = None
    due_date:       Optional[date]  = None
    status:         Optional[str]   = None
    total_amount:   Optional[float] = None


class CustomerInvoiceResponse(BaseModel):
    id:             int
    sales_order_id: int
    invoice_number: str
    invoice_date:   Optional[date]     = None
    due_date:       Optional[date]     = None
    status:         str
    total_amount:   Decimal
    created_at:     Optional[datetime] = None
    sales_order:    Optional[SONested] = None
    model_config = {"from_attributes": True}
