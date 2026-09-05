from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.services.payment_service import (
    create_payment, get_all_payments,
    get_payments_for_customer, get_payments_for_vendor,
    get_payment_by_id, get_payments_by_bill, get_payments_by_invoice,
    update_payment, delete_payment
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant
from app.models.customer_invoice import CustomerInvoice

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/", response_model=List[PaymentResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_email = (current_user.get("email") or "").lower().strip()
    if role == "Customer":
        return get_payments_for_customer(email=user_email, db=db)
    if role == "Vendor":
        return get_payments_for_vendor(email=user_email, db=db)
    return get_all_payments(db=db)


# Must come BEFORE /{payment_id} to avoid path conflict
@router.get("/by-bill/{bill_id}", response_model=List[PaymentResponse])
def get_by_bill(bill_id: int, db: Session = Depends(get_db),
                current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Customer":
        raise HTTPException(status_code=403, detail="Customers cannot view vendor payments.")
    return get_payments_by_bill(bill_id=bill_id, db=db)


@router.get("/by-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_by_invoice(invoice_id: int, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Vendor":
        raise HTTPException(status_code=403, detail="Vendors cannot view customer payments.")
    return get_payments_by_invoice(invoice_id=invoice_id, db=db)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_one(payment_id: int, db: Session = Depends(get_db),
            current_user: dict = Depends(get_current_user)):
    return get_payment_by_id(payment_id=payment_id, db=db)


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create(data: PaymentCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_email = (current_user.get("email") or "").lower().strip()

    if role == "Customer":
        # Customers can only pay their own customer invoice
        if not data.customer_invoice_id:
            raise HTTPException(status_code=400, detail="Customers can only make payments towards customer_invoice_id.")
        if data.vendor_bill_id:
            raise HTTPException(status_code=403, detail="Customers cannot pay vendor bills.")
        
        inv = db.query(CustomerInvoice).filter(CustomerInvoice.id == data.customer_invoice_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Customer invoice not found.")
        cust_email = (inv.sales_order.customer.email or "").lower().strip() if inv.sales_order and inv.sales_order.customer else ""
        if user_email != cust_email:
            raise HTTPException(status_code=403, detail="Access denied. You can only pay your own invoices.")
        
        data.payment_type = "Receive"
        return create_payment(data=data, db=db)

    elif role in ["Admin", "Accountant"]:
        return create_payment(data=data, db=db)
    else:
        raise HTTPException(status_code=403, detail="Access denied. Unauthorized to record payments.")


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update(payment_id: int, data: PaymentUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_payment(payment_id=payment_id, data=data, db=db)


@router.delete("/{payment_id}", status_code=status.HTTP_200_OK)
def delete(payment_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_payment(payment_id=payment_id, db=db)
