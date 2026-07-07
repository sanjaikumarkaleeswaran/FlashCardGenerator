from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Password must be between 8 and 128 characters.")

    class Config:
        extra = "forbid"  # Reject unexpected fields

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    class Config:
        extra = "forbid"  # Reject unexpected fields

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "60c72b2f9b1d8e25d88f61a1",
                "email": "student@example.com",
                "created_at": "2026-06-30T15:47:19Z"
            }
        }
