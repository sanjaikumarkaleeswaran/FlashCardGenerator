# backend/routes/settings.py

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
import uuid
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from database import users_collection
from auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api", tags=["settings"])

class PromptTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    instruction: str

class StudyPreferences(BaseModel):
    starting_ease_factor: float = 2.5
    interval_multiplier: float = 1.0
    daily_goal: int = 20
    max_reviews_per_day: int = 100

class UserSettingsUpdateRequest(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    preferred_model: Optional[str] = None
    study_preferences: Optional[StudyPreferences] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class ProfileUpdateRequest(BaseModel):
    email: Optional[str] = None

DEFAULT_SETTINGS = {
    "preferred_model": "llama-3.1-8b-instant",
    "theme": "dark",
    "language": "en",
    "study_preferences": {
        "starting_ease_factor": 2.5,
        "interval_multiplier": 1.0,
        "daily_goal": 20,
        "max_reviews_per_day": 100
    },
    "custom_prompts": [
        {"id": "default-1", "name": "ELI5", "instruction": "Explain concepts like I am five years old."},
        {"id": "default-2", "name": "Focus on formulas", "instruction": "Highlight equations, physical laws, and mathematical derivations."},
        {"id": "default-3", "name": "Interview questions", "instruction": "Structure questions to sound like mock technical job interview prompts."}
    ]
}

@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Fetch current user's profile preferences and custom templates."""
    settings = current_user.get("settings", {})
    
    # Merge defaults for missing fields to preserve compatibility
    merged = {
        "preferred_model": settings.get("preferred_model", DEFAULT_SETTINGS["preferred_model"]),
        "theme": settings.get("theme", DEFAULT_SETTINGS["theme"]),
        "language": settings.get("language", DEFAULT_SETTINGS["language"]),
        "custom_prompts": settings.get("custom_prompts", DEFAULT_SETTINGS["custom_prompts"]),
        "study_preferences": {
            **DEFAULT_SETTINGS["study_preferences"],
            **settings.get("study_preferences", {})
        }
    }
    
    return {
        "profile": {
            "id": str(current_user["_id"]),
            "email": current_user["email"],
            "created_at": current_user.get("created_at")
        },
        "settings": merged
    }

@router.put("/settings")
async def update_settings(payload: UserSettingsUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update settings (theme, language, preferred AI model, spaced repetition parameters)."""
    current_settings = current_user.get("settings", {})
    
    if payload.theme is not None:
        current_settings["theme"] = payload.theme
    if payload.language is not None:
        current_settings["language"] = payload.language
    if payload.preferred_model is not None:
        current_settings["preferred_model"] = payload.preferred_model
        
    if payload.study_preferences is not None:
        current_prefs = current_settings.get("study_preferences", {})
        if payload.study_preferences.starting_ease_factor is not None:
            current_prefs["starting_ease_factor"] = payload.study_preferences.starting_ease_factor
        if payload.study_preferences.interval_multiplier is not None:
            current_prefs["interval_multiplier"] = payload.study_preferences.interval_multiplier
        if payload.study_preferences.daily_goal is not None:
            current_prefs["daily_goal"] = payload.study_preferences.daily_goal
        if payload.study_preferences.max_reviews_per_day is not None:
            current_prefs["max_reviews_per_day"] = payload.study_preferences.max_reviews_per_day
        current_settings["study_preferences"] = current_prefs

    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"settings": current_settings}}
    )
    return {"message": "Settings updated successfully.", "settings": current_settings}

@router.get("/models")
async def list_available_models():
    """List supported Groq inference models for flashcard generation."""
    return {
        "models": [
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B (Fast, default)", "developer": "Meta"},
            {"id": "gemma-2-9b-it", "name": "Gemma 2 9B (Conceptual, high-quality)", "developer": "Google"},
            {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B (Complex reasoning)", "developer": "Mistral AI"}
        ]
    }

@router.post("/settings/prompts")
async def add_custom_prompt(prompt: PromptTemplate, current_user: dict = Depends(get_current_user)):
    """Save a new custom instruction prompt template."""
    settings = current_user.get("settings", {})
    prompts = settings.get("custom_prompts", list(DEFAULT_SETTINGS["custom_prompts"]))
    
    new_prompt = {
        "id": str(uuid.uuid4()),
        "name": prompt.name.strip(),
        "instruction": prompt.instruction.strip()
    }
    prompts.append(new_prompt)
    settings["custom_prompts"] = prompts
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"settings": settings}}
    )
    return {"message": "Custom prompt added successfully.", "prompt": new_prompt}

@router.delete("/settings/prompts/{prompt_id}")
async def delete_custom_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a custom instruction prompt template."""
    settings = current_user.get("settings", {})
    prompts = settings.get("custom_prompts", list(DEFAULT_SETTINGS["custom_prompts"]))
    
    filtered_prompts = [p for p in prompts if p["id"] != prompt_id]
    settings["custom_prompts"] = filtered_prompts
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"settings": settings}}
    )
    return {"message": "Custom prompt deleted successfully."}

@router.put("/settings/password")
async def change_password(payload: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    """Change current authenticated user's password."""
    if not verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
        
    hashed = hash_password(payload.new_password)
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": hashed}}
    )
    return {"message": "Password changed successfully."}

@router.put("/settings/profile")
async def update_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update profile credentials."""
    if not payload.email or not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email cannot be empty.")
        
    email_clean = payload.email.strip().lower()
    
    # Check duplicate
    if email_clean != current_user["email"]:
        existing = await users_collection.find_one({"email": email_clean})
        if existing:
            raise HTTPException(status_code=400, detail="Email is already registered by another account.")
            
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"email": email_clean}}
        )
        
    return {"message": "Profile updated successfully.", "email": email_clean}
