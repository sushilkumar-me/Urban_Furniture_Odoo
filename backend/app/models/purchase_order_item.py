from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id                  = Column(Integer, primary_key=True, index=True)

    # FK to purchase_orders — ON DELETE CASCADE means if the PO is deleted,
    # all its items are automatically deleted too.
    purchase_order_id   = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)

    # FK to products — which product is being purchased
    # ON DELETE RESTRICT → cannot delete a product used in a PO
    product_id          = Column(Integer, ForeignKey("products.id"), nullable=False)

    # FK to analytic_accounts — optional cost centre tagging
    # ON DELETE SET NULL → if analytic account is deleted, this field becomes NULL
    # The line item still exists, just loses its cost centre tag
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id"), nullable=True)

    # quantity: how many units we are buying (must be > 0, enforced by CHECK)
    quantity            = Column(Integer, nullable=False)

    # unit_price: price per unit (>= 0, enforced by CHECK)
    unit_price          = Column(Numeric(12, 2), nullable=False)

    # total: quantity × unit_price (calculated and stored)
    # Storing it avoids recalculating on every read
    total               = Column(Numeric(12, 2), nullable=False)

    # relationships: load related objects for display
    purchase_order    = relationship("PurchaseOrder",   back_populates="items",   lazy="select")
    product           = relationship("Product",          lazy="joined")
    analytic_account  = relationship("AnalyticAccount",  lazy="joined")
