from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

from app.models.user import User
from app.schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "urban_furniture_super_secret_key_2026"
ALGORITHM = "HS256"
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


def login_user(login_id: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.login_id == login_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid login ID or password.")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid login ID or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact your administrator.")

    token = create_access_token(data={
        "sub": user.login_id,
        "id": user.id,
        "role": user.role
    })

    return {"access_token": token, "token_type": "bearer"}


def get_all_users(db: Session) -> list:
    return db.query(User).all()
