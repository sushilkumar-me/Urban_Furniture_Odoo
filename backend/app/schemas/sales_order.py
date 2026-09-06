from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

from app.schemas.sales_order_item import SOItemCreate, SOItemResponse


# ---- NESTED schemas for embedding in responses ----

class CustomerNested(BaseModel):
    id:    int
    name:  str
    email: Optional[str] = None
    model_config = {"from_attributes": True}


class CreatorNested(BaseModel):
    id:       int
    name:     str
    login_id: str
    model_config = {"from_attributes": True}


# ---- SALES ORDER schemas ----

class SalesOrderCreate(BaseModel):
    customer_id: int
    created_by:  int
    so_number:   str
    so_date:     date
    items:       List[SOItemCreate]


class SalesOrderUpdate(BaseModel):
    customer_id:  Optional[int]                = None
    so_number:    Optional[str]                = None
    so_date:      Optional[date]               = None
    status:       Optional[str]                = None
    total_amount: Optional[float]              = None
    items:        Optional[List[SOItemCreate]] = None


class SalesOrderResponse(BaseModel):
    id:           int
    customer_id:  int
    created_by:   int
    so_number:    str
    so_date:      Optional[date]     = None
    status:       str
    total_amount: Decimal
    created_at:   Optional[datetime] = None
    customer:     Optional[CustomerNested] = None
    creator:      Optional[CreatorNested]  = None
    items:        List[SOItemResponse]     = []
    model_config = {"from_attributes": True}
