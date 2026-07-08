from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import get_current_user
from database import flashcard_sets_collection, anki_sync_collection
from bson import ObjectId
import io
import csv
from datetime import datetime, timezone

router = APIRouter(prefix="/anki", tags=["anki"])

class SyncPayload(BaseModel):
    deck_name: str
    cards: list

@router.get("/export")
async def export_anki(set_id: str, format: str = "csv", current_user: dict = Depends(get_current_user)):
    """Export a deck to Anki format (CSV)."""
    deck = await flashcard_sets_collection.find_one({"_id": ObjectId(set_id), "user_id": str(current_user["_id"])})
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output, delimiter='\t')
        
        for card in deck.get("cards", []):
            q = card.get("question", "").replace('\n', ' ')
            a = card.get("answer", "").replace('\n', ' ')
            writer.writerow([q, a])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={deck.get('title', 'deck')}_anki.txt"}
        )
    
    raise HTTPException(status_code=400, detail="Unsupported format.")

@router.post("/import")
async def import_anki(deck_name: str = "Imported Deck", file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Import Anki cards from CSV text file."""
    content = await file.read()
    text = content.decode('utf-8')
    reader = csv.reader(io.StringIO(text), delimiter='\t')
    
    cards = []
    for row in reader:
        if len(row) >= 2:
            cards.append({
                "id": str(ObjectId()),
                "type": "qa",
                "question": row[0],
                "answer": row[1],
                "difficulty": "medium",
                "ease_factor": 2.5,
                "interval": 0,
                "repetitions": 0,
                "next_review": datetime.now(timezone.utc).isoformat()
            })
            
    deck_record = {
        "user_id": str(current_user["_id"]),
        "title": deck_name,
        "description": "Imported from Anki",
        "cards": cards,
        "created_at": datetime.now(timezone.utc),
        "is_shared": False
    }
    
    res = await flashcard_sets_collection.insert_one(deck_record)
    return {"message": "Import successful", "set_id": str(res.inserted_id), "cards_imported": len(cards)}

@router.post("/sync")
async def sync_anki(payload: SyncPayload, current_user: dict = Depends(get_current_user)):
    """Sync via AnkiConnect API proxy placeholder."""
    # Register sync history
    sync_record = {
        "user_id": current_user["_id"],
        "deck_name": payload.deck_name,
        "cards_synced": len(payload.cards),
        "timestamp": datetime.now(timezone.utc)
    }
    await anki_sync_collection.insert_one(sync_record)
    
    return {"message": "Anki sync logged successfully.", "status": "ok"}
