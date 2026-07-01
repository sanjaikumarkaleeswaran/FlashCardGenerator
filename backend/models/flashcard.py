from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid

class Flashcard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "qa"  # "qa" | "fillup" | "mcq"
    question: str
    answer: str
    options: List[str] = []
    difficulty: str  # "easy", "medium", "hard"
    status: str = "not_known"  # "known", "not_known"
    reviewCount: int = 0
    priority: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Upgraded SM-2 spaced repetition fields
    ease_factor: float = 2.5
    interval: int = 0
    repetitions: int = 0
    next_review_date: datetime = Field(default_factory=datetime.utcnow)
    subject: str = "General"
    tags: List[str] = []

class FlashcardSetCreate(BaseModel):
    title: str
    notes: str
    source_type: str = "text"  # "text" | "pdf" | "docx" | "txt"
    flashcard_type: str = "qa"  # "qa" | "fillup" | "mcq"
    cards: List[Flashcard]
    subject: str = "General"
    folder_name: Optional[str] = None
    generation_method: Optional[str] = None
    generation_model: Optional[str] = None

class FlashcardSetResponse(BaseModel):
    id: str
    title: str
    notes: str
    source_type: str = "text"
    flashcard_type: str = "qa"
    created_at: datetime
    cards: List[Flashcard]
    card_count: int
    subject: str = "General"
    folder_name: Optional[str] = None
    source: Optional[str] = None
    model: Optional[str] = None
    generation_method: Optional[str] = None
    generation_model: Optional[str] = None
    flashcards: Optional[List[Flashcard]] = None

class FlashcardGenerateRequest(BaseModel):
    notes: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None  # Reference to document_id
    count: int = 10
    type: str = "qa"  # "qa" | "fillup" | "mcq"
    subject: str = "General"
    folder_name: Optional[str] = None
    ignore_words: Optional[List[str]] = None  # Custom ignore words list for Cloze safety
    difficulty: Optional[str] = None

class ReviewUpdateRequest(BaseModel):
    cardId: str
    status: str  # "known" or "not_known"

class SM2ReviewUpdateRequest(BaseModel):
    cardId: str
    quality: int = Field(ge=0, le=5)  # 0 to 5 score

class FlashcardSetRenameRequest(BaseModel):
    title: str

class FlashcardCreateRequest(BaseModel):
    type: str = "qa"  # "qa" | "fillup" | "mcq"
    question: str
    answer: str
    options: List[str] = []
    difficulty: str = "medium"
    subject: str = "General"
    tags: List[str] = []

class FlashcardUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    options: Optional[List[str]] = None
    difficulty: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None
