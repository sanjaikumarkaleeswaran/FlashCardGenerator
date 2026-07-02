# backend/services/rag_service.py

import re
import spacy
from datetime import datetime
from bson import ObjectId
from database import db, documents_collection
from services.document_processor import extract_text
from services.embeddings import get_embedding, cosine_similarity
from services.groq_service import get_groq_response, transcribe_audio_with_groq
from services.encryption import encrypt_text, decrypt_text

# Load spaCy NLP engine
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

def clean_text(text: str) -> str:
    """Normalize whitespace and clean up raw document text."""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def split_into_chunks(text: str, max_chars: int = 800, overlap_chars: int = 150) -> list:
    """Split text into overlapping sentences using spaCy sentence boundary detection."""
    cleaned = clean_text(text)
    if not cleaned:
        return []

    # If spaCy is loaded, use it to detect clean sentence boundaries
    if nlp is not None:
        try:
            # Process large text in segments to prevent RAM overflow
            doc = nlp(cleaned[:120000])
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        except Exception:
            sentences = re.split(r'(?<=[.!?])\s+', cleaned)
    else:
        sentences = re.split(r'(?<=[.!?])\s+', cleaned)

    chunks = []
    current_chunk = ""
    for sent in sentences:
        if len(current_chunk) + len(sent) + 1 <= max_chars:
            current_chunk += (" " + sent if current_chunk else sent)
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # Create overlapping buffer
            overlap_start = max(0, len(current_chunk) - overlap_chars)
            overlap_text = current_chunk[overlap_start:]
            space_idx = overlap_text.find(" ")
            if space_idx != -1:
                overlap_text = overlap_text[space_idx + 1:]
            current_chunk = (overlap_text + " " + sent) if overlap_text else sent
            
    if current_chunk:
        chunks.append(current_chunk)
    return chunks

