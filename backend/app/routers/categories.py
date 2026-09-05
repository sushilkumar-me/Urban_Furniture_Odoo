from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import (
    create_category,
    get_all_categories,
    get_category_by_id,
    update_category,
    delete_category
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

# APIRouter groups all category routes together.
# prefix="/categories" → every route here starts with /categories
# tags=["Categories"]  → groups them under "Categories" in /docs
router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


# GET /categories/
# Returns all categories ordered alphabetically.
# Any logged-in user can view categories.
# We need the list in the Products form — even Customers need to read it.
@router.get("/", response_model=List[CategoryResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_categories(db=db)


# GET /categories/{category_id}
# Returns one category by its id.
# {category_id} is a path parameter — FastAPI reads it from the URL.
# Any logged-in user can read a single category.
@router.get("/{category_id}", response_model=CategoryResponse)
def get_one(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_category_by_id(category_id=category_id, db=db)


# POST /categories/
# Creates a new category.
# Only Admin and Accountant can create categories.
# require_admin_or_accountant checks the JWT token role.
# If role is Customer → 403 Forbidden
# If role is Admin or Accountant → proceeds
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_category(data=data, db=db)


# PUT /categories/{category_id}
# Updates an existing category.
# Sends only the fields that changed (partial update).
# Only Admin and Accountant can update.
@router.put("/{category_id}", response_model=CategoryResponse)
def update(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_category(category_id=category_id, data=data, db=db)


# DELETE /categories/{category_id}
# Deletes a category.
# Will fail with 400 if products are linked to this category.
# Only Admin and Accountant can delete.
@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_category(category_id=category_id, db=db)
