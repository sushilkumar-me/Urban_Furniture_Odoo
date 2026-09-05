from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def create_category(data: CategoryCreate, db: Session) -> Category:

    # Check if a category with this name already exists.
    # category_name has a UNIQUE constraint in PostgreSQL.
    # We check manually first to give a clean error message.
    # If we skipped this, PostgreSQL would throw an IntegrityError
    # which is harder to convert into a user-friendly message.
    existing = db.query(Category).filter(
        Category.category_name == data.category_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Category '{data.category_name}' already exists."
        )

    # Create the Category object using model_dump().
    # data.model_dump() converts the pydantic schema to a dict:
    #   {"category_name": "Sofas", "description": "All sofa types"}
    # **data.model_dump() unpacks it as keyword arguments.
    # Equivalent to: Category(category_name="Sofas", description="...")
    new_category = Category(**data.model_dump())

    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


def get_all_categories(db: Session) -> list:

    # SELECT * FROM categories ORDER BY category_name ASC
    # We order alphabetically by name — makes the dropdown lists
    # in the Products form easier to navigate.
    return db.query(Category).order_by(Category.category_name.asc()).all()


def get_category_by_id(category_id: int, db: Session) -> Category:

    # SELECT * FROM categories WHERE id = category_id LIMIT 1
    category = db.query(Category).filter(Category.id == category_id).first()

    # 404 if not found — standard REST convention
    if not category:
        raise HTTPException(
            status_code=404,
            detail=f"Category with id {category_id} not found."
        )

    return category


def update_category(category_id: int, data: CategoryUpdate, db: Session) -> Category:

    # Step 1: Get the existing category (raises 404 if not found)
    category = get_category_by_id(category_id, db)

    # Step 2: Get only the fields the client actually sent.
    # exclude_unset=True → if client sends {"description": "New desc"},
    # we only get {"description": "New desc"} — not all fields with None.
    # Without this, we would overwrite category_name with None.
    update_data = data.model_dump(exclude_unset=True)

    # Step 3: If category_name is being changed, check it's not taken
    # by a DIFFERENT category (exclude the current one by id).
    if "category_name" in update_data:
        existing = db.query(Category).filter(
            Category.category_name == update_data["category_name"],
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Category '{update_data['category_name']}' already exists."
            )

    # Step 4: Apply each changed field using setattr.
    # setattr(category, "category_name", "New Name")
    # is the same as: category.category_name = "New Name"
    # We use a loop because we don't know which fields were sent.
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(category_id: int, db: Session) -> dict:

    # Step 1: Get the existing category (raises 404 if not found)
    category = get_category_by_id(category_id, db)

    # Step 2: Try to delete.
    # We wrap in try/except because PostgreSQL will BLOCK the delete
    # if any product is using this category (ON DELETE RESTRICT).
    # Without this, the app would crash with an ugly 500 error.
    # We catch it and return a clean 400 error with a helpful message.
    try:
        db.delete(category)
        db.commit()

    except IntegrityError:
        # IntegrityError = PostgreSQL rejected the delete
        # because products are linked to this category.
        # db.rollback() undoes the failed transaction so
        # the session stays clean for future queries.
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{category.category_name}'. "
                   f"It is linked to one or more products. "
                   f"Remove or reassign those products first."
        )

    return {
        "message": f"Category '{category.category_name}' deleted successfully."
    }
