from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from typing import List
from database import flashcard_sets_collection
from auth import get_current_user
from models.flashcard import (
    Flashcard,
    FlashcardGenerateRequest,
    ReviewUpdateRequest,
    FlashcardSetResponse
)
from services.nlp_generator import generate_flashcards, get_nlp

router = APIRouter()

@router.post("/flashcards/generate", response_model=FlashcardSetResponse, status_code=status.HTTP_201_CREATED)
async def generate_set(payload: FlashcardGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate a new set of flashcards from study notes using local spaCy parsing."""
    notes_text = payload.notes.strip()
    
    # Validation: Min 30 characters
    if len(notes_text) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Study notes must be at least 30 characters long to generate high-quality cards."
        )
        
    # Generate cards using NLP service
    cards_data = generate_flashcards(notes_text)
    if not cards_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate any flashcards. Please provide longer notes with full sentences."
        )
        
    # Construct a smart title from the first sentence
    engine = get_nlp()
    title = "Study Notes"
    if engine:
        doc = engine(notes_text[:200])
        sents = list(doc.sents)
        if sents:
            first_sent = sents[0].text.strip()
            # Clean first sentence
            title = first_sent[:40] + "..." if len(first_sent) > 40 else first_sent
            title = re_clean_title(title)
    else:
        # Simple fallback title
        first_line = notes_text.split(".")[0].strip()
        title = first_line[:40] + "..." if len(first_line) > 40 else first_line
        title = re_clean_title(title)

    # Prepare cards
    cards = []
    for c in cards_data:
        cards.append(Flashcard(
            question=c["question"],
            answer=c["answer"],
            difficulty=c["difficulty"]
        ))
        
    # Save set to MongoDB
    set_doc = {
        "user_id": str(current_user["_id"]),
        "title": title,
        "notes": notes_text,
        "created_at": datetime.now(timezone.utc),
        "cards": [card.dict() for card in cards]
    }
    
    result = await flashcard_sets_collection.insert_one(set_doc)
    
    return {
        "id": str(result.inserted_id),
        "title": title,
        "notes": notes_text,
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
            # Add context keys for UI rendering
            card_info["setId"] = set_id
            card_info["setTitle"] = set_title
            
            # Ensure proper datetime parsing if needed
            if isinstance(card_info["created_at"], str):
                try:
                    card_info["created_at"] = datetime.fromisoformat(card_info["created_at"].replace("Z", "+00:00"))
                except ValueError:
                    card_info["created_at"] = datetime.now(timezone.utc)
            all_cards.append(card_info)
            
    # Sort review items: highest priority first, then newest first
    all_cards.sort(key=lambda x: (x.get("priority", 0), x.get("created_at", datetime.now(timezone.utc))), reverse=True)
    return all_cards

@router.post("/review/update")
async def update_review_status(payload: ReviewUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update a flashcard's review status and recalculate spaced repetition priority."""
    # Find set containing card
    set_doc = await flashcard_sets_collection.find_one({
        "user_id": str(current_user["_id"]),
        "cards.id": payload.cardId
    })
    
    if not set_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found."
        )
        
    # Extract card details
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
        
    # Calculate updated spacing priority and review counts
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
        
    # Update nested object in MongoDB using positional ($) operator
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
    # remove double spaces
    title = " ".join(title.split())
    # remove trailing dots if they doubled
    title = title.replace(".....", "...").replace("....", "...")
    return title
