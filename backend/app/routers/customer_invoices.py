from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.customer_invoice import CustomerInvoiceCreate, CustomerInvoiceUpdate, CustomerInvoiceResponse
from app.services.customer_invoice_service import (
    create_customer_invoice, get_all_customer_invoices,
    get_customer_invoices_for_customer,
    get_customer_invoice_by_id, update_customer_invoice, delete_customer_invoice
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/customer-invoices", tags=["Customer Invoices"])


@router.get("/", response_model=List[CustomerInvoiceResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Vendor":
        raise HTTPException(status_code=403, detail="Access denied. Vendors cannot view customer invoices.")
    if role == "Customer":
        user_email = current_user.get("email") or ""
        return get_customer_invoices_for_customer(email=user_email, db=db)
    return get_all_customer_invoices(db=db)


@router.get("/{invoice_id}", response_model=CustomerInvoiceResponse)
def get_one(invoice_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Vendor":
        raise HTTPException(status_code=403, detail="Access denied. Vendors cannot view customer invoices.")
    invoice = get_customer_invoice_by_id(invoice_id=invoice_id, db=db)
    if role == "Customer":
        user_email = (current_user.get("email") or "").lower().strip()
        cust_email = (invoice.sales_order.customer.email or "").lower().strip() if invoice.sales_order and invoice.sales_order.customer else ""
        if user_email != cust_email:
            raise HTTPException(status_code=403, detail="Access denied. You can only view your own customer invoices.")
    return invoice


@router.post("/", response_model=CustomerInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create(data: CustomerInvoiceCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return create_customer_invoice(data=data, db=db)


@router.patch("/{invoice_id}", response_model=CustomerInvoiceResponse)
def update(invoice_id: int, data: CustomerInvoiceUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_customer_invoice(invoice_id=invoice_id, data=data, db=db)


@router.delete("/{invoice_id}", status_code=status.HTTP_200_OK)
def delete(invoice_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_customer_invoice(invoice_id=invoice_id, db=db)
