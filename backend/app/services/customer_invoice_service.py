from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.customer_invoice import CustomerInvoice
from app.models.sales_order import SalesOrder
from app.schemas.customer_invoice import CustomerInvoiceCreate, CustomerInvoiceUpdate

INVOICE_STATUSES = {"Draft", "Posted", "Paid"}


def create_customer_invoice(data: CustomerInvoiceCreate, db: Session) -> CustomerInvoice:

    # Validate SO exists
    so = db.query(SalesOrder).filter(SalesOrder.id == data.sales_order_id).first()
    if not so:
        raise HTTPException(status_code=400, detail=f"Sales order id {data.sales_order_id} not found.")

    # SO must be Confirmed before an invoice can be created
    if so.status != "Confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"SO '{so.so_number}' must be Confirmed before creating an invoice. Current status: {so.status}"
        )

    # Check no invoice already exists for this SO (UNIQUE constraint)
    if db.query(CustomerInvoice).filter(CustomerInvoice.sales_order_id == data.sales_order_id).first():
        raise HTTPException(status_code=400, detail=f"A customer invoice already exists for SO '{so.so_number}'.")

    # Validate invoice number is unique
    if db.query(CustomerInvoice).filter(CustomerInvoice.invoice_number == data.invoice_number).first():
        raise HTTPException(status_code=400, detail=f"Invoice number '{data.invoice_number}' already exists.")

    # Validate due_date is on or after invoice_date if provided
    if data.due_date and data.due_date < data.invoice_date:
        raise HTTPException(status_code=400, detail="due_date must be on or after invoice_date.")

    # Auto-fill total from SO if not explicitly provided
    total = data.total_amount if data.total_amount is not None else float(so.total_amount)

    new_invoice = CustomerInvoice(
        sales_order_id=data.sales_order_id,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        status="Draft",
        total_amount=total
    )
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice


def get_all_customer_invoices(db: Session) -> list:
    return db.query(CustomerInvoice).order_by(CustomerInvoice.created_at.desc()).all()


def get_customer_invoices_for_customer(email: str, db: Session) -> list:
    from app.models.contact import Contact
    from sqlalchemy import func
    return (
        db.query(CustomerInvoice)
        .join(SalesOrder, SalesOrder.id == CustomerInvoice.sales_order_id)
        .join(Contact, Contact.id == SalesOrder.customer_id)
        .filter(func.lower(Contact.email) == email.lower().strip())
        .order_by(CustomerInvoice.created_at.desc())
        .all()
    )


def get_customer_invoice_by_id(invoice_id: int, db: Session) -> CustomerInvoice:
    invoice = db.query(CustomerInvoice).filter(CustomerInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Customer invoice id {invoice_id} not found.")
    return invoice


def update_customer_invoice(invoice_id: int, data: CustomerInvoiceUpdate, db: Session) -> CustomerInvoice:
    invoice = get_customer_invoice_by_id(invoice_id, db)
    update_data = data.model_dump(exclude_unset=True)

    # Cannot edit a Paid invoice
    if invoice.status == "Paid":
        raise HTTPException(status_code=400, detail="Cannot edit an invoice that has already been Paid.")

    if "status" in update_data and update_data["status"] not in INVOICE_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(INVOICE_STATUSES)}")

    for key, value in update_data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)
    return invoice


def delete_customer_invoice(invoice_id: int, db: Session) -> dict:
    invoice = get_customer_invoice_by_id(invoice_id, db)

    # Only Draft invoices can be deleted
    if invoice.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a '{invoice.status}' invoice. Only Draft invoices can be deleted."
        )

    db.delete(invoice)
    db.commit()
    return {"message": f"Customer invoice '{invoice.invoice_number}' deleted successfully."}
