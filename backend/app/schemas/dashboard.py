from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal


class DashboardKPIs(BaseModel):
    total_sales:               Decimal = Decimal("0.00")
    total_purchases:           Decimal = Decimal("0.00")
    net_profit:                Decimal = Decimal("0.00")
    net_margin:                float   = 0.0
    accounts_receivable:       Decimal = Decimal("0.00")
    accounts_payable:          Decimal = Decimal("0.00")
    bank_balance:              Decimal = Decimal("0.00")
    open_sales_orders_count:   int     = 0
    open_purchase_orders_count:int     = 0
    products_count:            int     = 0
    contacts_count:            int     = 0


class MonthlyChartData(BaseModel):
    label:     str
    sales:     float
    purchases: float


class RecentTransactionItem(BaseModel):
    id:           int
    type:         str  # 'Customer Invoice', 'Vendor Bill', 'Payment', 'Journal Entry'
    number:       str
    partner_name: Optional[str] = None
    date:         str
    amount:       float
    status:       str


class DepartmentBudgetProgress(BaseModel):
    department:             str
    planned:                float
    spent:                  float
    utilization_percentage: float


class DashboardSummary(BaseModel):
    kpis:                DashboardKPIs
    chart_data:          List[MonthlyChartData] = []
    budget_progress:     List[DepartmentBudgetProgress] = []
    recent_transactions: List[RecentTransactionItem] = []
