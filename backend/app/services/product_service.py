import os
import time
import shutil

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, UploadFile

from app.models.product import Product
from app.models.category import Category
from app.schemas.product import ProductCreate, ProductUpdate

# UPLOAD_DIR: the folder on disk where we save uploaded images.
# os.path.dirname(__file__) → the directory of this file (app/services/)
# We go two levels up to reach backend/, then into uploads/
# So images are saved at:  backend/uploads/filename.jpg
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

# Allowed file extensions for product images.
# We only accept common image formats.
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Allowed product types — must match PostgreSQL CHECK constraint
ALLOWED_TYPES = {"Goods", "Service", "Consumable"}


# ---- IMAGE SAVE FUNCTION -----------------------------------
# Takes an uploaded file object, saves it to disk, returns filename.
# Called by the image upload endpoint in the router.
#
# How we generate a unique filename:
#   time.time() → current timestamp in seconds e.g. 1725432345.123
#   int()       → removes decimal → 1725432345
#   str()       → converts to string → "1725432345"
#   We combine with original extension: "1725432345.jpg"
#   This ensures no two files have the same name (as long as
#   uploads are more than 1 second apart — fine for our use case)
def save_product_image(file: UploadFile) -> str:

    # Get the file extension (.jpg, .png etc.)
    # os.path.splitext("photo.jpg") → ("photo", ".jpg")
    # [1] gives us the extension part → ".jpg"
    ext = os.path.splitext(file.filename)[1].lower()

    # Reject files that are not images
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: jpg, jpeg, png, webp"
        )

    # Build a unique filename using current timestamp
    unique_filename = f"{int(time.time())}{ext}"

    # Build the full path where we save the file on disk
    # os.path.join combines folder path + filename safely
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save the file to disk.
    # shutil.copyfileobj(source, destination) copies bytes
    # from the uploaded file to the opened destination file.
    # "wb" = write binary mode (images are binary, not text)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return only the filename (not the full path).
    # We store this in the database's image column.
    # The full URL is built by the frontend:
    #   http://localhost:8000/uploads/{unique_filename}
    return unique_filename


def create_product(data: ProductCreate, db: Session) -> Product:

    # Validate that the category actually exists.
    # If category_id doesn't match any category in DB → 400 error.
    # Without this, PostgreSQL would throw an IntegrityError (FK violation).
    # We validate early to give a clean, helpful error message.
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=400,
            detail=f"Category with id {data.category_id} does not exist."
        )

    # Validate product_type if provided
    if data.product_type and data.product_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"product_type must be one of: Goods, Service, Consumable"
        )

    # Create the Product object.
    # model_dump() converts the pydantic schema to a dict.
    # **data.model_dump() unpacks it as keyword arguments.
    new_product = Product(**data.model_dump())

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


def get_all_products(db: Session) -> list:

    # SELECT * FROM products ORDER BY created_at DESC
    # The relationship("Category") is loaded automatically
    # because we set lazy="joined" in the model.
    # Each product object will have product.category filled in.
    return db.query(Product).order_by(Product.created_at.desc()).all()


def get_products_by_category(category_id: int, db: Session) -> list:

    # Filter products by category.
    # SELECT * FROM products WHERE category_id = ? ORDER BY created_at DESC
    # Useful for the frontend to show products of one category.
    return db.query(Product).filter(
        Product.category_id == category_id
    ).order_by(Product.created_at.desc()).all()


def get_product_by_id(product_id: int, db: Session) -> Product:

    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product with id {product_id} not found."
        )

    return product


def update_product(product_id: int, data: ProductUpdate, db: Session) -> Product:

    # Get existing product (raises 404 if not found)
    product = get_product_by_id(product_id, db)

    # Only include fields the client actually sent
    update_data = data.model_dump(exclude_unset=True)

    # If category_id is being changed, validate the new category exists
    if "category_id" in update_data:
        category = db.query(Category).filter(
            Category.id == update_data["category_id"]
        ).first()
        if not category:
            raise HTTPException(
                status_code=400,
                detail=f"Category with id {update_data['category_id']} does not exist."
            )

    # Validate product_type if it is being changed
    if "product_type" in update_data and update_data["product_type"] is not None:
        if update_data["product_type"] not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="product_type must be one of: Goods, Service, Consumable"
            )

    # Apply changes using setattr loop
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(product_id: int, db: Session) -> dict:

    product = get_product_by_id(product_id, db)

    # If product has an image file, delete it from disk too.
    # We don't want orphaned image files piling up in uploads/.
    if product.image:
        image_path = os.path.join(UPLOAD_DIR, product.image)
        # os.path.exists() checks if the file actually exists before deleting.
        # Avoids errors if the file was manually removed earlier.
        if os.path.exists(image_path):
            os.remove(image_path)

    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        # If this product is referenced in sales_order_items or purchase_order_items
        # PostgreSQL will block the delete (ON DELETE RESTRICT).
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete '{product.product_name}'. "
                   f"It is linked to orders. Remove those orders first."
        )

    return {"message": f"Product '{product.product_name}' deleted successfully."}
