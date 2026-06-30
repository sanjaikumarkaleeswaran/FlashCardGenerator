from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from typing import List
from bson import ObjectId
import uuid
import re
from database import flashcard_sets_collection, documents_collection
from auth import get_current_user
from models.flashcard import (
    Flashcard,
    FlashcardGenerateRequest,
    ReviewUpdateRequest,
    FlashcardSetResponse,
    FlashcardSetRenameRequest,
    FlashcardCreateRequest,
    FlashcardUpdateRequest
)
from services.nlp_generator import generate_flashcards_upgraded, get_nlp

router = APIRouter()

@router.post("/flashcards/generate", response_model=FlashcardSetResponse, status_code=status.HTTP_201_CREATED)
async def generate_set(payload: FlashcardGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate a new set of flashcards from study notes or an uploaded document."""
    text = ""
    source_type = "text"
    filename = ""
    
    # 1. Resolve source text and type
    if payload.source:
        try:
            doc_obj_id = ObjectId(payload.source)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid document ID format."
            )
            
        doc_record = await documents_collection.find_one({
            "_id": doc_obj_id,
            "user_id": current_user["_id"]
        })
        if not doc_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source document not found or access denied."
            )
            
        text = doc_record.get("extracted_text", "").strip()
        filename = doc_record.get("filename", "document")
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        source_type = ext if ext in ["pdf", "docx", "txt"] else "txt"
    elif payload.notes:
        text = payload.notes.strip()
        source_type = "text"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide study notes text or reference a valid uploaded document ID."
        )

    # 2. Validation
    if len(text) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source content must be at least 30 characters long to generate high-quality cards."
        )

    # 3. Generate cards using NLP service
    cards_data = generate_flashcards_upgraded(text, payload.count, payload.type)
    if not cards_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate any flashcards from the provided content. Ensure it contains factual sentences."
        )

    # 4. Construct title
    if filename:
        base_name = filename.rsplit(".", 1)[0]
        title = f"{base_name} ({payload.type.upper()})"
    else:
        # Construct title from first sentence
        engine = get_nlp()
        title = "Study Notes"
        if engine:
            doc = engine(text[:200])
            sents = list(doc.sents)
            if sents:
                first_sent = sents[0].text.strip()
                title = first_sent[:40] + "..." if len(first_sent) > 40 else first_sent
                title = re_clean_title(title)
        else:
            first_line = text.split(".")[0].strip()
            title = first_line[:40] + "..." if len(first_line) > 40 else first_line
            title = re_clean_title(title)

    # 5. Build Flashcard objects
    cards = []
    for c in cards_data:
        cards.append(Flashcard(
            id=str(uuid.uuid4()),
            type=c.get("type", payload.type),
            question=c["question"],
            answer=c["answer"],
            options=c.get("options", []),
            difficulty=c["difficulty"],
            status="not_known",
            reviewCount=0,
            priority=0,
            created_at=datetime.utcnow()
        ))

    # 6. Save set to MongoDB
    set_doc = {
        "user_id": str(current_user["_id"]),
        "title": title,
        "notes": text,
        "source_type": source_type,
        "flashcard_type": payload.type,
        "created_at": datetime.now(timezone.utc),
        "cards": [card.dict() for card in cards]
    }
    
    result = await flashcard_sets_collection.insert_one(set_doc)

    return {
        "id": str(result.inserted_id),
        "title": title,
        "notes": text,
        "source_type": source_type,
        "flashcard_type": payload.type,
        "created_at": set_doc["created_at"],
        "cards": cards,
        "card_count": len(cards)
    }

@router.get("/flashcards", response_model=List[FlashcardSetResponse])
async def list_sets(current_user: dict = Depends(get_current_user)):
    """Retrieve all flashcard sets created by the current user."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    sets_db = await cursor.to_list(length=100)
    
    response = []
    for s in sets_db:
        cards_list = [Flashcard(**c) for c in s.get("cards", [])]
        response.append({
            "id": str(s["_id"]),
            "title": s.get("title", "Untitled Set"),
            "notes": s.get("notes", ""),
            "source_type": s.get("source_type", "text"),
            "flashcard_type": s.get("flashcard_type", "qa"),
            "created_at": s.get("created_at", datetime.now(timezone.utc)),
            "cards": cards_list,
            "card_count": len(cards_list)
        })
    return response

@router.get("/review")
async def get_review_queue(current_user: dict = Depends(get_current_user)):
    """Fetch all flashcards for the current user, sorted by priority (spaced repetition) and creation date."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    all_cards = []
    for s in sets_db:
        set_id = str(s["_id"])
        set_title = s.get("title", "Untitled Set")
        for c in s.get("cards", []):
            card_info = dict(c)
            card_info["setId"] = set_id
            card_info["setTitle"] = set_title
            
            if isinstance(card_info["created_at"], str):
                try:
                    card_info["created_at"] = datetime.fromisoformat(card_info["created_at"].replace("Z", "+00:00"))
                except ValueError:
                    card_info["created_at"] = datetime.now(timezone.utc)
            all_cards.append(card_info)
            
    # Sort: highest priority first, then newest first
    all_cards.sort(key=lambda x: (x.get("priority", 0), x.get("created_at", datetime.now(timezone.utc))), reverse=True)
    return all_cards

@router.post("/review/update")
async def update_review_status(payload: ReviewUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update a flashcard's review status and recalculate spaced repetition priority."""
    set_doc = await flashcard_sets_collection.find_one({
        "user_id": str(current_user["_id"]),
        "cards.id": payload.cardId
    })
    
    if not set_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found."
        )
        
    target_card = None
    for card in set_doc["cards"]:
        if card["id"] == payload.cardId:
            target_card = card
            break
            
    if not target_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found."
        )
        
    current_priority = target_card.get("priority", 0)
    current_review_count = target_card.get("reviewCount", 0)
    
    new_review_count = current_review_count + 1
    if payload.status == "not_known":
        new_priority = current_priority + 2
    elif payload.status == "known":
        new_priority = max(0, current_priority - 1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'known' or 'not_known'."
        )
        
    await flashcard_sets_collection.update_one(
        {
            "user_id": str(current_user["_id"]),
            "cards.id": payload.cardId
        },
        {
            "$set": {
                "cards.$.status": payload.status,
                "cards.$.priority": new_priority,
                "cards.$.reviewCount": new_review_count
            }
        }
    )
    
    return {
        "message": "Card updated successfully.",
        "cardId": payload.cardId,
        "newPriority": new_priority,
        "newReviewCount": new_review_count
    }

