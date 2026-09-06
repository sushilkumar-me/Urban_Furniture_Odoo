from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.contact import Contact
from app.models.product import Product
from app.models.user import User
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate

PO_STATUSES = {"Draft", "Confirmed", "Cancelled"}


def _recalculate_total(po_id: int, db: Session):
    # Recalculate PO total by summing all item totals.
    # Called after adding, editing, or deleting any item.
    # We query the DB directly to get the current state.
    items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == po_id
    ).all()
    total = sum(item.total for item in items)
    db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).update(
        {"total_amount": total}
    )


def create_purchase_order(data: PurchaseOrderCreate, db: Session) -> PurchaseOrder:

    # Validate vendor exists and is a Vendor type contact
    vendor = db.query(Contact).filter(Contact.id == data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=400, detail=f"Contact id {data.vendor_id} not found.")
    if vendor.contact_type != "Vendor":
        raise HTTPException(status_code=400, detail=f"Contact '{vendor.name}' is not a Vendor.")

    # Validate PO number is unique
    if db.query(PurchaseOrder).filter(PurchaseOrder.po_number == data.po_number).first():
        raise HTTPException(status_code=400, detail=f"PO number '{data.po_number}' already exists.")

    # Must have at least one item
    if not data.items:
        raise HTTPException(status_code=400, detail="Purchase order must have at least one item.")

    # Validate created_by user exists, fallback safely to an existing admin
    creator = db.query(User).filter(User.id == data.created_by).first()
    if not creator:
        first_admin = db.query(User).filter(User.role == "Admin").first() or db.query(User).first()
        creator_id = first_admin.id if first_admin else data.created_by
    else:
        creator_id = data.created_by

    # Create the PO header first (without items)
    new_po = PurchaseOrder(
        vendor_id=data.vendor_id,
        created_by=creator_id,
        po_number=data.po_number,
        po_date=data.po_date,
        status="Draft",
        total_amount=0
    )
    db.add(new_po)
    db.flush()  # flush sends INSERT to DB and populates new_po.id
                # without committing — so we can use the id for items

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
        new_item = PurchaseOrderItem(
            purchase_order_id=new_po.id,
            product_id=item_data.product_id,
            analytic_account_id=item_data.analytic_account_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total=total
        )
        db.add(new_item)

    db.flush()
    _recalculate_total(new_po.id, db)
    db.commit()
    db.refresh(new_po)
    return new_po


def get_all_purchase_orders(db: Session) -> list:
    return db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()


def get_purchase_order_by_id(po_id: int, db: Session) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order id {po_id} not found.")
    return po


def update_purchase_order(po_id: int, data: PurchaseOrderUpdate, db: Session) -> PurchaseOrder:
    from app.models.purchase_order_item import PurchaseOrderItem
    from decimal import Decimal
    po = get_purchase_order_by_id(po_id, db)

    if data.vendor_id is not None:
        po.vendor_id = data.vendor_id
    if data.po_number is not None and data.po_number.strip():
        existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == data.po_number.strip(), PurchaseOrder.id != po.id).first()
        if existing_po:
            raise HTTPException(status_code=400, detail=f"Purchase Order number '{data.po_number}' already exists.")
        po.po_number = data.po_number.strip()
    if data.po_date is not None:
        po.po_date = data.po_date
    if data.status is not None:
        if data.status not in PO_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(PO_STATUSES)}")
        if po.status == "Cancelled" and data.status != "Cancelled":
            raise HTTPException(status_code=400, detail="Cannot reactivate a cancelled purchase order.")
        po.status = data.status

    if data.items is not None:
        po.items.clear()
        db.flush()
        running_total = Decimal("0.00")
        for item_data in data.items:
            line_total = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
            running_total += line_total
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item_data.product_id,
                analytic_account_id=item_data.analytic_account_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total=line_total
            )
            po.items.append(po_item)
        po.total_amount = running_total
    elif data.total_amount is not None:
        po.total_amount = Decimal(str(data.total_amount))

    db.commit()
    db.refresh(po)
    return po


def update_purchase_order_status(po_id: int, data: PurchaseOrderUpdate, db: Session) -> PurchaseOrder:
    return update_purchase_order(po_id=po_id, data=data, db=db)


def delete_purchase_order(po_id: int, db: Session) -> dict:
    po = get_purchase_order_by_id(po_id, db)

    # Only Draft POs can be deleted
    if po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a '{po.status}' purchase order. Only Draft POs can be deleted."
        )

    try:
        db.delete(po)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete PO '{po.po_number}'. It has a vendor bill linked to it."
        )

    return {"message": f"Purchase order '{po.po_number}' deleted successfully."}
