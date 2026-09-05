from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


def create_contact(data: ContactCreate, db: Session) -> Contact:

    # Check if a contact with this email already exists.
    # We only check if email was actually provided (not None).
    # If email is None we skip this check — None is not unique.
    if data.email:
        existing = db.query(Contact).filter(
            Contact.email == data.email
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A contact with this email already exists."
            )

    # Check contact_type is valid.
    # PostgreSQL will also enforce this but we give a cleaner error message.
    if data.contact_type not in ["Customer", "Vendor"]:
        raise HTTPException(
            status_code=400,
            detail="contact_type must be 'Customer' or 'Vendor'."
        )

    # Create the Contact object in memory.
    # model_dump() converts the pydantic schema object into a plain
    # Python dictionary: {"name": "John", "email": "j@j.com", ...}
    # **data.model_dump() unpacks that dictionary as keyword arguments.
    # This is equivalent to writing:
    #   Contact(name="John", email="j@j.com", contact_type="Customer", ...)
    # but much shorter — we don't repeat every field name manually.
    new_contact = Contact(**data.model_dump())

    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact


def get_all_contacts(db: Session) -> list:

    # SELECT * FROM contacts ORDER BY created_at DESC
    # .order_by(Contact.created_at.desc()) → newest contacts first
    # This makes the list more useful — most recently added appears at top
    return db.query(Contact).order_by(Contact.created_at.desc()).all()


def get_contact_by_id(contact_id: int, db: Session) -> Contact:

    # SELECT * FROM contacts WHERE id = contact_id LIMIT 1
    contact = db.query(Contact).filter(Contact.id == contact_id).first()

    # If no contact found with this id, return 404 Not Found.
    # 404 means "the resource you asked for does not exist."
    if not contact:
        raise HTTPException(
            status_code=404,
            detail=f"Contact with id {contact_id} not found."
        )

    return contact


def update_contact(contact_id: int, data: ContactUpdate, db: Session) -> Contact:

    # Step 1: Find the existing contact.
    # We reuse get_contact_by_id — it already handles the 404 error.
    contact = get_contact_by_id(contact_id, db)

    # Step 2: Convert the update schema to a dictionary.
    # exclude_unset=True is CRITICAL here.
    # It means: only include fields the client ACTUALLY sent.
    # Fields the client did NOT send are excluded entirely.
    #
    # Example:
    #   Client sends: { "phone": "9876543210" }
    #   data.model_dump(exclude_unset=True) → {"phone": "9876543210"}
    #   (email, name, city etc. are NOT in the dict — client didn't send them)
    #
    # Without exclude_unset=True:
    #   data.model_dump() → {"phone": "9876543210", "name": None, "email": None, ...}
    #   We would overwrite all other fields with None — destroying existing data!
    update_data = data.model_dump(exclude_unset=True)

    # Step 3: If email is being updated, check it's not already taken
    # by a DIFFERENT contact (a different id).
    if "email" in update_data and update_data["email"] is not None:
        existing = db.query(Contact).filter(
            Contact.email == update_data["email"],
            Contact.id != contact_id        # exclude the current contact
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A contact with this email already exists."
            )

    # Step 4: Apply each changed field to the contact object.
    # We loop through the dictionary items (key, value pairs).
    # setattr(object, "field_name", value) sets object.field_name = value
    #
    # Example loop iteration:
    #   key = "phone",  value = "9876543210"
    #   setattr(contact, "phone", "9876543210")
    #   → contact.phone = "9876543210"
    for key, value in update_data.items():
        setattr(contact, key, value)

    # Step 5: Save the changes
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(contact_id: int, db: Session) -> dict:

    # Step 1: Find the contact (404 if not found)
    contact = get_contact_by_id(contact_id, db)

    # Step 2: Delete it from the database.
    # db.delete(contact) marks it for deletion.
    # db.commit() executes the DELETE SQL.
    # SQL: DELETE FROM contacts WHERE id = contact_id
    db.delete(contact)
    db.commit()

    # Step 3: Return a confirmation message.
    # We cannot return the deleted contact (it no longer exists).
    # We return a simple dict with a success message instead.
    return {"message": f"Contact with id {contact_id} deleted successfully."}
