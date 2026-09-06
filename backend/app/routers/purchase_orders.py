from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse
from app.services.purchase_order_service import (
    create_purchase_order, get_all_purchase_orders,
    get_purchase_order_by_id, update_purchase_order, update_purchase_order_status, delete_purchase_order
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("/", response_model=List[PurchaseOrderResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_all_purchase_orders(db=db)


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_one(po_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_purchase_order_by_id(po_id=po_id, db=db)


@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create(data: PurchaseOrderCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return create_purchase_order(data=data, db=db)


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
@router.patch("/{po_id}", response_model=PurchaseOrderResponse)
def update(po_id: int, data: PurchaseOrderUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_purchase_order(po_id=po_id, data=data, db=db)


@router.patch("/{po_id}/status", response_model=PurchaseOrderResponse)
def update_status(po_id: int, data: PurchaseOrderUpdate, db: Session = Depends(get_db),
                  current_user: dict = Depends(require_admin_or_accountant)):
    return update_purchase_order_status(po_id=po_id, data=data, db=db)


@router.delete("/{po_id}", status_code=status.HTTP_200_OK)
def delete(po_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_purchase_order(po_id=po_id, db=db)
