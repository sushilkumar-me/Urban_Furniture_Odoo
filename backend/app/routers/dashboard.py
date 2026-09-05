from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import get_dashboard_summary
from app.dependencies import get_db, get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns executive dashboard metrics:
    - High-level KPIs (Sales, Purchases, Net Profit, Receivables, Payables, Bank Balance)
    - Monthly time-series chart data (Sales vs Purchases)
    - Departmental budget progress gauges
    - Chronological recent transactions across all operational modules
    """
    return get_dashboard_summary(db=db)
