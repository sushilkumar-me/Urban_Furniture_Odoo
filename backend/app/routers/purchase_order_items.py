from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.purchase_order_item import POItemCreate, POItemUpdate, POItemResponse
from app.services.purchase_order_item_service import (
    get_items_by_po,
    get_item_by_id,
    add_item_to_po,
    update_item,
    delete_item
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/purchase-order-items", tags=["Purchase Order Items"])


@router.get("/by-po/{po_id}", response_model=List[POItemResponse])
def get_po_items(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve all line items belonging to a specific purchase order."""
    return get_items_by_po(po_id=po_id, db=db)


@router.get("/{item_id}", response_model=POItemResponse)
def get_one_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve a single purchase order line item by its ID."""
    return get_item_by_id(item_id=item_id, db=db)


@router.post("/by-po/{po_id}", response_model=POItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    po_id: int,
    data: POItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Add a new line item to a Draft purchase order. Recalculates PO total automatically."""
    return add_item_to_po(po_id=po_id, data=data, db=db)


@router.patch("/{item_id}", response_model=POItemResponse)
def modify_item(
    item_id: int,
    data: POItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Update quantity, price, or analytic account of an existing line item. Recalculates PO total."""
    return update_item(item_id=item_id, data=data, db=db)


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Delete a line item from a Draft purchase order. Recalculates PO total automatically."""
    return delete_item(item_id=item_id, db=db)
