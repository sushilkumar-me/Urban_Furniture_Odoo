import time
import re
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

from app.models.user import User
from app.schemas.user import UserCreate, UserSignUp

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "urban_furniture_super_secret_key_2026"
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _build_token_response(user: User) -> dict:
    # Central helper — builds the full token response dict.
    # Both login functions return this same structure.
    token = create_access_token(data={
        "sub":   user.login_id,
        "id":    user.id,
        "email": user.email,
        "name":  user.name,
        "role":  user.role
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user_id":      user.id,
        "user_name":    user.name,
        "login_id":     user.login_id,
        "email":        user.email,
        "role":         user.role
    }


# ---- EXISTING: Admin creates a user with explicit login_id and role ----
def register_user(user_data: UserCreate, db: Session) -> User:
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    if db.query(User).filter(User.login_id == user_data.login_id).first():
        raise HTTPException(status_code=400, detail="Login ID already taken.")

    new_user = User(
        name=user_data.name,
        login_id=user_data.login_id,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ---- NEW: Self Sign Up — auto-generates login_id, defaults role to Customer ----
def signup_user(user_data: UserSignUp, db: Session) -> User:

    # Validate passwords match
    if user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Check email uniqueness
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # If custom login_id provided by user, validate uniqueness
    if user_data.login_id and user_data.login_id.strip():
        login_id = user_data.login_id.strip()[:12]
        if db.query(User).filter(User.login_id == login_id).first():
            raise HTTPException(status_code=400, detail="Login ID already taken.")
    else:
        # Auto-generate a unique login_id.
        email_prefix = re.sub(r'[^a-zA-Z0-9]', '', user_data.email.split('@')[0])
        email_prefix = email_prefix[:8].lower()
        suffix       = str(int(time.time()))[-2:]
        login_id     = (email_prefix + suffix)[:12]

        if db.query(User).filter(User.login_id == login_id).first():
            suffix   = str(int(time.time() * 10))[-3:]
            login_id = (email_prefix + suffix)[:12]

    user_name = user_data.name or (user_data.login_id if user_data.login_id else user_data.email.split('@')[0].capitalize())

    new_user = User(
        name=user_name,
        login_id=login_id,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="Customer",    # Sign Up always creates a Customer
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ---- EXISTING: Login with login_id + password ----
def login_user(login_id: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.login_id == login_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid login ID or password.")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid login ID or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact your administrator.")

    return _build_token_response(user)


# ---- NEW: Login with email + password ----
def login_by_email(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact your administrator.")

    return _build_token_response(user)


def get_all_users(db: Session) -> list:
    return db.query(User).order_by(User.id.asc()).all()


def update_user_profile(user_id: int, name: Optional[str], password: Optional[str], db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if name and name.strip():
        user.name = name.strip()
    if password and password.strip():
        user.password_hash = hash_password(password.strip())
    db.commit()
    db.refresh(user)
    return user
