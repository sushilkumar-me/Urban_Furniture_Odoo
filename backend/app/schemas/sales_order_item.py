from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


# ---- NESTED schemas for embedding in responses ----

class ProductNested(BaseModel):
    id:           int
    product_name: str
    sales_price:  Decimal
    model_config = {"from_attributes": True}


class AnalyticNested(BaseModel):
    id:            int
    analytic_name: str
    model_config = {"from_attributes": True}


# ---- SALES ORDER ITEM schemas ----

class SOItemCreate(BaseModel):
    product_id:          int
    analytic_account_id: Optional[int] = None
    quantity:            int
    unit_price:          float


class SOItemUpdate(BaseModel):
    quantity:            Optional[int]   = None
    unit_price:          Optional[float] = None
    analytic_account_id: Optional[int]   = None


class SOItemResponse(BaseModel):
    id:                  int
    sales_order_id:      int
    product_id:          int
    analytic_account_id: Optional[int]   = None
    quantity:            int
    unit_price:          Decimal
    total:               Decimal
    product:             Optional[ProductNested]  = None
    analytic_account:    Optional[AnalyticNested] = None
    model_config = {"from_attributes": True}