async def ingest_document_to_kb(user_id: ObjectId, filename: str, file_bytes: bytes) -> dict:
    """
    Complete Knowledge Base ingestion pipeline:
    Extract -> Clean -> Chunk -> Embed -> Store (Document Metadata & Chunk Vectors)
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # 1. Extract raw text
    if ext in ["mp3", "wav", "m4a"]:
        raw_text = transcribe_audio_with_groq(file_bytes, filename).strip()
    else:
        raw_text = extract_text(file_bytes, filename).strip()

    if len(raw_text) < 30:
        raise ValueError("Document contains insufficient text for indexing (minimum 30 characters).")

    # 2. Encrypt and Save raw document
    encrypted_text = encrypt_text(raw_text)
    doc_id = ObjectId()
    doc_record = {
        "_id": doc_id,
        "user_id": user_id,
        "filename": filename,
        "extracted_text": encrypted_text,
        "is_encrypted": True,
        "created_at": datetime.utcnow()
    }
    await db["documents"].insert_one(doc_record)

    # 3. Create Knowledge Base metadata record
    kb_record = {
        "_id": doc_id,  # Link 1-to-1 with document
        "user_id": user_id,
        "title": filename.rsplit(".", 1)[0],
        "filename": filename,
        "upload_date": datetime.utcnow(),
        "char_count": len(raw_text),
        "chunk_count": 0
    }
    await db["knowledge_bases"].insert_one(kb_record)

    # 4. Chunk & Generate embeddings
    chunks = split_into_chunks(raw_text)
    embeddings_to_insert = []
    
    for idx, chunk in enumerate(chunks):
        vector = get_embedding(chunk)
        # Approximate page number (every 2000 characters is roughly 1 page)
        page_num = (idx * 600) // 2000 + 1
        
        embeddings_to_insert.append({
            "_id": ObjectId(),
            "document_id": doc_id,
            "user_id": user_id,
            "chunk_id": f"chunk_{idx}",
            "text": chunk,
            "embedding": vector,
            "page_number": page_num,
            "created_at": datetime.utcnow()
        })
        
    if embeddings_to_insert:
        await db["embeddings"].insert_many(embeddings_to_insert)
        await db["knowledge_bases"].update_one(
            {"_id": doc_id},
            {"$set": {"chunk_count": len(embeddings_to_insert)}}
        )

    # 5. Generate AI summary in the background
    try:
        await generate_ai_summary(user_id, doc_id, raw_text[:8000])
    except Exception as e:
        print(f"Failed to generate summary: {e}")

    return {
        "document_id": str(doc_id),
        "filename": filename,
        "chunks_indexed": len(chunks),
        "title": kb_record["title"]
    }

async def generate_ai_summary(user_id: ObjectId, document_id: ObjectId, sample_text: str):
    """Generate structured revision summary of the document using Groq."""
    prompt = f"""
    You are an expert academic tutor. Analyze the following document text and compile a comprehensive summary.
    Format your response as a valid JSON object with the following fields:
    - executive_summary (string)
    - key_concepts (list of strings)
    - definitions (dict mapping terms to definitions)
    - important_dates (list of strings or dict)
    - people (list of strings)
    - formulas (list of strings)
    - processes (list of strings)
    - timeline (list of strings)
    - faq (list of dicts with 'question' and 'answer')
    - revision_notes (string)

    Document Text Sample:
    {sample_text}
    """
    
    try:
        import json
        raw_response = get_groq_response(
            system_instruction="You must output ONLY valid JSON format.",
            user_prompt=prompt,
            response_format="json"
        )
        data = json.loads(raw_response)
    except Exception:
        # Fallback summary structure if parsing fails
        data = {
            "executive_summary": "Extracted document overview.",
            "key_concepts": ["Main topics in document"],
            "definitions": {"Overview": "No detailed definitions generated"},
            "important_dates": [],
            "people": [],
            "formulas": [],
            "processes": [],
            "timeline": [],
            "faq": [{"question": "What is this document about?", "answer": "Detailed study guide summary."}],
            "revision_notes": "Read document for full notes."
        }

    summary_record = {
        "_id": ObjectId(),
        "document_id": document_id,
        "user_id": user_id,
        "summary": data,
        "created_at": datetime.utcnow()
    }
    await db["summaries"].insert_one(summary_record)

async def retrieve_semantic_context(user_id: ObjectId, document_id: ObjectId, query: str, top_k: int = 4) -> list:
    """Perform cosine-similarity vector search across document chunk embeddings."""
    query_vector = get_embedding(query)
    
    # Query database chunks
    filter_query = {"user_id": user_id}
    if str(document_id) != "all":
        filter_query["document_id"] = document_id

    cursor = db["embeddings"].find(filter_query)
    chunks = await cursor.to_list(length=1000)
    
    results = []
    for chunk in chunks:
        score = cosine_similarity(query_vector, chunk["embedding"])
        results.append({
            "text": chunk["text"],
            "page_number": chunk.get("page_number", 1),
            "chunk_id": chunk["chunk_id"],
            "score": score
        })
        
    # Sort by similarity score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

async def answer_query_with_rag(user_id: ObjectId, document_id: ObjectId, question: str, session_id: str = None) -> dict:
    """Grounded RAG Pipeline with confidence scores, source tracing, and history tracking."""
    # 1. Retrieve top context
    context_chunks = await retrieve_semantic_context(user_id, document_id, question, top_k=4)
    
    if not context_chunks:
        return {
            "answer": "I could not find any relevant information in the uploaded document to answer this query.",
            "confidence_score": 0.0,
            "sources": []
        }
        
    context_text = "\n\n".join([f"[Source Page {c['page_number']}]: {c['text']}" for c in context_chunks])
    
    # 2. Get document metadata
    doc = await db["knowledge_bases"].find_one({"_id": document_id})
    filename = doc["filename"] if doc else "Document"

    # 3. Construct prompt
    system_instruction = (
        "You are an AI study assistant tutor. You must answer the user's question using ONLY the provided text context.\n"
        "If the answer cannot be found in the context, clearly state that the document does not contain that information.\n"
        "Never make up information or introduce external assumptions (avoid hallucinations).\n"
        "At the end of your response, output a confidence score as: [Confidence: X.X] (on a scale from 0.0 to 1.0 based on how fully the context supports the answer)."
    )
    
    user_prompt = f"""
    Context material:
    {context_text}

    User Question:
    {question}
    """
    
    answer_text = get_groq_response(
        system_instruction=system_instruction,
        user_prompt=user_prompt
    )
    
    # 4. Extract confidence score from response
    confidence = 0.8  # Default
    conf_match = re.search(r'\[Confidence:\s*([0-9\.]+)\]', answer_text, re.IGNORECASE)
    if conf_match:
        try:
            confidence = float(conf_match.group(1))
            # Strip confidence tag from final display
            answer_text = re.sub(r'\[Confidence:\s*[0-9\.]+\]', '', answer_text, flags=re.IGNORECASE).strip()
        except ValueError:
            pass

    sources = [{
        "chunk_id": c["chunk_id"],
        "text": c["text"][:200] + "...",
        "page_number": c["page_number"],
        "score": round(c["score"], 3)
    } for c in context_chunks]

    # 5. Persist Chat History
    if not session_id:
        session_id = str(ObjectId())

    # Save user message
    await db["messages"].insert_one({
        "_id": ObjectId(),
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": question,
        "created_at": datetime.utcnow()
    })

    # Save assistant response
    response_msg_id = ObjectId()
    await db["messages"].insert_one({
        "_id": response_msg_id,
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": answer_text,
        "sources": sources,
        "confidence_score": confidence,
        "referenced_document": filename,
        "created_at": datetime.utcnow()
    })

    # Ensure session record exists
    await db["chat_sessions"].update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {
            "last_message": answer_text[:100],
            "document_id": document_id,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )

    return {
        "session_id": session_id,
        "answer": answer_text,
        "confidence_score": confidence,
        "referenced_document": filename,
        "sources": sources
    }
