from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ---- CategoryCreate ----------------------------------------
# What the client sends when creating a new category.
# Only two fields — name is required, description is optional.
# id and created_at are NOT here because the database
# generates them automatically — the client never sends them.
class CategoryCreate(BaseModel):

    # category_name is required — every category must have a name.
    # pydantic will reject the request if this is missing.
    category_name: str

    # description is optional — category can exist without one.
    # Optional[str] means it can be a string OR None.
    # = None means if the client doesn't send it, it defaults to None.
    description: Optional[str] = None


# ---- CategoryUpdate ----------------------------------------
# What the client sends when updating an existing category.
# BOTH fields are Optional here — the client only sends
# what they want to change. Everything else stays untouched.
#
# Example: client only wants to change the description:
#   { "description": "New description" }
#   → category_name stays exactly as it was
class CategoryUpdate(BaseModel):

    # Optional — client may or may not send this
    category_name: Optional[str] = None

    # Optional — client may or may not send this
    description: Optional[str] = None


# ---- CategoryResponse --------------------------------------
# What the server sends BACK after any operation.
# This is the "safe" view — only includes what the client
# should see. For categories, all fields are safe to expose.
#
# Includes id and created_at which the DB generated.
class CategoryResponse(BaseModel):

    # id: the database primary key
    # returned so the frontend can reference this category later
    # (e.g. when creating a product linked to this category)
    id: int

    # category_name: the name of the category
    category_name: str

    # description: optional, could be None if not provided
    description: Optional[str] = None

    # created_at: when this category was created
    # Optional because theoretically it could be None
    created_at: Optional[datetime] = None

    # from_attributes = True tells pydantic:
    # "you will receive a SQLAlchemy object, not a dict.
    #  Read attributes like category.id, category.category_name etc."
    # Without this, pydantic cannot read SQLAlchemy model objects
    # and would crash with a validation error.
    model_config = {"from_attributes": True}
