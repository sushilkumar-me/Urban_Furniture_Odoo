from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.contact import Contact
from app.models.product import Product
from app.schemas.sales_order import SalesOrderCreate, SalesOrderUpdate

SO_STATUSES = {"Draft", "Confirmed", "Cancelled"}


def _recalculate_total(so_id: int, db: Session):
    """Recalculate parent SO total amount from all its items."""
    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id == so_id
    ).all()
    total = sum(item.total for item in items)
    db.query(SalesOrder).filter(SalesOrder.id == so_id).update(
        {"total_amount": total}
    )


def create_sales_order(data: SalesOrderCreate, db: Session) -> SalesOrder:
    # Validate customer exists and is a Customer type contact
    customer = db.query(Contact).filter(Contact.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail=f"Contact id {data.customer_id} not found.")
    if customer.contact_type != "Customer":
        raise HTTPException(status_code=400, detail=f"Contact '{customer.name}' is not a Customer.")

    # Validate SO number is unique
    if db.query(SalesOrder).filter(SalesOrder.so_number == data.so_number).first():
        raise HTTPException(status_code=400, detail=f"SO number '{data.so_number}' already exists.")

    # Must have at least one item
    if not data.items:
        raise HTTPException(status_code=400, detail="Sales order must have at least one item.")

    # Create the SO header first
    new_so = SalesOrder(
        customer_id=data.customer_id,
        created_by=data.created_by,
        so_number=data.so_number,
        so_date=data.so_date,
        status="Draft",
        total_amount=0
    )
    db.add(new_so)
    db.flush()

    # Create each line item
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Product id {item_data.product_id} not found.")

        if item_data.quantity <= 0:
            db.rollback()
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

        total = Decimal(str(round(item_data.quantity * item_data.unit_price, 2)))
        new_item = SalesOrderItem(
            sales_order_id=new_so.id,
            product_id=item_data.product_id,
            analytic_account_id=item_data.analytic_account_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total=total
        )
        db.add(new_item)

    db.flush()
    _recalculate_total(new_so.id, db)
    db.commit()
    db.refresh(new_so)
    return new_so


def get_all_sales_orders(db: Session) -> list:
    return db.query(SalesOrder).order_by(SalesOrder.created_at.desc()).all()


def get_sales_order_by_id(so_id: int, db: Session) -> SalesOrder:
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail=f"Sales order id {so_id} not found.")
    return so


def update_sales_order_status(so_id: int, data: SalesOrderUpdate, db: Session) -> SalesOrder:
    so = get_sales_order_by_id(so_id, db)
    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data:
        if update_data["status"] not in SO_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(SO_STATUSES)}")

        # Cannot reactivate a cancelled SO
        if so.status == "Cancelled" and update_data["status"] != "Cancelled":
            raise HTTPException(status_code=400, detail="Cannot reactivate a cancelled sales order.")

    for key, value in update_data.items():
        setattr(so, key, value)

    db.commit()
    db.refresh(so)
    return so


def delete_sales_order(so_id: int, db: Session) -> dict:
    so = get_sales_order_by_id(so_id, db)

    # Only Draft SOs can be deleted
    if so.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a '{so.status}' sales order. Only Draft SOs can be deleted."
        )

    try:
        db.delete(so)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete SO '{so.so_number}'. It has an invoice linked to it."
        )

    return {"message": f"Sales order '{so.so_number}' deleted successfully."}
