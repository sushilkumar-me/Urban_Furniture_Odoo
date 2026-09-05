from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.models.account import Account
from app.models.journal_entry import JournalEntry
from app.models.journal_entry_item import JournalEntryItem
from app.models.customer_invoice import CustomerInvoice
from app.models.vendor_bill import VendorBill
from app.models.payment import Payment
from app.models.budget import Budget
from app.models.analytic_account import AnalyticAccount

from app.schemas.report import (
    ProfitLossReport,
    ProfitLossCategory,
    ProfitLossLine,
    BalanceSheetReport,
    BalanceSheetSection,
    BalanceSheetLine,
    BudgetReport,
    BudgetReportItem
)


# ---- 1. PROFIT & LOSS SERVICE ------------------------------

def generate_profit_and_loss(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> ProfitLossReport:
    """
    Generates Profit & Loss Statement (Income Statement).
    Revenues (Income) vs Expenses over a specified accounting period.
    """
    # 1. Base query for posted journal entry items
    je_filter = [JournalEntry.status == "Posted"]
    if start_date:
        je_filter.append(JournalEntry.entry_date >= start_date)
    if end_date:
        je_filter.append(JournalEntry.entry_date <= end_date)

    # Aggregations by account from posted journal entries
    je_items = (
        db.query(
            JournalEntryItem.account_id,
            func.coalesce(func.sum(JournalEntryItem.debit), 0).label("total_debit"),
            func.coalesce(func.sum(JournalEntryItem.credit), 0).label("total_credit")
        )
        .join(JournalEntry, JournalEntry.id == JournalEntryItem.journal_entry_id)
        .filter(and_(*je_filter))
        .group_by(JournalEntryItem.account_id)
        .all()
    )
    je_map = {row.account_id: (Decimal(str(row.total_debit)), Decimal(str(row.total_credit))) for row in je_items}

    # 2. Also check Customer Invoices (Posted) for direct sales revenue
    ci_filter = [CustomerInvoice.status.in_(["Posted", "Paid"])]
    if start_date:
        ci_filter.append(CustomerInvoice.invoice_date >= start_date)
    if end_date:
        ci_filter.append(CustomerInvoice.invoice_date <= end_date)

    ci_total = (
        db.query(func.coalesce(func.sum(CustomerInvoice.total_amount), 0))
        .filter(and_(*ci_filter))
        .scalar()
    )
    invoiced_revenue = Decimal(str(ci_total or 0))

    # 3. Check Vendor Bills (Posted/Paid) for direct purchase costs
    vb_filter = [VendorBill.status.in_(["Posted", "Paid"])]
    if start_date:
        vb_filter.append(VendorBill.bill_date >= start_date)
    if end_date:
        vb_filter.append(VendorBill.bill_date <= end_date)

    vb_total = (
        db.query(func.coalesce(func.sum(VendorBill.total_amount), 0))
        .filter(and_(*vb_filter))
        .scalar()
    )
    billed_purchases = Decimal(str(vb_total or 0))

    # 4. Fetch all Chart of Accounts
    accounts = db.query(Account).order_by(Account.account_name).all()

    income_lines = []
    expense_lines = []
    total_income = Decimal("0.00")
    total_expenses = Decimal("0.00")
    cogs_amount = Decimal("0.00")

    sales_rev_account_included = False
    purchase_cost_account_included = False

    for acc in accounts:
        deb, cred = je_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        # Revenue / Income Accounts: Normal balance is (Credit - Debit)
        if acc.account_type in ("Revenue", "Income"):
            net_income = cred - deb
            if acc.account_name == "Sales Revenue" and invoiced_revenue > 0:
                net_income += invoiced_revenue
                sales_rev_account_included = True

            if net_income != Decimal("0.00"):
                income_lines.append(
                    ProfitLossLine(
                        account_id=acc.id,
                        account_name=acc.account_name,
                        account_type=acc.account_type,
                        amount=net_income
                    )
                )
                total_income += net_income

        # Expense Accounts: Normal balance is (Debit - Credit)
        elif acc.account_type in ("Expense", "Expenses", "Other Expenses"):
            net_expense = deb - cred
            if acc.account_name == "Purchase Cost" and billed_purchases > 0:
                net_expense += billed_purchases
                purchase_cost_account_included = True
                cogs_amount += net_expense

            if net_expense != Decimal("0.00"):
                expense_lines.append(
                    ProfitLossLine(
                        account_id=acc.id,
                        account_name=acc.account_name,
                        account_type=acc.account_type,
                        amount=net_expense
                    )
                )
                total_expenses += net_expense

    # If Sales Revenue account wasn't mapped but invoices exist
    if not sales_rev_account_included and invoiced_revenue > 0:
        income_lines.append(
            ProfitLossLine(
                account_id=10,
                account_name="Sales Revenue (Customer Invoices)",
                account_type="Revenue",
                amount=invoiced_revenue
            )
        )
        total_income += invoiced_revenue

    # If Purchase Cost account wasn't mapped but bills exist
    if not purchase_cost_account_included and billed_purchases > 0:
        expense_lines.append(
            ProfitLossLine(
                account_id=12,
                account_name="Cost of Goods Sold (Vendor Bills)",
                account_type="Expense",
                amount=billed_purchases
            )
        )
        total_expenses += billed_purchases
        cogs_amount += billed_purchases

    gross_profit = total_income - cogs_amount
    net_profit = total_income - total_expenses
    margin_pct = float(round((net_profit / total_income * 100), 2)) if total_income > Decimal("0.00") else 0.0

    return ProfitLossReport(
        period_start=start_date,
        period_end=end_date,
        income=ProfitLossCategory(
            category_name="Revenues & Operating Income",
            lines=income_lines,
            total=total_income
        ),
        expenses=ProfitLossCategory(
            category_name="Operating & Administrative Expenses",
            lines=expense_lines,
            total=total_expenses
        ),
        gross_profit=gross_profit,
        net_profit=net_profit,
        net_margin_percentage=margin_pct
    )


# ---- 2. BALANCE SHEET SERVICE ------------------------------

def generate_balance_sheet(
    db: Session,
    as_of_date: Optional[date] = None
) -> BalanceSheetReport:
    """
    Generates Balance Sheet statement as of a specific date.
    Assets = Liabilities + Equity (including current period retained earnings).
    """
    if as_of_date is None:
        as_of_date = date.today()

    # 1. Aggregate posted journal entry items up to as_of_date
    je_items = (
        db.query(
            JournalEntryItem.account_id,
            func.coalesce(func.sum(JournalEntryItem.debit), 0).label("total_debit"),
            func.coalesce(func.sum(JournalEntryItem.credit), 0).label("total_credit")
        )
        .join(JournalEntry, JournalEntry.id == JournalEntryItem.journal_entry_id)
        .filter(and_(JournalEntry.status == "Posted", JournalEntry.entry_date <= as_of_date))
        .group_by(JournalEntryItem.account_id)
        .all()
    )
    je_map = {row.account_id: (Decimal(str(row.total_debit)), Decimal(str(row.total_credit))) for row in je_items}

    # 2. Unpaid Customer Invoices (Accounts Receivable = Invoiced - Payments Received)
    unpaid_invoices = (
        db.query(func.coalesce(func.sum(CustomerInvoice.total_amount), 0))
        .filter(and_(CustomerInvoice.status == "Posted", CustomerInvoice.invoice_date <= as_of_date))
        .scalar()
    )
    paid_on_posted_invs = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(CustomerInvoice, CustomerInvoice.id == Payment.customer_invoice_id)
        .filter(and_(CustomerInvoice.status == "Posted", Payment.payment_date <= as_of_date))
        .scalar()
    )
    ar_extra = Decimal(str(unpaid_invoices or 0)) - Decimal(str(paid_on_posted_invs or 0))

    # 3. Unpaid Vendor Bills (Accounts Payable = Billed - Payments Disbursed)
    unpaid_bills = (
        db.query(func.coalesce(func.sum(VendorBill.total_amount), 0))
        .filter(and_(VendorBill.status == "Posted", VendorBill.bill_date <= as_of_date))
        .scalar()
    )
    paid_on_posted_bills = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(VendorBill, VendorBill.id == Payment.vendor_bill_id)
        .filter(and_(VendorBill.status == "Posted", Payment.payment_date <= as_of_date))
        .scalar()
    )
    ap_extra = Decimal(str(unpaid_bills or 0)) - Decimal(str(paid_on_posted_bills or 0))

    # 4. Bank Payments (Cash Inflows & Outflows)
    received_payments = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(and_(Payment.payment_type == "Receive", Payment.payment_date <= as_of_date))
        .scalar()
    )
    sent_payments = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(and_(Payment.payment_type == "Send", Payment.payment_date <= as_of_date))
        .scalar()
    )
    net_bank_payments = Decimal(str(received_payments or 0)) - Decimal(str(sent_payments or 0))

    # 5. Accounts breakdown
    accounts = db.query(Account).order_by(Account.account_name).all()

    asset_lines = []
    liability_lines = []
    equity_lines = []

    total_assets = Decimal("0.00")
    total_liabilities = Decimal("0.00")
    total_equity = Decimal("0.00")

    bank_handled = False
    ar_handled = False
    ap_handled = False

    for acc in accounts:
        deb, cred = je_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        # Assets: Normal balance is (Debit - Credit)
        if acc.account_type in ("Asset", "Assets", "Bank", "Cash"):
            bal = deb - cred
            if "Bank" in acc.account_name and not bank_handled:
                bal += net_bank_payments
                bank_handled = True
            elif "Receivable" in acc.account_name and not ar_handled:
                bal += ar_extra
                ar_handled = True

            if bal != Decimal("0.00"):
                asset_lines.append(
                    BalanceSheetLine(
                        account_id=acc.id,
                        account_name=acc.account_name,
                        account_type=acc.account_type,
                        balance=bal
                    )
                )
                total_assets += bal

        # Liabilities: Normal balance is (Credit - Debit)
        elif acc.account_type in ("Liability", "Liabilities"):
            bal = cred - deb
            if "Payable" in acc.account_name and not ap_handled:
                bal += ap_extra
                ap_handled = True

            if bal != Decimal("0.00"):
                liability_lines.append(
                    BalanceSheetLine(
                        account_id=acc.id,
                        account_name=acc.account_name,
                        account_type=acc.account_type,
                        balance=bal
                    )
                )
                total_liabilities += bal

        # Equity: Normal balance is (Credit - Debit)
        elif acc.account_type in ("Equity", "Capital"):
            bal = cred - deb
            if bal != Decimal("0.00"):
                equity_lines.append(
                    BalanceSheetLine(
                        account_id=acc.id,
                        account_name=acc.account_name,
                        account_type=acc.account_type,
                        balance=bal
                    )
                )
                total_equity += bal

    # 6. Current Year Net Profit transferred to Equity
    pnl = generate_profit_and_loss(db, end_date=as_of_date)
    current_earnings = pnl.net_profit

    if current_earnings != Decimal("0.00"):
        equity_lines.append(
            BalanceSheetLine(
                account_id=0,
                account_name="Current Period Net Earnings (from P&L)",
                account_type="Equity",
                balance=current_earnings
            )
        )
        total_equity += current_earnings

    total_liabilities_and_equity = total_liabilities + total_equity
    difference = total_assets - total_liabilities_and_equity
    is_balanced = abs(difference) < Decimal("0.01")

    return BalanceSheetReport(
        as_of_date=as_of_date,
        assets=BalanceSheetSection(
            section_name="Assets (Current & Non-Current)",
            lines=asset_lines,
            subtotal=total_assets
        ),
        liabilities=BalanceSheetSection(
            section_name="Liabilities (Current & Long-Term)",
            lines=liability_lines,
            subtotal=total_liabilities
        ),
        equity=BalanceSheetSection(
            section_name="Equity & Retained Earnings",
            lines=equity_lines,
            subtotal=total_equity
        ),
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        total_equity=total_equity,
        total_liabilities_and_equity=total_liabilities_and_equity,
        is_balanced=is_balanced,
        difference=difference
    )


