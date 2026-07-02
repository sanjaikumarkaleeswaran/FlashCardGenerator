# backend/routes/documents.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
import os
from auth import get_current_user
from database import documents_collection
from services.document_processor import extract_text
from services.groq_service import transcribe_audio_with_groq
from services.encryption import encrypt_text, decrypt_text
from services.rate_limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # Extended to 10MB to support larger audio/PPTX uploads

SUPPORTED_DOC_EXTS = ["pdf", "docx", "txt", "text", "pptx", "ppt"]
SUPPORTED_IMG_EXTS = ["png", "jpg", "jpeg", "webp", "tiff", "tif"]
SUPPORTED_AUD_EXTS = ["mp3", "wav", "m4a"]

ALL_SUPPORTED_EXTS = SUPPORTED_DOC_EXTS + SUPPORTED_IMG_EXTS + SUPPORTED_AUD_EXTS

@router.post("/upload", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document (PDF, DOCX, TXT, PPTX), an image (PNG, JPG, WEBP) for OCR,
    or an audio note (MP3, WAV, M4A) for speech-to-text.
    Extracts, transcribes, encrypts, and saves the text reference in MongoDB.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALL_SUPPORTED_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported: {', '.join(ALL_SUPPORTED_EXTS)}"
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB limit."
        )

    clean_text = ""
    
    # Process by type
    try:
        if ext in SUPPORTED_AUD_EXTS:
            # Transcribe via Groq Whisper
            clean_text = transcribe_audio_with_groq(file_bytes, filename).strip()
        else:
            # Parse text or run OCR
            extracted = extract_text(file_bytes, filename)
            clean_text = extracted.strip()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process file text content: {str(e)}"
        )

    if len(clean_text) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document contains insufficient text (minimum 30 characters required)."
        )

    # Encrypt the extracted text before storing in MongoDB
    encrypted_text = encrypt_text(clean_text)

    # Save to database
    doc_id = ObjectId()
    doc_record = {
        "_id": doc_id,
        "user_id": current_user["_id"],
        "filename": filename,
        "extracted_text": encrypted_text,
        "is_encrypted": True,
        "created_at": datetime.utcnow()
    }
    
    await documents_collection.insert_one(doc_record)

    return {
        "document_id": str(doc_id),
        "filename": filename,
        "char_count": len(clean_text),
        "preview": clean_text[:300] + ("..." if len(clean_text) > 300 else "")
    }
