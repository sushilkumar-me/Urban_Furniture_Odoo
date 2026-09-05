from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.customer_invoice import CustomerInvoiceCreate, CustomerInvoiceUpdate, CustomerInvoiceResponse
from app.services.customer_invoice_service import (
    create_customer_invoice, get_all_customer_invoices,
    get_customer_invoice_by_id, update_customer_invoice, delete_customer_invoice
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/customer-invoices", tags=["Customer Invoices"])


@router.get("/", response_model=List[CustomerInvoiceResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_all_customer_invoices(db=db)


@router.get("/{invoice_id}", response_model=CustomerInvoiceResponse)
def get_one(invoice_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_customer_invoice_by_id(invoice_id=invoice_id, db=db)


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