# ---- 3. BUDGET REPORT SERVICE ------------------------------

def generate_budget_report(
    db: Session,
    analytic_account_id: Optional[int] = None
) -> BudgetReport:
    """
    Generates Budget vs Actual Performance Report.
    Measures allocated spending against actual expenses incurred across cost centers.
    """
    query = db.query(Budget)
    if analytic_account_id:
        query = query.filter(Budget.analytic_account_id == analytic_account_id)

    budgets = query.order_by(Budget.start_date.desc()).all()

    report_items = []
    total_planned = Decimal("0.00")
    total_actual = Decimal("0.00")

    for b in budgets:
        planned = Decimal(str(b.planned_amount))
        total_planned += planned

        # Calculate actual expenses within the budget period
        # 1. Vendor bills created in this period
        vb_spent = (
            db.query(func.coalesce(func.sum(VendorBill.total_amount), 0))
            .filter(and_(
                VendorBill.bill_date >= b.start_date,
                VendorBill.bill_date <= b.end_date,
                VendorBill.status.in_(["Posted", "Paid"])
            ))
            .scalar()
        )
        actual = Decimal(str(vb_spent or 0))

        # 2. Add any posted expense journal entries during that period
        je_spent = (
            db.query(func.coalesce(func.sum(JournalEntryItem.debit), 0))
            .join(JournalEntry, JournalEntry.id == JournalEntryItem.journal_entry_id)
            .join(Account, Account.id == JournalEntryItem.account_id)
            .filter(and_(
                JournalEntry.status == "Posted",
                JournalEntry.entry_date >= b.start_date,
                JournalEntry.entry_date <= b.end_date,
                Account.account_type == "Expense"
            ))
            .scalar()
        )
        actual += Decimal(str(je_spent or 0))

        total_actual += actual
        variance = planned - actual
        utilization = float(round((actual / planned * 100), 2)) if planned > Decimal("0.00") else 0.0

        if utilization > 100.0:
            status_label = "Over Budget"
        elif utilization >= 80.0:
            status_label = "Near Limit"
        else:
            status_label = "Under Budget"

        report_items.append(
            BudgetReportItem(
                budget_id=b.id,
                budget_name=b.budget_name,
                analytic_account_id=b.analytic_account_id,
                analytic_name=b.analytic_account.analytic_name if b.analytic_account else f"Cost Center #{b.analytic_account_id}",
                start_date=b.start_date,
                end_date=b.end_date,
                planned_amount=planned,
                actual_amount=actual,
                variance=variance,
                utilization_percentage=utilization,
                status=status_label
            )
        )

    total_variance = total_planned - total_actual
    overall_utilization = float(round((total_actual / total_planned * 100), 2)) if total_planned > Decimal("0.00") else 0.0

    return BudgetReport(
        items=report_items,
        total_planned=total_planned,
        total_actual=total_actual,
        total_variance=total_variance,
        overall_utilization_percentage=overall_utilization
    )
