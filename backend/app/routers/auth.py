from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.user import (
    UserCreate, UserLogin, UserLoginByEmail,
    UserSignUp, UserProfileUpdate, UserResponse, TokenResponse
)
from app.services.auth_service import (
    register_user, signup_user,
    login_user, login_by_email,
    get_all_users, update_user_profile
)
from app.dependencies import get_db, get_current_user, require_admin, require_admin_or_accountant

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# Admin creates a user with explicit login_id and role (Restricted to Admin only)
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return register_user(user_data=user_data, db=db)


# Public self-registration — auto login_id, role=Customer
@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignUp, db: Session = Depends(get_db)):
    return signup_user(user_data=user_data, db=db)


# Login with login_id + password
@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    return login_user(
        login_id=login_data.login_id,
        password=login_data.password,
        db=db
    )


# Login with email + password
@router.post("/login-by-email", response_model=TokenResponse)
def login_email(login_data: UserLoginByEmail, db: Session = Depends(get_db)):
    return login_by_email(
        email=login_data.email,
        password=login_data.password,
        db=db
    )


# Current User Identity Inspection
@router.get("/me")
def get_current_user_profile(
    current_user: dict = Depends(get_current_user)
):
    return current_user


# User Profile Update (Customer, Vendor, Staff)
@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return update_user_profile(
        user_id=current_user["id"],
        name=data.name,
        password=data.password,
        db=db
    )


@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_accountant)
):
    return get_all_users(db=db)
