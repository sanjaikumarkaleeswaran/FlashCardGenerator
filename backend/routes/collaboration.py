from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List
from auth import get_current_user
from database import shared_decks_collection, deck_permissions_collection, activity_logs_collection, flashcard_sets_collection, users_collection
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/decks", tags=["collaboration"])

class ShareDeckRequest(BaseModel):
    deck_id: str
    is_public: bool = False

class InviteMemberRequest(BaseModel):
    deck_id: str
    email: EmailStr
    role: str # "viewer", "editor"

@router.post("/share")
async def share_deck(payload: ShareDeckRequest, current_user: dict = Depends(get_current_user)):
    """Convert a private deck into a shared/public deck."""
    deck = await flashcard_sets_collection.find_one({"_id": ObjectId(payload.deck_id), "user_id": str(current_user["_id"])})
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found or you are not the owner.")
    
    shared_record = {
        "deck_id": ObjectId(payload.deck_id),
        "owner_id": current_user["_id"],
        "is_public": payload.is_public,
        "created_at": datetime.now(timezone.utc)
    }
    await shared_decks_collection.update_one(
        {"deck_id": ObjectId(payload.deck_id)},
        {"$set": shared_record},
        upsert=True
    )
    return {"message": "Deck is now shared."}

@router.post("/invite")
async def invite_member(payload: InviteMemberRequest, current_user: dict = Depends(get_current_user)):
    """Invite a user to a shared deck."""
    user = await users_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")
        
    permission_record = {
        "deck_id": ObjectId(payload.deck_id),
        "user_id": user["_id"],
        "role": payload.role,
        "granted_by": current_user["_id"],
        "granted_at": datetime.now(timezone.utc)
    }
    await deck_permissions_collection.update_one(
        {"deck_id": ObjectId(payload.deck_id), "user_id": user["_id"]},
        {"$set": permission_record},
        upsert=True
    )
    
    # Log activity
    await activity_logs_collection.insert_one({
        "deck_id": ObjectId(payload.deck_id),
        "action": "invite",
        "actor_id": current_user["_id"],
        "target_user_id": user["_id"],
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"message": f"User {payload.email} invited as {payload.role}."}

@router.get("/members")
async def get_members(deck_id: str, current_user: dict = Depends(get_current_user)):
    """Get list of members for a shared deck."""
    cursor = deck_permissions_collection.find({"deck_id": ObjectId(deck_id)})
    members = await cursor.to_list(length=100)
    
    results = []
    for m in members:
        user = await users_collection.find_one({"_id": m["user_id"]})
        if user:
            results.append({
                "email": user["email"],
                "role": m["role"],
                "granted_at": str(m["granted_at"])
            })
    return results

@router.get("/activity")
async def get_activity(deck_id: str, current_user: dict = Depends(get_current_user)):
    """Get activity audit log for a shared deck."""
    cursor = activity_logs_collection.find({"deck_id": ObjectId(deck_id)}).sort("timestamp", -1)
    logs = await cursor.to_list(length=50)
    return [{"action": l["action"], "timestamp": str(l["timestamp"])} for l in logs]
