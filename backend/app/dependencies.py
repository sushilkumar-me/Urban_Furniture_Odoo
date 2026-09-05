from typing import Generator

from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from app.database import SessionLocal

# -------------------------------------------------------
# SECRET_KEY and ALGORITHM must match auth_service.py
# We use these to DECODE the token the client sends.
# -------------------------------------------------------
SECRET_KEY = "urban_furniture_super_secret_key_2026"
ALGORITHM  = "HS256"

# OAuth2PasswordBearer tells FastAPI:
#   "Look for a Bearer token in the Authorization header"
#   tokenUrl="/auth/login" is the URL where tokens are issued.
#   This makes the /docs page show an Authorize button
#   so we can test protected endpoints directly from the browser.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---- DATABASE SESSION DEPENDENCY -----------------------
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---- CURRENT USER DEPENDENCY ---------------------------
# This function reads the JWT token from the request header,
# decodes it, and returns the user's info as a dictionary.
#
# FastAPI calls this automatically when a route declares:
#   current_user: dict = Depends(get_current_user)
#
# The token arrives in the Authorization header like this:
#   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
#
# OAuth2PasswordBearer extracts just the token string
# and passes it here as the "token" parameter.
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:

    # We define the error we will raise if anything goes wrong.
    # We define it once here so we use the same message everywhere.
    # 401 = Unauthorized
    # WWW-Authenticate: Bearer tells the client what auth scheme we use
    credentials_error = HTTPException(
        status_code=401,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        # jwt.decode() does three things automatically:
        #   1. Verifies the token was signed with our SECRET_KEY
        #      (if someone tampered with the token, this fails)
        #   2. Checks the "exp" field — if token is expired, this fails
        #   3. Decodes the payload and returns it as a Python dict
        #
        # If any check fails, JWTError is raised and we catch it below.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # "sub" is the standard JWT field for the subject (who the token is for).
        # We stored login_id there in create_access_token().
        login_id: str = payload.get("sub")

        # If there is no "sub" in the token, something is wrong.
        if login_id is None:
            raise credentials_error

        # Ensure email and name exist in payload even for older tokens
        if "email" not in payload or "role" not in payload:
            from app.models.user import User
            from app.database import SessionLocal
            db_session = SessionLocal()
            try:
                user_obj = db_session.query(User).filter(User.login_id == login_id).first()
                if user_obj:
                    payload["email"] = user_obj.email
                    payload["name"] = user_obj.name
                    payload["id"] = user_obj.id
                    payload["role"] = user_obj.role
            finally:
                db_session.close()

    except JWTError:
        raise credentials_error

    return payload


# ---- ROLE CHECK HELPERS ---------------------------------

def require_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    role = current_user.get("role")
    if role != "Admin":
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Admin role required. Your role: {role}"
        )
    return current_user


def require_admin_or_accountant(
    current_user: dict = Depends(get_current_user)
) -> dict:
    role = current_user.get("role")
    if role not in ["Admin", "Accountant"]:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Required role: Admin or Accountant. Your role: {role}"
        )
    return current_user


def require_customer_or_staff(
    current_user: dict = Depends(get_current_user)
) -> dict:
    role = current_user.get("role")
    if role not in ["Customer", "Admin", "Accountant"]:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Customer or staff access required. Your role: {role}"
        )
    return current_user


def require_vendor_or_staff(
    current_user: dict = Depends(get_current_user)
) -> dict:
    role = current_user.get("role")
    if role not in ["Vendor", "Admin", "Accountant"]:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Vendor or staff access required. Your role: {role}"
        )
    return current_user
