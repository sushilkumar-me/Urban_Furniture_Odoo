from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.payment import Payment
from app.models.vendor_bill import VendorBill
from app.models.customer_invoice import CustomerInvoice
from app.schemas.payment import PaymentCreate, PaymentUpdate

PAYMENT_TYPES   = {"Send", "Receive"}
PAYMENT_METHODS = {"Bank Transfer", "Cash", "Cheque", "UPI", "NEFT", "RTGS"}


def create_payment(data: PaymentCreate, db: Session) -> Payment:

    # Exactly one reference must be provided
    if data.vendor_bill_id is None and data.customer_invoice_id is None:
        raise HTTPException(status_code=400, detail="Provide either vendor_bill_id or customer_invoice_id.")

    if data.vendor_bill_id and data.customer_invoice_id:
        raise HTTPException(status_code=400, detail="Provide only ONE of vendor_bill_id or customer_invoice_id, not both.")

    if data.payment_type and data.payment_type not in PAYMENT_TYPES:
        raise HTTPException(status_code=400, detail="payment_type must be 'Send' or 'Receive'.")

    # For vendor bill payments (outbound)
    if data.vendor_bill_id:
        bill = db.query(VendorBill).filter(VendorBill.id == data.vendor_bill_id).first()
        if not bill:
            raise HTTPException(status_code=400, detail=f"Vendor bill id {data.vendor_bill_id} not found.")

        # Can only pay a Posted bill — not a Draft one
        if bill.status == "Draft":
            raise HTTPException(
                status_code=400,
                detail=f"Bill '{bill.bill_number}' is still Draft. Post it first before recording payment."
            )
        if bill.status == "Paid":
            raise HTTPException(
                status_code=400,
                detail=f"Bill '{bill.bill_number}' is already Paid."
            )

        new_payment = Payment(
            vendor_bill_id=data.vendor_bill_id,
            payment_type="Send",          # paying a vendor = sending money
            payment_method=data.payment_method,
            payment_date=data.payment_date,
            amount=data.amount,
            note=data.note
        )
        db.add(new_payment)
        db.flush()

        # Mark the bill as Paid after recording the payment
        bill.status = "Paid"

    # For customer invoice payments (inbound)
    elif data.customer_invoice_id:
        invoice = db.query(CustomerInvoice).filter(CustomerInvoice.id == data.customer_invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=400, detail=f"Customer invoice id {data.customer_invoice_id} not found.")

        # Can only pay a Posted invoice — not Draft or Paid
        if invoice.status == "Draft":
            raise HTTPException(
                status_code=400,
                detail=f"Invoice '{invoice.invoice_number}' is still Draft. Post it first before recording payment."
            )
        if invoice.status == "Paid":
            raise HTTPException(
                status_code=400,
                detail=f"Invoice '{invoice.invoice_number}' is already Paid."
            )

        new_payment = Payment(
            customer_invoice_id=data.customer_invoice_id,
            payment_type="Receive",       # collecting from customer = receiving money
            payment_method=data.payment_method,
            payment_date=data.payment_date,
            amount=data.amount,
            note=data.note
        )
        db.add(new_payment)
        db.flush()

        # Mark the customer invoice as Paid after recording payment
        invoice.status = "Paid"

    db.commit()
    db.refresh(new_payment)
    return new_payment


def get_all_payments(db: Session) -> list:
    return db.query(Payment).order_by(Payment.payment_date.desc()).all()


def get_payments_for_customer(email: str, db: Session) -> list:
    from app.models.contact import Contact
    from app.models.sales_order import SalesOrder
    from sqlalchemy import func
    return (
        db.query(Payment)
        .join(CustomerInvoice, CustomerInvoice.id == Payment.customer_invoice_id)
        .join(SalesOrder, SalesOrder.id == CustomerInvoice.sales_order_id)
        .join(Contact, Contact.id == SalesOrder.customer_id)
        .filter(func.lower(Contact.email) == email.lower().strip())
        .order_by(Payment.payment_date.desc())
        .all()
    )


def get_payments_for_vendor(email: str, db: Session) -> list:
    from app.models.contact import Contact
    from app.models.purchase_order import PurchaseOrder
    from sqlalchemy import func
    return (
        db.query(Payment)
        .join(VendorBill, VendorBill.id == Payment.vendor_bill_id)
        .join(PurchaseOrder, PurchaseOrder.id == VendorBill.purchase_order_id)
        .join(Contact, Contact.id == PurchaseOrder.vendor_id)
        .filter(func.lower(Contact.email) == email.lower().strip())
        .order_by(Payment.payment_date.desc())
        .all()
    )


def get_payment_by_id(payment_id: int, db: Session) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment id {payment_id} not found.")
    return payment


def get_payments_by_bill(bill_id: int, db: Session) -> list:
    return db.query(Payment).filter(
        Payment.vendor_bill_id == bill_id
    ).order_by(Payment.payment_date.desc()).all()


def get_payments_by_invoice(invoice_id: int, db: Session) -> list:
    return db.query(Payment).filter(
        Payment.customer_invoice_id == invoice_id
    ).order_by(Payment.payment_date.desc()).all()


def update_payment(payment_id: int, data: PaymentUpdate, db: Session) -> Payment:
    payment = get_payment_by_id(payment_id, db)
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(payment, key, value)

    db.commit()
    db.refresh(payment)
    return payment


def delete_payment(payment_id: int, db: Session) -> dict:
    payment = get_payment_by_id(payment_id, db)

    # When deleting a payment, revert the bill or invoice back to Posted
    if payment.vendor_bill_id:
        bill = db.query(VendorBill).filter(VendorBill.id == payment.vendor_bill_id).first()
        if bill:
            bill.status = "Posted"

    if payment.customer_invoice_id:
        invoice = db.query(CustomerInvoice).filter(CustomerInvoice.id == payment.customer_invoice_id).first()
        if invoice:
            invoice.status = "Posted"

    db.delete(payment)
    db.commit()
    return {"message": f"Payment of ₹{payment.amount} deleted. Obligation status reverted to Posted."}
