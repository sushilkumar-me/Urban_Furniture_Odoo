from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.vendor_bill import VendorBillCreate, VendorBillUpdate, VendorBillResponse
from app.services.vendor_bill_service import (
    create_vendor_bill, get_all_vendor_bills,
    get_vendor_bills_for_vendor,
    get_vendor_bill_by_id, update_vendor_bill, delete_vendor_bill
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(prefix="/vendor-bills", tags=["Vendor Bills"])


@router.get("/", response_model=List[VendorBillResponse])
def get_all(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Customer":
        raise HTTPException(status_code=403, detail="Access denied. Customers cannot view vendor bills.")
    if role == "Vendor":
        user_email = current_user.get("email") or ""
        return get_vendor_bills_for_vendor(email=user_email, db=db)
    return get_all_vendor_bills(db=db)


@router.get("/{bill_id}", response_model=VendorBillResponse)
def get_one(bill_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "Customer":
        raise HTTPException(status_code=403, detail="Access denied. Customers cannot view vendor bills.")
    bill = get_vendor_bill_by_id(bill_id=bill_id, db=db)
    if role == "Vendor":
        user_email = (current_user.get("email") or "").lower().strip()
        v_email = (bill.purchase_order.vendor.email or "").lower().strip() if bill.purchase_order and bill.purchase_order.vendor else ""
        if user_email != v_email:
            raise HTTPException(status_code=403, detail="Access denied. You can only view your own vendor bills.")
    return bill


@router.post("/", response_model=VendorBillResponse, status_code=status.HTTP_201_CREATED)
def create(data: VendorBillCreate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return create_vendor_bill(data=data, db=db)


@router.patch("/{bill_id}", response_model=VendorBillResponse)
def update(bill_id: int, data: VendorBillUpdate, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return update_vendor_bill(bill_id=bill_id, data=data, db=db)


@router.delete("/{bill_id}", status_code=status.HTTP_200_OK)
def delete(bill_id: int, db: Session = Depends(get_db),
           current_user: dict = Depends(require_admin_or_accountant)):
    return delete_vendor_bill(bill_id=bill_id, db=db)
