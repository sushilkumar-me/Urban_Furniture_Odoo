from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.services.payment_service import (
    create_payment, get_all_payments,
    get_payment_by_id, get_payments_by_bill, get_payments_by_invoice,
    update_payment, delete_payment
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/", response_model=List[PaymentResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_all_payments(db=db)


# Must come BEFORE /{payment_id} to avoid path conflict
@router.get("/by-bill/{bill_id}", response_model=List[PaymentResponse])
def get_by_bill(bill_id: int, db: Session = Depends(get_db),
                current_user: dict = Depends(get_current_user)):
    return get_payments_by_bill(bill_id=bill_id, db=db)


@router.get("/by-invoice/{invoice_id}", response_model=List[PaymentResponse])
def get_by_invoice(invoice_id: int, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    return get_payments_by_invoice(invoice_id=invoice_id, db=db)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_one(payment_id: int, db: Session = Depends(get_db),
            current_user: dict = Depends(get_current_user)):
    return get_payment_by_id(payment_id=payment_id, db=db)


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create(data: PaymentCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return create_payment(data=data, db=db)


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update(payment_id: int, data: PaymentUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_payment(payment_id=payment_id, data=data, db=db)


@router.delete("/{payment_id}", status_code=status.HTTP_200_OK)
def delete(payment_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_payment(payment_id=payment_id, db=db)
