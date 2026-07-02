# backend/routes/flashcards.py

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional
from bson import ObjectId
import uuid
import re
import csv
import io
from database import flashcard_sets_collection, documents_collection, users_collection
from auth import get_current_user
from models.flashcard import (
    Flashcard,
    FlashcardGenerateRequest,
    ReviewUpdateRequest,
    FlashcardSetResponse,
    FlashcardSetRenameRequest,
    FlashcardCreateRequest,
    FlashcardUpdateRequest,
    SM2ReviewUpdateRequest
)
from services.nlp_generator import generate_flashcards_upgraded, get_nlp
from services.ai_flashcard_generator import generate_smart_flashcards
from services.encryption import encrypt_text, decrypt_text
from services.rate_limiter import limiter
from pydantic import BaseModel

router = APIRouter()

# --- SM-2 Core Algorithm Utility ---
def calculate_sm2(quality: int, repetitions: int, interval: int, ease_factor: float) -> Tuple[int, int, float]:
    """
    Core SM-2 Spaced Repetition Algorithm.
    Returns: (new_repetitions, new_interval, new_ease_factor)
    """
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        repetitions += 1

    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease_factor = max(1.3, ease_factor)
    return repetitions, interval, ease_factor

@router.post("/flashcards/generate", response_model=FlashcardSetResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def generate_set(request: Request, payload: FlashcardGenerateRequest, current_user: dict = Depends(get_current_user)):
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
        # Decrypt document source text if encrypted
        if doc_record.get("is_encrypted"):
            text = decrypt_text(text)
            
        filename = doc_record.get("filename", "document")
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        source_type = ext if ext in ["pdf", "docx", "txt", "pptx", "png", "jpg", "jpeg"] else "txt"
    elif payload.content:
        text = payload.content.strip()
        source_type = "text"
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

    # 3. Resolve preferred AI model & custom instructions from User settings
    user_settings = current_user.get("settings", {})
    model_to_use = payload.model or user_settings.get("preferred_model", "llama-3.1-8b-instant")
    
    custom_instructions = payload.custom_instructions
    if payload.custom_prompt_id:
        user_prompts = user_settings.get("custom_prompts", [])
        for p in user_prompts:
            if p["id"] == payload.custom_prompt_id:
                custom_instructions = p["instruction"]
                break

    # 4. Generate cards using upgraded AI flashcard generator
    try:
        cards_data, generation_method, generation_model = generate_smart_flashcards(
            text, 
            payload.type, 
            payload.count, 
            payload.difficulty or "medium",
            model=model_to_use,
            custom_instructions=custom_instructions
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"AI generation pipeline failed completely: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate flashcards: {str(e)}"
        )
        
    if not cards_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate any flashcards from the provided content. Ensure it contains factual sentences."
        )

    # 5. Construct title
    if filename:
        base_name = filename.rsplit(".", 1)[0]
        title = f"{base_name} ({payload.type.upper()})"
    else:
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

    # 6. Build Flashcard objects (with SM-2 defaults)
    cards = []
    now = datetime.utcnow()
    subject_val = payload.subject.strip() if payload.subject else "General"
    
    # Check if starting ease factor override exists in user settings
    starting_ef = user_settings.get("study_preferences", {}).get("starting_ease_factor", 2.5)
    
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
            created_at=now,
            ease_factor=starting_ef,
            interval=0,
            repetitions=0,
            next_review_date=now,
            subject=subject_val,
            tags=[subject_val],
            topic=c.get("topic") or subject_val,
            source_document=filename or "Text Input"
        ))

    # Encrypt the raw study notes before storing in MongoDB
    encrypted_notes = encrypt_text(text)

    # 7. Save set to MongoDB
    set_doc = {
        "user_id": str(current_user["_id"]),
        "title": title,
        "notes": encrypted_notes,
        "is_encrypted": True,
        "source_type": source_type,
        "flashcard_type": payload.type,
        "created_at": datetime.now(timezone.utc),
        "cards": [card.dict() for card in cards],
        "subject": subject_val,
        "folder_name": payload.folder_name,
        "generation_method": generation_method,
        "generation_model": generation_model
    }
    
    result = await flashcard_sets_collection.insert_one(set_doc)

    return {
        "id": str(result.inserted_id),
        "title": title,
        "notes": text, # return plaintext back to UI
        "source_type": source_type,
        "flashcard_type": payload.type,
        "created_at": set_doc["created_at"],
        "cards": cards,
        "card_count": len(cards),
        "subject": subject_val,
        "folder_name": payload.folder_name,
        "source": generation_method,
        "model": generation_model,
        "generation_method": generation_method,
        "generation_model": generation_model,
        "flashcards": cards
    }

