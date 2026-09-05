from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.product import Product
from app.models.analytic_account import AnalyticAccount
from app.schemas.sales_order_item import SOItemCreate, SOItemUpdate


def _recalculate_so_total(so_id: int, db: Session) -> Decimal:
    """Recalculate parent SO total amount from all its line items."""
    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id == so_id
    ).all()
    total = sum(item.total for item in items) if items else Decimal("0.00")
    db.query(SalesOrder).filter(SalesOrder.id == so_id).update(
        {"total_amount": total}
    )
    return total


def get_items_by_so(so_id: int, db: Session) -> list:
    """Fetch all line items for a given sales order."""
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail=f"Sales order id {so_id} not found.")
    return db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id == so_id
    ).all()


def get_item_by_id(item_id: int, db: Session) -> SalesOrderItem:
    """Fetch a single sales order line item by its primary key."""
    item = db.query(SalesOrderItem).filter(SalesOrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Sales order item id {item_id} not found.")
    return item


def add_item_to_so(so_id: int, data: SOItemCreate, db: Session) -> SalesOrderItem:
    """Add a new line item to an existing Draft sales order."""
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail=f"Sales order id {so_id} not found.")

    if so.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add items to a '{so.status}' sales order. Only Draft SOs can be modified."
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
    new_item = SalesOrderItem(
        sales_order_id=so_id,
        product_id=data.product_id,
        analytic_account_id=data.analytic_account_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total=line_total
    )
    db.add(new_item)
    db.flush()
    _recalculate_so_total(so_id, db)
    db.commit()
    db.refresh(new_item)
    return new_item


def update_item(item_id: int, data: SOItemUpdate, db: Session) -> SalesOrderItem:
    """Update quantity, price, or analytic account of an existing line item on a Draft SO."""
    item = get_item_by_id(item_id, db)
    so = db.query(SalesOrder).filter(SalesOrder.id == item.sales_order_id).first()

    if so.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit items of a '{so.status}' sales order. Only Draft SOs can be modified."
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
    _recalculate_so_total(item.sales_order_id, db)
    db.commit()
    db.refresh(item)
    return item


def delete_item(item_id: int, db: Session) -> dict:
    """Delete a line item from a Draft sales order and recalculate SO total."""
    item = get_item_by_id(item_id, db)
    so = db.query(SalesOrder).filter(SalesOrder.id == item.sales_order_id).first()

    if so.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete items from a '{so.status}' sales order. Only Draft SOs can be modified."
        )

    so_items_count = db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id == item.sales_order_id
    ).count()

    if so_items_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the only item in a sales order. Delete the entire sales order instead."
        )

    so_id = item.sales_order_id
    db.delete(item)
    db.flush()
    _recalculate_so_total(so_id, db)
    db.commit()
    return {"message": f"Item id {item_id} deleted successfully."}
