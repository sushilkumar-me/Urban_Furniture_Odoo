from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.sales_order_item import SOItemCreate, SOItemUpdate, SOItemResponse
from app.services.sales_order_item_service import (
    get_items_by_so,
    get_item_by_id,
    add_item_to_so,
    update_item,
    delete_item
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/sales-order-items", tags=["Sales Order Items"])


@router.get("/by-so/{so_id}", response_model=List[SOItemResponse])
def get_so_items(
    so_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve all line items belonging to a specific sales order."""
    return get_items_by_so(so_id=so_id, db=db)


@router.get("/{item_id}", response_model=SOItemResponse)
def get_one_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve a single sales order line item by its ID."""
    return get_item_by_id(item_id=item_id, db=db)


@router.post("/by-so/{so_id}", response_model=SOItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    so_id: int,
    data: SOItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Add a new line item to a Draft sales order. Recalculates SO total automatically."""
    return add_item_to_so(so_id=so_id, data=data, db=db)


@router.patch("/{item_id}", response_model=SOItemResponse)
def modify_item(
    item_id: int,
    data: SOItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Update quantity, price, or analytic account of an existing line item. Recalculates SO total."""
    return update_item(item_id=item_id, data=data, db=db)


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    """Delete a line item from a Draft sales order. Recalculates SO total automatically."""
    return delete_item(item_id=item_id, db=db)
