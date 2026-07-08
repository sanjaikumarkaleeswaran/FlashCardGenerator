from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from auth import get_current_user
from database import sync_history_collection, flashcard_sets_collection
from datetime import datetime, timezone
import json
from bson import ObjectId

router = APIRouter()

class SyncPayload(BaseModel):
    last_sync: str
    operations: List[Dict[str, Any]]

@router.post("/sync")
async def offline_sync(payload: SyncPayload, current_user: dict = Depends(get_current_user)):
    """Synchronize offline reviews and operations."""
    try:
        user_id = current_user["_id"]
        
        # Process operations (latest timestamp wins logic)
        for op in payload.operations:
            op_type = op.get("type")
            data = op.get("data", {})
            
            if op_type == "REVIEW_UPDATE":
                # Example: updating SM-2 values
                card_id = data.get("card_id")
                set_id = data.get("set_id")
                ease_factor = data.get("ease_factor")
                interval = data.get("interval")
                repetitions = data.get("repetitions")
                next_review = data.get("next_review")
                
                # Perform the DB update if this operation's timestamp is newer than DB's
                # For simplicity, assuming all offline operations are applied directly
                if card_id and set_id:
                    await flashcard_sets_collection.update_one(
                        {"_id": ObjectId(set_id), "user_id": str(user_id), "cards.id": card_id},
                        {"$set": {
                            "cards.$.ease_factor": ease_factor,
                            "cards.$.interval": interval,
                            "cards.$.repetitions": repetitions,
                            "cards.$.next_review": next_review,
                        }}
                    )

        # Log sync history
        sync_record = {
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc),
            "operations_count": len(payload.operations)
        }
        await sync_history_collection.insert_one(sync_record)

        return {"message": "Sync successful", "status": "ok", "synced_operations": len(payload.operations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def offline_status(current_user: dict = Depends(get_current_user)):
    """Check sync status and return the latest server state timestamp."""
    user_id = current_user["_id"]
    last_sync = await sync_history_collection.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    
    return {
        "status": "online",
        "last_sync": str(last_sync["timestamp"]) if last_sync else None
    }
