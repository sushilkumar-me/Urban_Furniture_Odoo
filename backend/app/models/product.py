from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Product(Base):

    __tablename__ = "products"

    # id: auto-generated primary key
    id = Column(Integer, primary_key=True, index=True)

    # ---- FOREIGN KEY ----------------------------------------
    # category_id stores the id of the category this product belongs to.
    #
    # ForeignKey("categories.id") tells SQLAlchemy:
    #   "this column must contain a value that EXISTS in the
    #    id column of the categories table"
    #
    # If you try to insert a product with category_id = 999
    # and no category with id=999 exists → PostgreSQL rejects it.
    #
    # nullable=False → every product MUST belong to a category.
    # index=True → we often filter products by category,
    #              index makes that query faster.
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)

    # product_name: required, max 150 characters
    product_name = Column(String(150), nullable=False)

    # product_type: optional, allowed values enforced by PostgreSQL CHECK:
    #   'Goods'       → physical items (sofa, table, chair)
    #   'Service'     → services (assembly, delivery, repair)
    #   'Consumable'  → items that get used up (polish, cushion covers)
    # We don't re-define the CHECK here — it lives in PostgreSQL already.
    product_type = Column(String(30), nullable=True)

    # sales_price: what we SELL the product for to customers.
    # Numeric(12, 2) → up to 12 digits total, 2 after the decimal point.
    # Example: 999999999.99 (max value)
    # nullable=False → every product must have a selling price
    sales_price = Column(Numeric(12, 2), nullable=False)

    # cost_price: what we PAID to acquire/produce this product.
    # Used to calculate profit: sales_price - cost_price = profit
    # nullable=False → every product must have a cost price
    cost_price = Column(Numeric(12, 2), nullable=False)

    # image: stores the FILENAME of the uploaded image, not the image itself.
    # Example: "sofa_image_1725432345.jpg"
    # The actual image file is stored in the /uploads folder on disk.
    # We store only the filename so we can build the URL:
    #   http://localhost:8000/uploads/sofa_image_1725432345.jpg
    # nullable=True → product can exist without an image
    image = Column(String(255), nullable=True)

    # created_at: automatically set to current timestamp on insert
    created_at = Column(DateTime, default=func.now())

    # ---- RELATIONSHIP ----------------------------------------
    # relationship("Category") creates a Python-level link between
    # Product and Category models.
    #
    # After this, you can write:
    #   product.category              → the full Category object
    #   product.category.category_name → "Sofas"
    #   product.category.id           → 1
    #
    # SQLAlchemy uses category_id (the FK column above) to know
    # WHICH category to load. It runs a JOIN automatically.
    #
    # back_populates="products":
    #   This creates the REVERSE relationship on the Category model.
    #   It means from a Category you can also access:
    #     category.products → a list of all products in that category
    #   For back_populates to work, Category model must also declare:
    #     products = relationship("Product", back_populates="category")
    #   We don't need that for Phase 6, so we skip it here.
    #   Using lazy="joined" means SQLAlchemy loads the category data
    #   in the SAME query as the product (one SQL JOIN) — not a separate query.
    category = relationship("Category", lazy="joined")
