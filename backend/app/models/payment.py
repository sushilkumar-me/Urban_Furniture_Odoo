from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id                   = Column(Integer, primary_key=True, index=True)

    # A payment links to EITHER a vendor_bill OR a customer_invoice — never both.
    # This is enforced by the CHECK constraint in PostgreSQL:
    # chk_payment_reference: one must be NOT NULL and the other must be NULL.
    #
    # For Phase 10 (purchase workflow) we use vendor_bill_id.
    # customer_invoice_id will be used in Phase 11 (sales workflow).
    vendor_bill_id       = Column(Integer, ForeignKey("vendor_bills.id"),       nullable=True, index=True)
    # customer_invoice_id will be a FK in Phase 11 when customer_invoices table is built
    # For now it is a plain integer column so the app starts without error
    customer_invoice_id  = Column(Integer, nullable=True, index=True)

    # payment_type:
    #   'Send'    → you are PAYING money out (vendor payment)
    #   'Receive' → you are RECEIVING money in (customer payment)
    payment_type         = Column(String(20), nullable=True)

    # payment_method: how the payment was made
    # e.g. "Bank Transfer", "Cash", "Cheque", "UPI"
    payment_method       = Column(String(30), nullable=True)

    # payment_date: when the payment was actually made
    payment_date         = Column(Date, nullable=False)

    # amount: how much was paid (must be > 0, enforced by CHECK)
    amount               = Column(Numeric(12, 2), nullable=False)

    # note: any additional information about the payment
    note                 = Column(Text, nullable=True)

    created_at           = Column(DateTime, default=func.now())

    # relationships for display
    vendor_bill          = relationship("VendorBill", lazy="joined", foreign_keys=[vendor_bill_id])
