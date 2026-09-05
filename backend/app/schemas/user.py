from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Used by the existing Admin "Create User" form
class UserCreate(BaseModel):
    name:     str
    login_id: str
    email:    EmailStr
    password: str
    role:     str


# Used by the existing Login page (login_id + password)
class UserLogin(BaseModel):
    login_id: str
    password: str


# NEW — used by the new Sign In page (email + password)
class UserLoginByEmail(BaseModel):
    email:    EmailStr
    password: str


# NEW — used by the new Sign Up page
# No login_id (auto-generated), no role (defaulted to Customer)
class UserSignUp(BaseModel):
    name:             str
    email:            EmailStr
    password:         str
    confirm_password: str


class UserResponse(BaseModel):
    id:         int
    name:       str
    login_id:   str
    email:      str
    role:       str
    is_active:  bool
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# Extended token response — includes user info so frontend
# can store name, role, and id without decoding the JWT
class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user_id:      int
    user_name:    str
    login_id:     str
    role:         str
