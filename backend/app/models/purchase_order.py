from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id            = Column(Integer, primary_key=True, index=True)

    # vendor_id: the supplier we are buying from
    # Must be a Contact with contact_type = 'Vendor'
    # ON DELETE RESTRICT → cannot delete a vendor who has purchase orders
    vendor_id     = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)

    # created_by: which user created this PO
    # ON DELETE RESTRICT → cannot delete a user who created POs
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # po_number: unique identifier for this purchase order e.g. "PO-2026-001"
    po_number     = Column(String(30), unique=True, nullable=False)

    # po_date: the date this purchase order was raised
    po_date       = Column(Date, nullable=False)

    # status: lifecycle of a PO
    #   Draft     → created but not yet sent to vendor
    #   Confirmed → sent and accepted
    #   Cancelled → abandoned
    # CHECK constraint enforced by PostgreSQL
    status        = Column(String(20), nullable=False, default="Draft")

    # total_amount: sum of all line item totals
    # Updated automatically when items are added/changed
    total_amount  = Column(Numeric(12, 2), nullable=True, default=0)

    created_at    = Column(DateTime, default=func.now())

    # relationships: load vendor and creator info in one JOIN
    vendor        = relationship("Contact",  lazy="joined", foreign_keys=[vendor_id])
    creator       = relationship("User",     lazy="joined", foreign_keys=[created_by])

    # items: loads all line items for this PO
    # lazy="select" means items are loaded separately when accessed
    # This avoids loading all items for every PO in a list query
    items         = relationship("PurchaseOrderItem", back_populates="purchase_order", lazy="select")
