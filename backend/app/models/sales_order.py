from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id           = Column(Integer, primary_key=True, index=True)
    customer_id  = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    so_number    = Column(String(30), unique=True, nullable=False)
    so_date      = Column(Date, nullable=False)
    status       = Column(String(20), nullable=False, default="Draft")
    total_amount = Column(Numeric(12, 2), nullable=True, default=0)
    created_at   = Column(DateTime, default=func.now())

    # Relationships
    customer = relationship("Contact", lazy="joined", foreign_keys=[customer_id])
    creator  = relationship("User",    lazy="joined", foreign_keys=[created_by])
    items    = relationship("SalesOrderItem", back_populates="sales_order", lazy="select")
