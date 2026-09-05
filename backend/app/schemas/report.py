from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


# ---- PROFIT & LOSS SCHEMAS ---------------------------------

class ProfitLossLine(BaseModel):
    account_id:   int
    account_name: str
    account_type: str
    amount:       Decimal

    model_config = {"from_attributes": True}


class ProfitLossCategory(BaseModel):
    category_name: str
    lines:         List[ProfitLossLine] = []
    total:         Decimal = Decimal("0.00")


class ProfitLossReport(BaseModel):
    period_start:          Optional[date] = None
    period_end:            Optional[date] = None
    income:                ProfitLossCategory
    expenses:              ProfitLossCategory
    gross_profit:          Decimal = Decimal("0.00")
    net_profit:            Decimal = Decimal("0.00")
    net_margin_percentage: float = 0.0


# ---- BALANCE SHEET SCHEMAS ---------------------------------

class BalanceSheetLine(BaseModel):
    account_id:   int
    account_name: str
    account_type: str
    balance:      Decimal

    model_config = {"from_attributes": True}


class BalanceSheetSection(BaseModel):
    section_name: str
    lines:        List[BalanceSheetLine] = []
    subtotal:     Decimal = Decimal("0.00")


class BalanceSheetReport(BaseModel):
    as_of_date:                   date
    assets:                       BalanceSheetSection
    liabilities:                  BalanceSheetSection
    equity:                       BalanceSheetSection
    total_assets:                 Decimal = Decimal("0.00")
    total_liabilities:            Decimal = Decimal("0.00")
    total_equity:                 Decimal = Decimal("0.00")
    total_liabilities_and_equity: Decimal = Decimal("0.00")
    is_balanced:                  bool = True
    difference:                   Decimal = Decimal("0.00")


# ---- BUDGET REPORT SCHEMAS ---------------------------------

class BudgetReportItem(BaseModel):
    budget_id:              int
    budget_name:            str
    analytic_account_id:    int
    analytic_name:          str
    start_date:             date
    end_date:               date
    planned_amount:         Decimal
    actual_amount:          Decimal
    variance:               Decimal
    utilization_percentage: float
    status:                 str  # 'Under Budget', 'Near Limit', 'Over Budget'


class BudgetReport(BaseModel):
    items:                          List[BudgetReportItem] = []
    total_planned:                  Decimal = Decimal("0.00")
    total_actual:                   Decimal = Decimal("0.00")
    total_variance:                 Decimal = Decimal("0.00")
    overall_utilization_percentage: float = 0.0
