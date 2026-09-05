from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.dashboard import (
    DashboardSummary,
    CustomerDashboardSummary,
    VendorDashboardSummary
)
from app.services.dashboard_service import (
    get_dashboard_summary,
    get_customer_dashboard_summary,
    get_vendor_dashboard_summary
)
from app.dependencies import (
    get_db, get_current_user,
    require_admin_or_accountant
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# Executive Dashboard for Admin and Accountant
@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return get_dashboard_summary(db=db)


# Dedicated Portal Dashboard for Customers
@router.get("/customer-summary", response_model=CustomerDashboardSummary)
def get_customer_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["Customer", "Admin", "Accountant"]:
        raise HTTPException(status_code=403, detail="Access denied. Customer dashboard requires Customer role.")
    email = current_user.get("email") or ""
    return get_customer_dashboard_summary(email=email, db=db)


# Dedicated Portal Dashboard for Vendors
@router.get("/vendor-summary", response_model=VendorDashboardSummary)
def get_vendor_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["Vendor", "Admin", "Accountant"]:
        raise HTTPException(status_code=403, detail="Access denied. Vendor dashboard requires Vendor role.")
    email = current_user.get("email") or ""
    return get_vendor_dashboard_summary(email=email, db=db)
