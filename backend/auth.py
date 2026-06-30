import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from dotenv import load_dotenv
from database import users_collection

load_dotenv()

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_dev_key_1234567890_flashcard")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

import bcrypt

# Use API URL for token retrieval
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def hash_password(password: str) -> str:
    """Return the hashed password."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed version."""
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT token for the user."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency to retrieve the currently logged-in user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user
