from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid

class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    difficulty: str  # "easy", "medium", "hard"
    status: str = "not_known"  # "known", "not_known"
    reviewCount: int = 0
    priority: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FlashcardSetCreate(BaseModel):
    title: str
    notes: str
    cards: List[Flashcard]

class FlashcardSetResponse(BaseModel):
    id: str
    title: str
    notes: str
    created_at: datetime
    cards: List[Flashcard]
    card_count: int

class FlashcardGenerateRequest(BaseModel):
    notes: str

class ReviewUpdateRequest(BaseModel):
    cardId: str
    status: str  # "known" or "not_known"
