from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.product import Product
from app.models.analytic_account import AnalyticAccount
from app.schemas.purchase_order_item import POItemCreate, POItemUpdate


def _recalculate_po_total(po_id: int, db: Session) -> Decimal:
    """Recalculate parent PO total amount from all its line items."""
    items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == po_id
    ).all()
    total = sum(item.total for item in items) if items else Decimal("0.00")
    db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).update(
        {"total_amount": total}
    )
    return total


def get_items_by_po(po_id: int, db: Session) -> list:
    """Fetch all line items for a given purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order id {po_id} not found.")
    return db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == po_id
    ).all()


def get_item_by_id(item_id: int, db: Session) -> PurchaseOrderItem:
    """Fetch a single purchase order line item by its primary key."""
    item = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Purchase order item id {item_id} not found.")
    return item


def add_item_to_po(po_id: int, data: POItemCreate, db: Session) -> PurchaseOrderItem:
    """Add a new line item to an existing Draft purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order id {po_id} not found.")

    if po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add items to a '{po.status}' purchase order. Only Draft POs can be modified."
        )

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail=f"Product id {data.product_id} not found.")

    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    if data.unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit price cannot be negative.")

    if data.analytic_account_id:
        analytic = db.query(AnalyticAccount).filter(AnalyticAccount.id == data.analytic_account_id).first()
        if not analytic:
            raise HTTPException(status_code=400, detail=f"Analytic account id {data.analytic_account_id} not found.")

    line_total = Decimal(str(round(data.quantity * data.unit_price, 2)))
    new_item = PurchaseOrderItem(
        purchase_order_id=po_id,
        product_id=data.product_id,
        analytic_account_id=data.analytic_account_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total=line_total
    )
    db.add(new_item)
    db.flush()
    _recalculate_po_total(po_id, db)
    db.commit()
    db.refresh(new_item)
    return new_item


def update_item(item_id: int, data: POItemUpdate, db: Session) -> PurchaseOrderItem:
    """Update quantity, price, or analytic account of an existing line item on a Draft PO."""
    item = get_item_by_id(item_id, db)
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == item.purchase_order_id).first()

    if po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit items of a '{po.status}' purchase order. Only Draft POs can be modified."
        )

    update_data = data.model_dump(exclude_unset=True)

    if "quantity" in update_data:
        if update_data["quantity"] <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        item.quantity = update_data["quantity"]

    if "unit_price" in update_data:
        if update_data["unit_price"] < 0:
            raise HTTPException(status_code=400, detail="Unit price cannot be negative.")
        item.unit_price = update_data["unit_price"]

    if "analytic_account_id" in update_data:
        if update_data["analytic_account_id"] is not None:
            analytic = db.query(AnalyticAccount).filter(AnalyticAccount.id == update_data["analytic_account_id"]).first()
            if not analytic:
                raise HTTPException(status_code=400, detail=f"Analytic account id {update_data['analytic_account_id']} not found.")
        item.analytic_account_id = update_data["analytic_account_id"]

    item.total = Decimal(str(round(item.quantity * float(item.unit_price), 2)))
    db.flush()
    _recalculate_po_total(item.purchase_order_id, db)
    db.commit()
    db.refresh(item)
    return item


def delete_item(item_id: int, db: Session) -> dict:
    """Delete a line item from a Draft purchase order and recalculate PO total."""
    item = get_item_by_id(item_id, db)
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == item.purchase_order_id).first()

    if po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete items from a '{po.status}' purchase order. Only Draft POs can be modified."
        )

    po_items_count = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == item.purchase_order_id
    ).count()

    if po_items_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the only item in a purchase order. Delete the entire purchase order instead."
        )

    po_id = item.purchase_order_id
    db.delete(item)
    db.flush()
    _recalculate_po_total(po_id, db)
    db.commit()
    return {"message": f"Item id {item_id} deleted successfully."}
