from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timezone
import jwt
from pydantic import BaseModel, EmailStr, Field
from database import users_collection
from auth import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
from models.user import UserRegister, UserLogin, Token, UserResponse
from services.rate_limiter import limiter
import re

router = APIRouter()

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token string.")

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")  # Hardened rate limiting for registration
async def register(user_data: UserRegister, request: Request):
    """Register a new student account."""
    # Input sanitization and validation
    email_clean = user_data.email.strip().lower()
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    # Check if user already exists
    existing_user = await users_collection.find_one({"email": email_clean})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered."
        )

    # Hash password and prepare user document
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "email": email_clean,
        "password_hash": hashed_pw,
        "created_at": datetime.now(timezone.utc),
        "refresh_tokens": [],
        "settings": {}
    }

    result = await users_collection.insert_one(user_doc)
    return {
        "message": "User registered successfully.",
        "userId": str(result.inserted_id)
    }

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")  # Hardened login rate limits
async def login(credentials: UserLogin, request: Request):
    """Authenticate student and return access token + refresh token."""
    email_clean = credentials.email.strip().lower()
    user = await users_collection.find_one({"email": email_clean})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWTs
    access = create_access_token(data={"sub": user["email"]})
    refresh = create_refresh_token(data={"sub": user["email"]})

    # Save refresh token in database (rotating list)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$push": {"refresh_tokens": refresh}}
    )

    return {"access_token": access, "token_type": "bearer", "refresh_token": refresh}

@router.post("/auth/refresh", response_model=Token)
async def refresh_tokens(payload: RefreshTokenRequest):
    """Rotate the refresh token and issue a new access token."""
    token = payload.refresh_token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
    )
    try:
        from auth import JWT_SECRET, ALGORITHM
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        email = decoded.get("sub")
        token_type = decoded.get("type")
        if email is None or token_type != "refresh":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await users_collection.find_one({"email": email})
    if not user:
        raise credentials_exception

    # Check if refresh token is in valid list
    tokens_list = user.get("refresh_tokens", [])
    if token not in tokens_list:
        # Token reuse detected! Invalidate all refresh tokens for security.
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"refresh_tokens": []}}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. All sessions revoked for safety.",
        )

    # Issue new access + refresh tokens
    new_access = create_access_token(data={"sub": email})
    new_refresh = create_refresh_token(data={"sub": email})

    # Rotate tokens: swap old for new
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$pull": {"refresh_tokens": token}}
    )
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$push": {"refresh_tokens": new_refresh}}
    )

    return {
        "access_token": new_access,
        "token_type": "bearer",
        "refresh_token": new_refresh
    }

@router.post("/auth/logout")
async def logout(payload: RefreshTokenRequest, current_user: dict = Depends(get_current_user)):
    """Logout by invalidating/removing the user's refresh token from the database."""
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"refresh_tokens": payload.refresh_token}}
    )
    return {"message": "Logged out successfully."}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the profile information of the current authenticated user."""
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "created_at": current_user.get("created_at")
    }
