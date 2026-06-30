from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from auth import get_current_user
from database import documents_collection
from services.document_processor import extract_text

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB limit

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a PDF, DOCX, or TXT document, extract its text content,
    and save the document reference for flashcard generation.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, DOCX, and TXT are supported."
        )

    # Read file content
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB limit."
        )

    # Extract text from document
    try:
        extracted_text = extract_text(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process file text content: {str(e)}"
        )

    clean_text = extracted_text.strip()
    if len(clean_text) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document contains insufficient text (minimum 30 characters required)."
        )

    # Save to database
    doc_id = ObjectId()
    doc_record = {
        "_id": doc_id,
        "user_id": current_user["_id"],
        "filename": filename,
        "extracted_text": clean_text,
        "created_at": datetime.utcnow()
    }
    
    await documents_collection.insert_one(doc_record)

    return {
        "document_id": str(doc_id),
        "filename": filename,
        "char_count": len(clean_text),
        "preview": clean_text[:300] + ("..." if len(clean_text) > 300 else "")
    }