def re_clean_title(title: str) -> str:
    """Utility helper to clean title string."""
    title = title.strip()
    title = title.replace("\n", " ").replace("\r", " ")
    title = " ".join(title.split())
    title = title.replace(".....", "...").replace("....", "...")
    return title

@router.put("/flashcards/set/{set_id}")
async def rename_set(set_id: str, payload: FlashcardSetRenameRequest, current_user: dict = Depends(get_current_user)):
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
    
    result = await flashcard_sets_collection.update_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"])},
        {"$set": {"title": re_clean_title(payload.title)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
    return {"message": "Set renamed successfully."}

@router.delete("/flashcards/set/{set_id}")
async def delete_set(set_id: str, current_user: dict = Depends(get_current_user)):
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    result = await flashcard_sets_collection.delete_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
    return {"message": "Set deleted successfully."}

@router.post("/flashcards/set/{set_id}/card")
async def add_card(set_id: str, payload: FlashcardCreateRequest, current_user: dict = Depends(get_current_user)):
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    new_card = {
        "id": str(uuid.uuid4()),
        "type": payload.type,
        "question": payload.question.strip(),
        "answer": payload.answer.strip(),
        "options": payload.options,
        "difficulty": payload.difficulty,
        "status": "not_known",
        "reviewCount": 0,
        "priority": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await flashcard_sets_collection.update_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"])},
        {
            "$push": {"cards": new_card},
            "$inc": {"card_count": 1}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
    return new_card

@router.put("/flashcards/set/{set_id}/card/{card_id}")
async def edit_card(set_id: str, card_id: str, payload: FlashcardUpdateRequest, current_user: dict = Depends(get_current_user)):
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    update_fields = {}
    if payload.question is not None:
        update_fields["cards.$.question"] = payload.question.strip()
    if payload.answer is not None:
        update_fields["cards.$.answer"] = payload.answer.strip()
    if payload.options is not None:
        update_fields["cards.$.options"] = payload.options
    if payload.difficulty is not None:
        update_fields["cards.$.difficulty"] = payload.difficulty
        
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided for update.")
        
    result = await flashcard_sets_collection.update_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"]), "cards.id": card_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card or Set not found.")
    return {"message": "Card updated successfully."}

@router.delete("/flashcards/set/{set_id}/card/{card_id}")
async def delete_card(set_id: str, card_id: str, current_user: dict = Depends(get_current_user)):
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    result = await flashcard_sets_collection.update_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"])},
        {
            "$pull": {"cards": {"id": card_id}},
            "$inc": {"card_count": -1}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
    return {"message": "Card deleted successfully."}
