from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# Nested PO summary shown inside the bill response
class PONested(BaseModel):
    id:           int
    po_number:    str
    status:       str
    total_amount: Decimal
    model_config = {"from_attributes": True}


class VendorBillCreate(BaseModel):
    purchase_order_id: int
    bill_number:       str
    bill_date:         date
    due_date:          Optional[date]  = None
    # total_amount is copied from the linked PO
    # but we allow the accountant to override it if needed
    total_amount:      Optional[float] = None


class VendorBillUpdate(BaseModel):
    bill_number:  Optional[str]   = None
    bill_date:    Optional[date]  = None
    due_date:     Optional[date]  = None
    status:       Optional[str]   = None
    total_amount: Optional[float] = None


class VendorBillResponse(BaseModel):
    id:                int
    purchase_order_id: int
    bill_number:       str
    bill_date:         Optional[date]     = None
    due_date:          Optional[date]     = None
    status:            str
    total_amount:      Decimal
    created_at:        Optional[datetime] = None
    purchase_order:    Optional[PONested] = None
    model_config = {"from_attributes": True}
