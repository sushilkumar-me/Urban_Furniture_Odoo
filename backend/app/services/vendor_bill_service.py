from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.vendor_bill import VendorBill
from app.models.purchase_order import PurchaseOrder
from app.schemas.vendor_bill import VendorBillCreate, VendorBillUpdate

BILL_STATUSES = {"Draft", "Posted", "Paid"}


def create_vendor_bill(data: VendorBillCreate, db: Session) -> VendorBill:

    # Validate PO exists
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == data.purchase_order_id).first()
    if not po:
        raise HTTPException(status_code=400, detail=f"Purchase order id {data.purchase_order_id} not found.")

    # PO must be Confirmed before a bill can be created
    if po.status != "Confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"PO '{po.po_number}' must be Confirmed before creating a vendor bill. Current status: {po.status}"
        )

    # Check no bill already exists for this PO (UNIQUE constraint)
    if db.query(VendorBill).filter(VendorBill.purchase_order_id == data.purchase_order_id).first():
        raise HTTPException(status_code=400, detail=f"A vendor bill already exists for PO '{po.po_number}'.")

    # Validate bill number is unique
    if db.query(VendorBill).filter(VendorBill.bill_number == data.bill_number).first():
        raise HTTPException(status_code=400, detail=f"Bill number '{data.bill_number}' already exists.")

    # Validate due_date is after bill_date if provided
    if data.due_date and data.due_date < data.bill_date:
        raise HTTPException(status_code=400, detail="due_date must be on or after bill_date.")

    # Auto-fill total from PO if not explicitly provided
    total = data.total_amount if data.total_amount is not None else float(po.total_amount)

    new_bill = VendorBill(
        purchase_order_id=data.purchase_order_id,
        bill_number=data.bill_number,
        bill_date=data.bill_date,
        due_date=data.due_date,
        status="Draft",
        total_amount=total
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    return new_bill


def get_all_vendor_bills(db: Session) -> list:
    return db.query(VendorBill).order_by(VendorBill.created_at.desc()).all()


def get_vendor_bills_for_vendor(email: str, db: Session) -> list:
    from app.models.contact import Contact
    from app.models.purchase_order import PurchaseOrder
    from sqlalchemy import func
    return (
        db.query(VendorBill)
        .join(PurchaseOrder, PurchaseOrder.id == VendorBill.purchase_order_id)
        .join(Contact, Contact.id == PurchaseOrder.vendor_id)
        .filter(func.lower(Contact.email) == email.lower().strip())
        .order_by(VendorBill.created_at.desc())
        .all()
    )


def get_vendor_bill_by_id(bill_id: int, db: Session) -> VendorBill:
    bill = db.query(VendorBill).filter(VendorBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail=f"Vendor bill id {bill_id} not found.")
    return bill


def update_vendor_bill(bill_id: int, data: VendorBillUpdate, db: Session) -> VendorBill:
    bill = get_vendor_bill_by_id(bill_id, db)
    update_data = data.model_dump(exclude_unset=True)

    # Cannot edit a Paid bill
    if bill.status == "Paid":
        raise HTTPException(status_code=400, detail="Cannot edit a bill that has already been Paid.")

    if "status" in update_data and update_data["status"] not in BILL_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(BILL_STATUSES)}")

    for key, value in update_data.items():
        setattr(bill, key, value)

    db.commit()
    db.refresh(bill)
    return bill


def delete_vendor_bill(bill_id: int, db: Session) -> dict:
    bill = get_vendor_bill_by_id(bill_id, db)

    # Only Draft bills can be deleted
    if bill.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a '{bill.status}' bill. Only Draft bills can be deleted."
        )

    db.delete(bill)
    db.commit()
    return {"message": f"Vendor bill '{bill.bill_number}' deleted successfully."}