@router.get("/flashcards", response_model=List[FlashcardSetResponse])
async def list_sets(current_user: dict = Depends(get_current_user)):
    """Retrieve all flashcard sets created by the current user."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    sets_db = await cursor.to_list(length=100)
    
    response = []
    for s in sets_db:
        cards_list = [Flashcard(**c) for c in s.get("cards", [])]
        gen_method = s.get("generation_method")
        gen_model = s.get("generation_model")
        
        # Decrypt notes if flagged encrypted
        raw_notes = s.get("notes", "")
        if s.get("is_encrypted") and raw_notes:
            raw_notes = decrypt_text(raw_notes)
            
        response.append({
            "id": str(s["_id"]),
            "title": s.get("title", "Untitled Set"),
            "notes": raw_notes,
            "source_type": s.get("source_type", "text"),
            "flashcard_type": s.get("flashcard_type", "qa"),
            "created_at": s.get("created_at", datetime.now(timezone.utc)),
            "cards": cards_list,
            "card_count": len(cards_list),
            "subject": s.get("subject", "General"),
            "folder_name": s.get("folder_name"),
            "source": gen_method,
            "model": gen_model,
            "generation_method": gen_method,
            "generation_model": gen_model,
            "flashcards": cards_list
        })
    return response

@router.get("/review")
async def get_review_queue(current_user: dict = Depends(get_current_user)):
    """Fetch all flashcards for the current user that are due (next_review_date <= now)."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    now = datetime.utcnow()
    all_cards = []
    
    # Read daily goal cap
    daily_cap = current_user.get("settings", {}).get("study_preferences", {}).get("max_reviews_per_day", 100)
    
    for s in sets_db:
        set_id = str(s["_id"])
        set_title = s.get("title", "Untitled Set")
        for c in s.get("cards", []):
            card_info = dict(c)
            card_info["setId"] = set_id
            card_info["setTitle"] = set_title
            
            # Parse next_review_date safely
            next_date = card_info.get("next_review_date")
            if next_date is None:
                next_date = now
            elif isinstance(next_date, str):
                try:
                    next_date = datetime.fromisoformat(next_date.replace("Z", "+00:00")).replace(tzinfo=None)
                except ValueError:
                    next_date = now
            elif isinstance(next_date, datetime):
                next_date = next_date.replace(tzinfo=None)
                
            card_info["next_review_date"] = next_date
            
            if next_date <= now:
                all_cards.append(card_info)
                
    # Sort by next_review_date ASC (earliest due first)
    all_cards.sort(key=lambda x: x["next_review_date"])
    
    # Cap to daily limit settings
    return all_cards[:daily_cap]

