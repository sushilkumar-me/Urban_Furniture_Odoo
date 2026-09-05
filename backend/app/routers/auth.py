from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import register_user, login_user, get_all_users
from app.dependencies import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    return register_user(user_data=user_data, db=db)

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    return login_user(
        login_id=login_data.login_id,
        password=login_data.password,
        db=db
    )

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return get_all_users(db=db)
