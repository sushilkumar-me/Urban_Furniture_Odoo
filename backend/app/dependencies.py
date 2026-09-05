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

    except JWTError:
        # JWTError covers: invalid signature, expired token, malformed token.
        # In all cases we return the same 401 error — we don't tell the
        # client WHY the token failed (security best practice).
        raise credentials_error

    # Return the user's info extracted from the token.
    # The route function receives this as its "current_user" parameter.
    # It contains everything we put in the token during login:
    #   {"sub": "ADMIN001", "id": 1, "role": "Admin", "exp": ...}
    return payload


# ---- ROLE CHECK HELPER ---------------------------------
# This dependency builds ON TOP of get_current_user.
# It first gets the current user (verifies token),
# then checks if their role is allowed to perform the action.
#
# Usage in a router:
#   def create(..., current_user: dict = Depends(require_admin_or_accountant)):
#
# Allowed roles: Admin and Accountant
# Blocked roles: Customer
#
# WHY block Customer?
#   Customers should not be able to create, edit, or delete
#   contacts in the company's accounting system.
#   Only internal staff (Admin and Accountant) should do that.
def require_admin_or_accountant(
    current_user: dict = Depends(get_current_user)
) -> dict:

    # Extract the role from the decoded token payload
    role = current_user.get("role")

    # Check if the role is in the allowed list
    if role not in ["Admin", "Accountant"]:
        raise HTTPException(
            status_code=403,   # 403 = Forbidden (you are logged in but not allowed)
            detail=f"Access denied. Required role: Admin or Accountant. Your role: {role}"
        )

    # If role is allowed, return the user so the route can use it if needed
    return current_user
