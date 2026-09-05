from fastapi import APIRouter, Depends, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import (
    create_product,
    get_all_products,
    get_product_by_id,
    get_products_by_category,
    update_product,
    delete_product,
    save_product_image
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


# GET /products/
# Returns all products with embedded category info.
# Any logged-in user can view products.
@router.get("/", response_model=List[ProductResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_products(db=db)


# GET /products/by-category/{category_id}
# Returns products filtered by a specific category.
# Useful for the React frontend category filter dropdown.
#
# IMPORTANT: This route MUST be defined BEFORE /{product_id}.
# Why? FastAPI matches routes in ORDER.
# If /{product_id} comes first, FastAPI would try to interpret
# "by-category" as a product_id integer → fails with a 422 error.
# By placing this route BEFORE /{product_id}, FastAPI matches
# the literal string "by-category" first.
@router.get("/by-category/{category_id}", response_model=List[ProductResponse])
def get_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_products_by_category(category_id=category_id, db=db)


# GET /products/{product_id}
# Returns one product by id with embedded category info.
@router.get("/{product_id}", response_model=ProductResponse)
def get_one(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_product_by_id(product_id=product_id, db=db)


# POST /products/
# Creates a new product.
# Only Admin and Accountant can create products.
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_product(data=data, db=db)


# PUT /products/{product_id}
# Updates an existing product (partial update).
# Only Admin and Accountant can update.
@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_product(product_id=product_id, data=data, db=db)


# DELETE /products/{product_id}
# Deletes a product and its image file from disk.
# Only Admin and Accountant can delete.
@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_product(product_id=product_id, db=db)


# POST /products/{product_id}/upload-image
# -------------------------------------------------------
# IMAGE UPLOAD ENDPOINT — completely different from JSON endpoints.
#
# How it works:
#   1. Client sends a multipart/form-data request
#      (a form with a file attached, not JSON)
#   2. FastAPI receives it as an UploadFile object
#   3. We save the file to disk (in the uploads/ folder)
#   4. We update the product's image column with the filename
#   5. Return the updated product
#
# File: UploadFile = File(...)
#   File(...) = this parameter is a file upload field, required
#   UploadFile is FastAPI's type for uploaded files.
#   It has these useful attributes:
#     file.filename → original filename e.g. "sofa.jpg"
#     file.content_type → MIME type e.g. "image/jpeg"
#     file.file → the raw binary stream (what we read/save)
#
# Why separate from the create/update endpoints?
#   File uploads use multipart/form-data content type.
#   JSON endpoints use application/json content type.
#   You cannot mix them in a single endpoint easily.
#   Having a separate upload endpoint is the clean approach.
#
# Only Admin and Accountant can upload images.
@router.post("/{product_id}/upload-image", response_model=ProductResponse)
def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    # Step 1: Verify the product exists (raises 404 if not)
    product = get_product_by_id(product_id=product_id, db=db)

    # Step 2: Save the file to disk, get back the unique filename
    filename = save_product_image(file)

    # Step 3: Update the product's image column with the new filename
    product.image = filename

    # Step 4: Save to database
    db.commit()
    db.refresh(product)

    return product
