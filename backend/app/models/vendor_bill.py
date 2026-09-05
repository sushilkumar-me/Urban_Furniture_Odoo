from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VendorBill(Base):
    __tablename__ = "vendor_bills"

    id                  = Column(Integer, primary_key=True, index=True)

    # purchase_order_id: which PO this bill is for
    # UNIQUE → one PO can only have ONE vendor bill
    # ON DELETE RESTRICT → cannot delete a PO that has a bill
    purchase_order_id   = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, unique=True)

    # bill_number: vendor's own invoice number e.g. "WCRAFT-INV-001"
    bill_number         = Column(String(30), unique=True, nullable=False)

    # bill_date: the date on the vendor's invoice
    bill_date           = Column(Date, nullable=False)

    # due_date: when payment must be made by (optional)
    due_date            = Column(Date, nullable=True)

    # status lifecycle:
    #   Draft  → received but not reviewed
    #   Posted → reviewed and approved, payment can be made
    #   Paid   → payment has been recorded
    status              = Column(String(20), nullable=False, default="Draft")

    # total_amount: copied from the linked PO total
    total_amount        = Column(Numeric(12, 2), nullable=True, default=0)

    created_at          = Column(DateTime, default=func.now())

    # load the full PO data when a bill is fetched
    purchase_order      = relationship("PurchaseOrder", lazy="joined")
