from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from auth import get_current_user
from services.groq_service import transcribe_audio_with_groq
from services.nlp_generator import get_nlp
from database import voice_reviews_collection, flashcard_sets_collection
from datetime import datetime, timezone
import math
from bson import ObjectId

router = APIRouter(prefix="/voice", tags=["voice"])

class GradeRequest(BaseModel):
    card_id: str
    set_id: str
    transcript: str
    correct_answer: str

@router.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Transcribe voice recording from user via Groq Whisper."""
    try:
        file_bytes = await file.read()
        transcript = transcribe_audio_with_groq(file_bytes, file.filename)
        return {"transcript": transcript.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grade")
async def grade_voice(payload: GradeRequest, current_user: dict = Depends(get_current_user)):
    """Compare transcript to correct answer and auto-grade 0-5."""
    transcript = payload.transcript.strip()
    correct = payload.correct_answer.strip()
    
    nlp = get_nlp()
    if not nlp:
        # Simple word overlap fallback
        t_words = set(transcript.lower().split())
        c_words = set(correct.lower().split())
        overlap = len(t_words.intersection(c_words))
        score_ratio = overlap / len(c_words) if c_words else 0
    else:
        # spaCy similarity
        doc1 = nlp(transcript.lower())
        doc2 = nlp(correct.lower())
        if doc1.vector_norm == 0 or doc2.vector_norm == 0:
            score_ratio = 0
        else:
            score_ratio = doc1.similarity(doc2)
    
    # Map ratio to SM-2 (0-5)
    # 0.9+ = 5
    # 0.8+ = 4
    # 0.6+ = 3
    # 0.4+ = 2
    # 0.2+ = 1
    # <0.2 = 0
    
    if score_ratio >= 0.9:
        rating = 5
    elif score_ratio >= 0.8:
        rating = 4
    elif score_ratio >= 0.6:
        rating = 3
    elif score_ratio >= 0.4:
        rating = 2
    elif score_ratio >= 0.2:
        rating = 1
    else:
        rating = 0
        
    # Log the review
    record = {
        "user_id": current_user["_id"],
        "card_id": payload.card_id,
        "set_id": ObjectId(payload.set_id) if len(payload.set_id) == 24 else payload.set_id,
        "transcript": transcript,
        "correct_answer": correct,
        "similarity": score_ratio,
        "rating": rating,
        "timestamp": datetime.now(timezone.utc)
    }
    await voice_reviews_collection.insert_one(record)
    
    return {
        "similarity_percentage": round(score_ratio * 100, 1),
        "suggested_rating": rating,
        "transcript": transcript,
        "feedback": "Perfect" if rating >= 4 else "Close, but needs improvement" if rating >= 2 else "Incorrect"
    }