@router.post("/review/sm2-update")
async def update_review_sm2(payload: SM2ReviewUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update a flashcard's SM-2 spaced repetition status with a 0-5 quality score."""
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
        
    # Get current SM-2 values, falling back to defaults if not set
    rep = target_card.get("repetitions", 0)
    ivl = target_card.get("interval", 0)
    ef = target_card.get("ease_factor", 2.5)
    
    # Apply user interval multiplier settings if configured
    interval_multiplier = current_user.get("settings", {}).get("study_preferences", {}).get("interval_multiplier", 1.0)
    
    # Calculate new values using the SM-2 algorithm
    new_rep, new_ivl, new_ef = calculate_sm2(payload.quality, rep, ivl, ef)
    
    # Scale interval by user multiplier settings
    if interval_multiplier != 1.0 and new_ivl > 1:
        new_ivl = max(1, round(new_ivl * interval_multiplier))
        
    # Update next_review_date
    now = datetime.utcnow()
    new_next_review = now + timedelta(days=new_ivl)
    
    # Map quality score to known/not_known status for UI backward compatibility
    new_status = "known" if payload.quality >= 3 else "not_known"
    
    await flashcard_sets_collection.update_one(
        {
            "user_id": str(current_user["_id"]),
            "cards.id": payload.cardId
        },
        {
            "$set": {
                "cards.$.status": new_status,
                "cards.$.repetitions": new_rep,
                "cards.$.interval": new_ivl,
                "cards.$.ease_factor": new_ef,
                "cards.$.next_review_date": new_next_review,
                "cards.$.reviewCount": target_card.get("reviewCount", 0) + 1
            }
        }
    )
    
    return {
        "message": "SM-2 stats updated successfully.",
        "cardId": payload.cardId,
        "repetitions": new_rep,
        "interval": new_ivl,
        "easeFactor": new_ef,
        "nextReviewDate": new_next_review,
        "status": new_status
    }

@router.post("/review/update")
async def update_review_status(payload: ReviewUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Legacy review endpoint that redirects status mapping to SM-2 calculations."""
    quality = 4 if payload.status == "known" else 1
    sm2_payload = SM2ReviewUpdateRequest(cardId=payload.cardId, quality=quality)
    return await update_review_sm2(sm2_payload, current_user)

@router.get("/export/flashcards")
async def export_flashcards(setId: str, current_user: dict = Depends(get_current_user)):
    """Export all cards in a set in a standardized CSV format (Anki compatible)."""
    try:
        set_obj_id = ObjectId(setId)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    set_doc = await flashcard_sets_collection.find_one({
        "_id": set_obj_id,
        "user_id": str(current_user["_id"])
    })
    
    if not set_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study set not found.")
        
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # CSV Header Row
    writer.writerow(["question", "answer", "type", "deck_name", "tags"])
    
    deck_name = set_doc.get("title", "Untitled Deck")
    subject = set_doc.get("subject", "General")
    
    for card in set_doc.get("cards", []):
        c_type = card.get("type", "qa")
        c_question = card.get("question", "")
        c_answer = card.get("answer", "")
        
        # Append MCQ choices to the question block for Anki compatibility
        if c_type == "mcq" and card.get("options"):
            opts_str = " | ".join([f"{chr(65+i)}) {opt}" for i, opt in enumerate(card["options"])])
            c_question = f"{c_question} (Choices: {opts_str})"
            
        card_tags = list(card.get("tags", []))
        if subject and subject not in card_tags:
            card_tags.append(subject)
            
        writer.writerow([
            c_question,
            c_answer,
            c_type,
            deck_name,
            ",".join(card_tags)
        ])
        
    output.seek(0)
    
    # Safe filename cleanup
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-]', '_', deck_name)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{safe_filename}_flashcards.csv"'
    }
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)

@router.get("/subjects")
async def get_subjects(current_user: dict = Depends(get_current_user)):
    """Retrieve all unique subjects created by the current user."""
    pipeline = [
        {"$match": {"user_id": str(current_user["_id"])}},
        {"$group": {"_id": "$subject"}},
        {"$match": {"_id": {"$ne": None}}}
    ]
    cursor = flashcard_sets_collection.aggregate(pipeline)
    results = await cursor.to_list(length=100)
    subjects = [r["_id"] for r in results]
    if "General" not in subjects:
        subjects.append("General")
    return sorted(list(set(subjects)))

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
        
    now = datetime.utcnow()
    subject_val = payload.subject.strip() if payload.subject else "General"
    
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
        "created_at": now,
        "ease_factor": 2.5,
        "interval": 0,
        "repetitions": 0,
        "next_review_date": now,
        "subject": subject_val,
        "tags": payload.tags if payload.tags else [subject_val]
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
    if payload.subject is not None:
        update_fields["cards.$.subject"] = payload.subject.strip()
    if payload.tags is not None:
        update_fields["cards.$.tags"] = payload.tags
        
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

# ============================================================
# NEW API ENDPOINTS FOR SMARTFLASH V2.0 PRODUCTION UPGRADES
# ============================================================

@router.get("/forecast")
async def get_forecast(current_user: dict = Depends(get_current_user)):
    """Calculate counts of review flashcards scheduled for each of the next 30 days."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    now = datetime.utcnow()
    today_date = now.date()
    
    # Initialize the dict with 0 for all 30 days
    forecast = {(today_date + timedelta(days=i)).isoformat(): 0 for i in range(30)}
    
    for s in sets_db:
        for c in s.get("cards", []):
            next_date_val = c.get("next_review_date")
            if next_date_val is None:
                next_date = today_date
            elif isinstance(next_date_val, str):
                try:
                    # Clean ISO suffix "Z"
                    next_date = datetime.fromisoformat(next_date_val.replace("Z", "+00:00")).date()
                except ValueError:
                    next_date = today_date
            else:
                next_date = next_date_val.date()
                
            # Overdue cards are counted as due today
            if next_date < today_date:
                next_date = today_date
                
            date_str = next_date.isoformat()
            if date_str in forecast:
                forecast[date_str] += 1
                
    # Sort and return as list of JSON objects
    return [{"date": d, "count": forecast[d]} for d in sorted(forecast.keys())]

@router.get("/leech")
async def get_leech_cards(current_user: dict = Depends(get_current_user)):
    """Retrieve leech cards (cards repeatedly reviewed with poor recall or low ease factor)."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    leech_cards = []
    for s in sets_db:
        set_id = str(s["_id"])
        set_title = s.get("title", "Untitled Set")
        for c in s.get("cards", []):
            ef = c.get("ease_factor", 2.5)
            rep = c.get("repetitions", 0)
            revs = c.get("reviewCount", 0)
            
            # Criteria: reviewed 3+ times with low ease factor, or failed frequently (reset repetitions)
            is_leech = (revs >= 3 and ef <= 1.6) or (revs >= 4 and rep == 0)
            
            if is_leech:
                card_info = dict(c)
                card_info["setId"] = set_id
                card_info["setTitle"] = set_title
                leech_cards.append(card_info)
                
    return leech_cards

class ImportCardsRequest(BaseModel):
    deck_id: Optional[str] = None
    deck_name: Optional[str] = None
    subject: str = "General"
    csv_content: str

@router.post("/import")
async def import_flashcards(payload: ImportCardsRequest, current_user: dict = Depends(get_current_user)):
    """Import flashcards bulk upload from CSV. Checks for existing cards to avoid duplicates."""
    lines = payload.csv_content.strip().splitlines()
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV content.")
        
    reader = csv.reader(lines)
    try:
        headers = next(reader)
    except StopIteration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CSV layout.")
        
    q_idx, a_idx, t_idx = -1, -1, -1
    for i, h in enumerate(headers):
        h_clean = h.strip().lower()
        if "question" in h_clean or h_clean in ["front", "q", "card"]:
            q_idx = i
        elif "answer" in h_clean or h_clean in ["back", "a", "definition"]:
            a_idx = i
        elif "type" in h_clean:
            t_idx = i
            
    if q_idx == -1: q_idx = 0
    if a_idx == -1: a_idx = 1 if len(headers) > 1 else 0
    if t_idx == -1: t_idx = 2 if len(headers) > 2 else -1
    
    imported_cards = []
    now = datetime.utcnow()
    
    for row in reader:
        if not row or len(row) <= max(q_idx, a_idx):
            continue
        q_val = row[q_idx].strip()
        a_val = row[a_idx].strip()
        c_type = row[t_idx].strip().lower() if (t_idx != -1 and len(row) > t_idx) else "qa"
        if c_type not in ["qa", "fillup", "mcq"]:
            c_type = "qa"
            
        if not q_val or not a_val:
            continue
            
        imported_cards.append({
            "id": str(uuid.uuid4()),
            "type": c_type,
            "question": q_val,
            "answer": a_val,
            "options": [a_val, "Option B", "Option C", "Option D"] if c_type == "mcq" else [],
            "difficulty": "medium",
            "status": "not_known",
            "reviewCount": 0,
            "priority": 0,
            "created_at": now,
            "ease_factor": 2.5,
            "interval": 0,
            "repetitions": 0,
            "next_review_date": now,
            "subject": payload.subject,
            "tags": [payload.subject]
        })
        
    if not imported_cards:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid questions/answers found in CSV data.")
        
    target_set_doc = None
    if payload.deck_id:
        try:
            target_set_doc = await flashcard_sets_collection.find_one({
                "_id": ObjectId(payload.deck_id),
                "user_id": str(current_user["_id"])
            })
        except Exception:
            pass
            
    if not target_set_doc:
        d_name = payload.deck_name or f"Imported Set ({datetime.now().strftime('%b %d, %Y')})"
        new_set = {
            "user_id": str(current_user["_id"]),
            "title": d_name.strip(),
            "notes": encrypt_text("Imported CSV Decks."),
            "is_encrypted": True,
            "source_type": "csv_import",
            "flashcard_type": "qa",
            "created_at": now,
            "cards": [],
            "card_count": 0,
            "subject": payload.subject
        }
        ins_res = await flashcard_sets_collection.insert_one(new_set)
        target_set_doc = await flashcard_sets_collection.find_one({"_id": ins_res.inserted_id})
        
    deck_id_str = str(target_set_doc["_id"])
    existing_questions = {c["question"].strip().lower() for c in target_set_doc.get("cards", [])}
    
    new_cards_to_add = []
    skipped = 0
    for c in imported_cards:
        if c["question"].strip().lower() in existing_questions:
            skipped += 1
            continue
        new_cards_to_add.append(c)
        
    if new_cards_to_add:
        await flashcard_sets_collection.update_one(
            {"_id": target_set_doc["_id"]},
            {
                "$push": {"cards": {"$each": new_cards_to_add}},
                "$inc": {"card_count": len(new_cards_to_add)}
            }
        )
        
    return {
        "message": "Import completed successfully.",
        "deck_id": deck_id_str,
        "total_parsed": len(imported_cards),
        "added": len(new_cards_to_add),
        "duplicates_skipped": skipped
    }

@router.post("/flashcards/reset-deck/{set_id}")
async def reset_deck_progress(set_id: str, current_user: dict = Depends(get_current_user)):
    """Reset learning stats and intervals for all cards in a set."""
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    set_doc = await flashcard_sets_collection.find_one({"_id": set_obj_id, "user_id": str(current_user["_id"])})
    if not set_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found.")
        
    now = datetime.utcnow()
    updated_cards = []
    for c in set_doc.get("cards", []):
        c_copy = dict(c)
        c_copy["ease_factor"] = 2.5
        c_copy["interval"] = 0
        c_copy["repetitions"] = 0
        c_copy["next_review_date"] = now
        c_copy["reviewCount"] = 0
        c_copy["status"] = "not_known"
        updated_cards.append(c_copy)
        
    await flashcard_sets_collection.update_one(
        {"_id": set_obj_id},
        {"$set": {"cards": updated_cards}}
    )
    return {"message": "Deck learning progress reset successfully."}

@router.post("/flashcards/reset-card/{set_id}/{card_id}")
async def reset_card_progress(set_id: str, card_id: str, current_user: dict = Depends(get_current_user)):
    """Reset learning stats and intervals for a single card."""
    try:
        set_obj_id = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid set ID.")
        
    now = datetime.utcnow()
    result = await flashcard_sets_collection.update_one(
        {"_id": set_obj_id, "user_id": str(current_user["_id"]), "cards.id": card_id},
        {
            "$set": {
                "cards.$.ease_factor": 2.5,
                "cards.$.interval": 0,
                "cards.$.repetitions": 0,
                "cards.$.next_review_date": now,
                "cards.$.reviewCount": 0,
                "cards.$.status": "not_known"
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card or Set not found.")
    return {"message": "Card progress reset successfully."}

@router.post("/flashcards/reset-global")
async def reset_global_progress(current_user: dict = Depends(get_current_user)):
    """Reset learning stats and intervals for all cards of this user globally."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    now = datetime.utcnow()
    for s in sets_db:
        updated_cards = []
        for c in s.get("cards", []):
            c_copy = dict(c)
            c_copy["ease_factor"] = 2.5
            c_copy["interval"] = 0
            c_copy["repetitions"] = 0
            c_copy["next_review_date"] = now
            c_copy["reviewCount"] = 0
            c_copy["status"] = "not_known"
            updated_cards.append(c_copy)
            
        await flashcard_sets_collection.update_one(
            {"_id": s["_id"]},
            {"$set": {"cards": updated_cards}}
        )
    return {"message": "Global progress reset successfully."}

class BatchActionRequest(BaseModel):
    action: str  # "delete", "move", "tag"
    card_ids: List[str]
    target_set_id: Optional[str] = None
    tag_name: Optional[str] = None

@router.post("/flashcards/batch")
async def batch_operations(payload: BatchActionRequest, current_user: dict = Depends(get_current_user)):
    """Batch execute operations (delete, move, tag) on a set of cards."""
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})
    sets_db = await cursor.to_list(length=100)
    
    action = payload.action.strip().lower()
    card_ids = set(payload.card_ids)
    
    if action == "delete":
        for s in sets_db:
            cards_left = [c for c in s.get("cards", []) if c["id"] not in card_ids]
            if len(cards_left) != len(s.get("cards", [])):
                await flashcard_sets_collection.update_one(
                    {"_id": s["_id"]},
                    {"$set": {"cards": cards_left, "card_count": len(cards_left)}}
                )
        return {"message": f"Successfully deleted {len(card_ids)} cards."}
        
    elif action == "move":
        if not payload.target_set_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_set_id is required for move action.")
        try:
            target_obj_id = ObjectId(payload.target_set_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target set ID.")
            
        cards_to_move = []
        for s in sets_db:
            if str(s["_id"]) == payload.target_set_id:
                continue
            retained_cards = []
            for c in s.get("cards", []):
                if c["id"] in card_ids:
                    cards_to_move.append(c)
                else:
                    retained_cards.append(c)
            if len(retained_cards) != len(s.get("cards", [])):
                await flashcard_sets_collection.update_one(
                    {"_id": s["_id"]},
                    {"$set": {"cards": retained_cards, "card_count": len(retained_cards)}}
                )
                
        if cards_to_move:
            await flashcard_sets_collection.update_one(
                {"_id": target_obj_id},
                {
                    "$push": {"cards": {"$each": cards_to_move}},
                    "$inc": {"card_count": len(cards_to_move)}
                }
            )
        return {"message": f"Successfully moved {len(cards_to_move)} cards."}
        
    elif action == "tag":
        if not payload.tag_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tag_name is required for tag action.")
        
        for s in sets_db:
            updated = False
            for c in s.get("cards", []):
                if c["id"] in card_ids:
                    tags = c.get("tags", [])
                    if payload.tag_name not in tags:
                        tags.append(payload.tag_name)
                        c["tags"] = tags
                        updated = True
            if updated:
                await flashcard_sets_collection.update_one(
                    {"_id": s["_id"]},
                    {"$set": {"cards": s["cards"]}}
                )
        return {"message": f"Successfully tagged cards with '{payload.tag_name}'."}
        
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported batch action: {action}")
