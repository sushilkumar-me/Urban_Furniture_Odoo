from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ---- NESTED schemas for embedding in responses ----

class VendorNested(BaseModel):
    id:   int
    name: str
    model_config = {"from_attributes": True}


class CreatorNested(BaseModel):
    id:       int
    name:     str
    login_id: str
    model_config = {"from_attributes": True}


class ProductNested(BaseModel):
    id:           int
    product_name: str
    cost_price:   Decimal
    model_config = {"from_attributes": True}


class AnalyticNested(BaseModel):
    id:            int
    analytic_name: str
    model_config = {"from_attributes": True}


# ---- PURCHASE ORDER ITEM schemas ----

class POItemCreate(BaseModel):
    product_id:          int
    analytic_account_id: Optional[int]   = None
    quantity:            int
    unit_price:          float


class POItemResponse(BaseModel):
    id:                  int
    purchase_order_id:   int
    product_id:          int
    analytic_account_id: Optional[int]   = None
    quantity:            int
    unit_price:          Decimal
    total:               Decimal
    product:             Optional[ProductNested]  = None
    analytic_account:    Optional[AnalyticNested] = None
    model_config = {"from_attributes": True}


# ---- PURCHASE ORDER schemas ----

class PurchaseOrderCreate(BaseModel):
    vendor_id:    int
    created_by:   int
    po_number:    str
    po_date:      date
    # items are passed together with the PO in one request.
    # This lets us create the PO and all its line items in one API call.
    items:        List[POItemCreate]


class PurchaseOrderUpdate(BaseModel):
    vendor_id:    Optional[int]                = None
    po_number:    Optional[str]                = None
    po_date:      Optional[date]               = None
    status:       Optional[str]                = None
    total_amount: Optional[float]              = None
    items:        Optional[List[POItemCreate]] = None


class PurchaseOrderResponse(BaseModel):
    id:           int
    vendor_id:    int
    created_by:   int
    po_number:    str
    po_date:      Optional[date]    = None
    status:       str
    total_amount: Decimal
    created_at:   Optional[datetime] = None
    vendor:       Optional[VendorNested]  = None
    creator:      Optional[CreatorNested] = None
    items:        List[POItemResponse]    = []
    model_config = {"from_attributes": True}
