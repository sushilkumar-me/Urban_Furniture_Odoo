from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id                  = Column(Integer, primary_key=True, index=True)

    # FK to analytic_accounts.id
    # Every budget must belong to an analytic account (cost center / project).
    # ON DELETE RESTRICT → cannot delete an analytic account if budgets use it.
    analytic_account_id = Column(
        Integer,
        ForeignKey("analytic_accounts.id"),
        nullable=False,
        index=True
    )

    budget_name         = Column(String(150), nullable=False)

    # Date (not DateTime) → stores only YYYY-MM-DD, no time component.
    # Used for budget period: start_date to end_date.
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=False)

    # planned_amount: the budgeted/planned spending for this period.
    # Numeric(12,2) → exact decimal, no float rounding errors.
    # CHECK constraint in PostgreSQL ensures planned_amount >= 0.
    planned_amount      = Column(Numeric(12, 2), nullable=False)

    # responsible_person: the name of who manages this budget.
    # Optional — a budget can exist without a named owner.
    responsible_person  = Column(String(100), nullable=True)

    created_at          = Column(DateTime, default=func.now())

    # relationship: loads the AnalyticAccount object automatically.
    # budget.analytic_account.analytic_name → "Sofa Department"
    # lazy="joined" → single SQL JOIN query, not a separate query.
    analytic_account    = relationship("AnalyticAccount", lazy="joined")
