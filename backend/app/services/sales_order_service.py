from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.contact import Contact
from app.models.product import Product
from app.models.user import User
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

    # Validate created_by user exists, fallback safely to an existing admin
    creator = db.query(User).filter(User.id == data.created_by).first()
    if not creator:
        first_admin = db.query(User).filter(User.role == "Admin").first() or db.query(User).first()
        creator_id = first_admin.id if first_admin else data.created_by
    else:
        creator_id = data.created_by

    # Create the SO header first
    new_so = SalesOrder(
        customer_id=data.customer_id,
        created_by=creator_id,
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


def update_sales_order(so_id: int, data: SalesOrderUpdate, db: Session) -> SalesOrder:
    from app.models.sales_order_item import SalesOrderItem
    so = get_sales_order_by_id(so_id, db)

    if data.customer_id is not None:
        so.customer_id = data.customer_id
    if data.so_number is not None and data.so_number.strip():
        existing_so = db.query(SalesOrder).filter(SalesOrder.so_number == data.so_number.strip(), SalesOrder.id != so.id).first()
        if existing_so:
            raise HTTPException(status_code=400, detail=f"Sales Order number '{data.so_number}' already exists.")
        so.so_number = data.so_number.strip()
    if data.so_date is not None:
        so.so_date = data.so_date
    if data.status is not None:
        if data.status not in SO_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(SO_STATUSES)}")
        if so.status == "Cancelled" and data.status != "Cancelled":
            raise HTTPException(status_code=400, detail="Cannot reactivate a cancelled sales order.")
        so.status = data.status

    if data.items is not None:
        so.items.clear()
        db.flush()
        running_total = Decimal("0.00")
        for item_data in data.items:
            line_total = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
            running_total += line_total
            so_item = SalesOrderItem(
                sales_order_id=so.id,
                product_id=item_data.product_id,
                analytic_account_id=item_data.analytic_account_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total=line_total
            )
            so.items.append(so_item)
        so.total_amount = running_total
    elif data.total_amount is not None:
        so.total_amount = Decimal(str(data.total_amount))

    db.commit()
    db.refresh(so)
    return so


def update_sales_order_status(so_id: int, data: SalesOrderUpdate, db: Session) -> SalesOrder:
    return update_sales_order(so_id=so_id, data=data, db=db)


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
