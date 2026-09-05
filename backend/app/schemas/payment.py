from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# Nested bill summary shown inside the payment response
class BillNested(BaseModel):
    id:           int
    bill_number:  str
    total_amount: Decimal
    status:       str
    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    # For purchase payments: provide vendor_bill_id
    # For sales payments: provide customer_invoice_id
    # Exactly ONE must be provided — enforced in the service layer
    vendor_bill_id:      Optional[int]  = None
    customer_invoice_id: Optional[int]  = None

    # 'Send' for paying a vendor, 'Receive' for receiving from customer
    payment_type:   str
    payment_method: Optional[str]  = None
    payment_date:   date
    amount:         float
    note:           Optional[str]  = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Payment amount must be greater than zero.")
        return v


class PaymentUpdate(BaseModel):
    payment_method: Optional[str]   = None
    payment_date:   Optional[date]  = None
    note:           Optional[str]   = None


class PaymentResponse(BaseModel):
    id:                  int
    vendor_bill_id:      Optional[int]    = None
    customer_invoice_id: Optional[int]    = None
    payment_type:        Optional[str]    = None
    payment_method:      Optional[str]    = None
    payment_date:        Optional[date]   = None
    amount:              Decimal
    note:                Optional[str]    = None
    created_at:          Optional[datetime] = None
    vendor_bill:         Optional[BillNested] = None
    model_config = {"from_attributes": True}
