from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.sales_order import SalesOrderCreate, SalesOrderUpdate, SalesOrderResponse
from app.services.sales_order_service import (
    create_sales_order, get_all_sales_orders,
    get_sales_order_by_id, update_sales_order, update_sales_order_status, delete_sales_order
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/sales-orders", tags=["Sales Orders"])


@router.get("/", response_model=List[SalesOrderResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_all_sales_orders(db=db)


@router.get("/{so_id}", response_model=SalesOrderResponse)
def get_one(so_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_sales_order_by_id(so_id=so_id, db=db)


@router.post("/", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED)
def create(data: SalesOrderCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return create_sales_order(data=data, db=db)


@router.put("/{so_id}", response_model=SalesOrderResponse)
@router.patch("/{so_id}", response_model=SalesOrderResponse)
def update(so_id: int, data: SalesOrderUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_sales_order(so_id=so_id, data=data, db=db)


@router.patch("/{so_id}/status", response_model=SalesOrderResponse)
def update_status(so_id: int, data: SalesOrderUpdate, db: Session = Depends(get_db),
                  current_user: dict = Depends(require_admin_or_accountant)):
    return update_sales_order_status(so_id=so_id, data=data, db=db)


@router.delete("/{so_id}", status_code=status.HTTP_200_OK)
def delete(so_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_sales_order(so_id=so_id, db=db)
