from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id                  = Column(Integer, primary_key=True, index=True)
    sales_order_id      = Column(Integer, ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id          = Column(Integer, ForeignKey("products.id"), nullable=False)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id", ondelete="SET NULL"), nullable=True)
    quantity            = Column(Integer, nullable=False)
    unit_price          = Column(Numeric(12, 2), nullable=False)
    total               = Column(Numeric(12, 2), nullable=False)

    sales_order      = relationship("SalesOrder", back_populates="items", lazy="select")
    product          = relationship("Product", lazy="joined")
    analytic_account = relationship("AnalyticAccount", lazy="joined")
