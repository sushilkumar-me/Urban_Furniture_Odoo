from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.schemas.report import (
    ProfitLossReport,
    BalanceSheetReport,
    BudgetReport
)
from app.services.report_service import (
    generate_profit_and_loss,
    generate_balance_sheet,
    generate_budget_report
)
from app.dependencies import get_db, get_current_user

router = APIRouter(prefix="/reports", tags=["Financial Reports"])


@router.get("/profit-and-loss", response_model=ProfitLossReport)
def get_profit_and_loss(
    start_date: Optional[date] = Query(None, description="Start date of accounting period"),
    end_date:   Optional[date] = Query(None, description="End date of accounting period"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return generate_profit_and_loss(db=db, start_date=start_date, end_date=end_date)


@router.get("/balance-sheet", response_model=BalanceSheetReport)
def get_balance_sheet(
    as_of_date: Optional[date] = Query(None, description="As of date for Balance Sheet statement"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return generate_balance_sheet(db=db, as_of_date=as_of_date)


@router.get("/budget-report", response_model=BudgetReport)
def get_budget_report(
    analytic_account_id: Optional[int] = Query(None, description="Optional cost center / analytic account filter"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return generate_budget_report(db=db, analytic_account_id=analytic_account_id)
