# ============================================================
# models/__init__.py
# Registers all database models so SQLAlchemy mappers always resolve
# ============================================================

from app.models.user import User
from app.models.contact import Contact
from app.models.category import Category
from app.models.product import Product
from app.models.account import Account
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry
from app.models.journal_entry_item import JournalEntryItem
from app.models.analytic_account import AnalyticAccount
from app.models.budget import Budget
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.vendor_bill import VendorBill
from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.customer_invoice import CustomerInvoice
from app.models.payment import Payment

__all__ = [
    "User",
    "Contact",
    "Category",
    "Product",
    "Account",
    "Journal",
    "JournalEntry",
    "JournalEntryItem",
    "AnalyticAccount",
    "Budget",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "VendorBill",
    "SalesOrder",
    "SalesOrderItem",
    "CustomerInvoice",
    "Payment"
]
