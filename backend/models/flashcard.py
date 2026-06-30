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

class FlashcardSetCreate(BaseModel):
    title: str
    notes: str
    source_type: str = "text"  # "text" | "pdf" | "docx" | "txt"
    flashcard_type: str = "qa"  # "qa" | "fillup" | "mcq"
    cards: List[Flashcard]

class FlashcardSetResponse(BaseModel):
    id: str
    title: str
    notes: str
    source_type: str = "text"
    flashcard_type: str = "qa"
    created_at: datetime
    cards: List[Flashcard]
    card_count: int

class FlashcardGenerateRequest(BaseModel):
    notes: Optional[str] = None
    source: Optional[str] = None  # Reference to document_id
    count: int = 10
    type: str = "qa"  # "qa" | "fillup" | "mcq"

class ReviewUpdateRequest(BaseModel):
    cardId: str
    status: str  # "known" or "not_known"

class FlashcardSetRenameRequest(BaseModel):
    title: str

class FlashcardCreateRequest(BaseModel):
    type: str = "qa"  # "qa" | "fillup" | "mcq"
    question: str
    answer: str
    options: List[str] = []
    difficulty: str = "medium"

class FlashcardUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    options: Optional[List[str]] = None
    difficulty: Optional[str] = None
