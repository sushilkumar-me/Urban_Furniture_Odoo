from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CustomerInvoice(Base):
    __tablename__ = "customer_invoices"

    id             = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False, unique=True)
    invoice_number = Column(String(30), unique=True, nullable=False)
    invoice_date   = Column(Date, nullable=False)
    due_date       = Column(Date, nullable=True)
    status         = Column(String(20), nullable=False, default="Draft")
    total_amount   = Column(Numeric(12, 2), nullable=True, default=0)
    created_at     = Column(DateTime, default=func.now())

    sales_order = relationship("SalesOrder", lazy="joined")
