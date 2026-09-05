from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.services.contact_service import (
    create_contact,
    get_all_contacts,
    get_contact_by_id,
    update_contact,
    delete_contact
)
from app.dependencies import get_db, get_current_user, require_admin_or_accountant

router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"]
)


# GET /contacts/
# Any logged-in user can view all contacts.
# Depends(get_current_user) means:
#   - Request MUST have a valid JWT token in Authorization header
#   - If token missing or invalid → 401 Unauthorized
#   - If token valid → proceeds, current_user contains the decoded token data
@router.get("/", response_model=List[ContactResponse])
def get_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_all_contacts(db=db)


# GET /contacts/{contact_id}
# Any logged-in user can view a single contact.
@router.get("/{contact_id}", response_model=ContactResponse)
def get_one(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_contact_by_id(contact_id=contact_id, db=db)


# POST /contacts/
# Only Admin and Accountant can create contacts.
# Depends(require_admin_or_accountant) means:
#   - First verifies the JWT token (calls get_current_user internally)
#   - Then checks if role is Admin or Accountant
#   - If role is Customer → 403 Forbidden
#   - If role is Admin or Accountant → proceeds
@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return create_contact(data=data, db=db)


# PUT /contacts/{contact_id}
# Only Admin and Accountant can update contacts.
@router.put("/{contact_id}", response_model=ContactResponse)
def update(
    contact_id: int,
    data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return update_contact(contact_id=contact_id, data=data, db=db)


# DELETE /contacts/{contact_id}
# Only Admin and Accountant can delete contacts.
@router.delete("/{contact_id}", status_code=status.HTTP_200_OK)
def delete(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return delete_contact(contact_id=contact_id, db=db)
