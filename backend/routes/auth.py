from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from database import users_collection
from auth import hash_password, verify_password, create_access_token, get_current_user
from models.user import UserRegister, UserLogin, Token, UserResponse

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register a new student account."""
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered."
        )

    # Hash password and prepare user document
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "email": user_data.email,
        "password_hash": hashed_pw,
        "created_at": datetime.now(timezone.utc)
    }

    result = await users_collection.insert_one(user_doc)
    return {
        "message": "User registered successfully.",
        "userId": str(result.inserted_id)
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate student and return access token."""
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT
    token = create_access_token(data={"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the profile information of the current authenticated user."""
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "created_at": current_user["created_at"]
    }
