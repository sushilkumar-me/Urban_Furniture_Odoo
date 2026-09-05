from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ---- CategoryNested ----------------------------------------
# This is a NESTED schema — it is used INSIDE ProductResponse.
# When we return a product, we embed this object to show the
# full category information, not just the category_id number.
#
# We only include the fields the frontend actually needs.
# from_attributes=True is required because it reads from a
# SQLAlchemy Category object (not a dict).
class CategoryNested(BaseModel):
    id: int
    category_name: str

    model_config = {"from_attributes": True}


# ---- ProductCreate -----------------------------------------
# What the client sends to CREATE a new product.
# Required: category_id, product_name, sales_price, cost_price
# Optional: product_type, image (image is set by upload endpoint)
class ProductCreate(BaseModel):

    # category_id: the id of the category this product belongs to.
    # The client picks from the categories dropdown in the React form.
    # If the id doesn't exist in categories table → PostgreSQL rejects it.
    category_id: int

    # product_name: required, the display name of the product
    product_name: str

    # product_type: optional, must be one of the allowed values.
    # PostgreSQL CHECK constraint enforces: Goods, Service, Consumable
    product_type: Optional[str] = None

    # sales_price and cost_price: use float in the schema.
    # Python float is easy to work with and pydantic converts it
    # to the Decimal type that PostgreSQL Numeric column needs.
    sales_price: float
    cost_price: float

    # image: optional filename string.
    # Usually set separately via the image upload endpoint.
    # Can be included here if the product already has an image path.
    image: Optional[str] = None

    # field_validator ensures prices are never negative.
    # @field_validator("sales_price", "cost_price") means this
    # validator runs for BOTH fields.
    # "v" is the value being validated.
    # If v < 0 we raise ValueError — pydantic converts this to a 422 error.
    @field_validator("sales_price", "cost_price")
    @classmethod
    def price_must_be_positive(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative.")
        return v


# ---- ProductUpdate -----------------------------------------
# What the client sends to UPDATE a product.
# ALL fields are Optional — client only sends what changed.
class ProductUpdate(BaseModel):
    category_id:  Optional[int]   = None
    product_name: Optional[str]   = None
    product_type: Optional[str]   = None
    sales_price:  Optional[float] = None
    cost_price:   Optional[float] = None
    image:        Optional[str]   = None

    # Same price validation — only runs if the value was actually sent
    @field_validator("sales_price", "cost_price", mode="before")
    @classmethod
    def price_must_be_positive(cls, v):
        # v can be None here (field not sent) — we skip validation for None
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative.")
        return v


# ---- ProductResponse ---------------------------------------
# What the server sends BACK about a product.
# Includes the nested category object — not just category_id.
class ProductResponse(BaseModel):
    id: int
    category_id: int

    # category: the NESTED CategoryNested schema.
    # Because the Product model has relationship("Category"),
    # SQLAlchemy fills this automatically when loading a product.
    # pydantic reads it using from_attributes=True.
    # Optional because in edge cases the category might not load.
    category: Optional[CategoryNested] = None

    product_name: str
    product_type: Optional[str] = None

    # sales_price and cost_price come back as Python Decimal
    # from the database. We type them as Decimal here.
    # pydantic serializes Decimal to a number in JSON automatically.
    sales_price: Decimal
    cost_price:  Decimal

    # image: the filename stored in the DB.
    # Frontend uses this to build the full URL:
    #   http://localhost:8000/uploads/{image}
    image: Optional[str] = None

    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
