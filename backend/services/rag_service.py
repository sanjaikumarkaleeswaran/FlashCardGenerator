# backend/services/rag_service.py

import re
import json
import logging
from datetime import datetime
from bson import ObjectId

from database import db, documents_collection
from services.document_processor import extract_text
from services.embeddings import get_embedding, cosine_similarity
from services.groq_service import get_groq_response, transcribe_audio_with_groq
from services.encryption import encrypt_text, decrypt_text
from services.document_intelligence import (
    run_document_understanding_pipeline,
    extract_document_intelligence_metadata,
    retrieve_hybrid_context,
    self_verify_rag_answer,
    calculate_document_quality_metrics
)

logger = logging.getLogger(__name__)

async def ingest_document_to_kb(user_id: ObjectId, filename: str, file_bytes: bytes) -> dict:
    """
    Upgraded Document Intelligence Ingestion Pipeline:
    Upload -> Extract -> Clean -> Remove Headers/Footers -> Deduplicate -> OCR Repair ->
    Normalize -> Language Detect -> Semantic Sectioning -> Embeddings -> vector DB ->
    AI Metadata Extraction -> Auto Summary Generation
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # 1. Extract raw text
    if ext in ["mp3", "wav", "m4a"]:
        raw_text = transcribe_audio_with_groq(file_bytes, filename).strip()
    else:
        raw_text = extract_text(file_bytes, filename).strip()

    if len(raw_text) < 30:
        raise ValueError("Document contains insufficient text for indexing (minimum 30 characters).")

    # 2. Run text-cleansing pipeline
    cleaned_text, chunks, lang = run_document_understanding_pipeline(raw_text)

    # 3. Encrypt and save raw document
    encrypted_text = encrypt_text(cleaned_text)
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

    # 4. Deep AI Analysis and Metadata Extraction (Groq powered)
    metadata = await extract_document_intelligence_metadata(cleaned_text, filename)

    # 5. Create Knowledge Base metadata record
    kb_record = {
        "_id": doc_id,
        "user_id": user_id,
        "title": filename.rsplit(".", 1)[0],
        "filename": filename,
        "upload_date": datetime.utcnow(),
        "char_count": len(cleaned_text),
        "chunk_count": 0,
        "language": lang,
        "metadata": metadata
    }
    await db["knowledge_bases"].insert_one(kb_record)

    # 6. Embed chunks and save to Vector DB (embeddings collection)
    embeddings_to_insert = []
    for idx, chunk in enumerate(chunks):
        vector = get_embedding(chunk)
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

    # 7. Generate structured summary from deep metadata
    summary_data = {
        "executive_summary": f"This document covers '{metadata.get('main_topic', filename)}'. Learning objectives include: " + ", ".join(metadata.get("learning_objectives", [])[:4]),
        "key_concepts": metadata.get("subtopics", []),
        "definitions": metadata.get("definitions", {}),
        "important_dates": [f"{d.get('date')}: {d.get('event')}" for d in metadata.get("dates", []) if isinstance(d, dict)],
        "people": [p.get("name") for p in metadata.get("people", []) if isinstance(p, dict)],
        "formulas": metadata.get("formulas", []),
        "processes": [p.get("name") for p in metadata.get("processes", []) if isinstance(p, dict)],
        "timeline": [f"{d.get('date')}: {d.get('event')}" for d in metadata.get("dates", []) if isinstance(d, dict)],
        "faq": [
            {"question": f"What is the definition of {k}?", "answer": v}
            for k, v in list(metadata.get("definitions", {}).items())[:5]
        ] if metadata.get("definitions") else [{"question": "What is the main topic?", "answer": metadata.get("main_topic")}],
        "revision_notes": f"Main Topic: {metadata.get('main_topic')}\n\nExam Critical Areas:\n" + "\n".join([f"- {t}" for t in metadata.get("exam_important_topics", [])])
    }

    summary_record = {
        "_id": ObjectId(),
        "document_id": doc_id,
        "user_id": user_id,
        "summary": summary_data,
        "created_at": datetime.utcnow()
    }
    await db["summaries"].insert_one(summary_record)

    # Calculate initial quality metrics
    try:
        await calculate_document_quality_metrics(user_id, doc_id)
    except Exception as e:
        logger.error(f"Failed to calculate initial metrics: {e}")

    return {
        "document_id": str(doc_id),
        "filename": filename,
        "chunks_indexed": len(chunks),
        "title": kb_record["title"]
    }

async def retrieve_semantic_context(user_id: ObjectId, document_id: ObjectId, query: str, top_k: int = 4) -> list:
    """Fallback alias function keeping compatibility with original signature."""
    context_chunks = await retrieve_hybrid_context(user_id, document_id, query, top_k=top_k)
    return [{
        "text": c["text"],
        "page_number": c["page_number"],
        "chunk_id": c["chunk_id"],
        "score": c["hybrid_score"]
    } for c in context_chunks]

async def answer_query_with_rag(user_id: ObjectId, document_id: ObjectId, question: str, session_id: str = None) -> dict:
    """
    Upgraded Grounded RAG Pipeline:
    Hybrid Retrieval -> Context Compression -> Grounded Generation -> Self-Verification -> Citation mapping
    """
    # 1. Retrieve hybrid context
    context_chunks = await retrieve_hybrid_context(user_id, document_id, question, top_k=5, similarity_threshold=0.30)
    
    if not context_chunks:
        return {
            "session_id": session_id or str(ObjectId()),
            "answer": "This information is not available in the uploaded document.",
            "confidence_score": 0.0,
            "confidence_label": "Warn the user",
            "referenced_document": "None",
            "sources": [],
            "related_concepts": [],
            "difficulty_level": "unknown",
            "follow_up_questions": []
        }
        
    context_text = "\n\n".join([f"[Source Page {c['page_number']}]: {c['text']}" for c in context_chunks])
    
    # 2. Get document filename
    doc = await db["knowledge_bases"].find_one({"_id": document_id})
    filename = doc["filename"] if doc else "Document"
    doc_metadata = doc.get("metadata", {}) if doc else {}

    # 3. Construct prompt
    system_instruction = (
        "You are an expert AI study tutor. You must answer the user's question using ONLY the provided text context.\n"
        "If the answer cannot be found in the context or isn't fully supported, respond EXACTLY with:\n"
        "'This information is not available in the uploaded document.'\n"
        "Never make up information or introduce external assumptions. Avoid hallucinations."
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
    ).strip()
    
    # 4. Self-Verification grounding check
    is_grounded, grounding_score = await self_verify_rag_answer(answer_text, context_text)
    
    if not is_grounded:
        answer_text = "This information is not available in the uploaded document."
        grounding_score = 0.0

    # Calculate confidence label
    confidence_pct = int(grounding_score * 100)
    if confidence_pct >= 95:
        confidence_label = "Highly Reliable"
    elif confidence_pct >= 80:
        confidence_label = "Reliable"
    elif confidence_pct >= 60:
        confidence_label = "Moderate Confidence"
    else:
        confidence_label = "Warn the user"

    # 5. Generate dynamic follow-up questions
    follow_up_prompt = f"""
    Based on the following answer and context, generate exactly 3 suggested academic follow-up questions.
    Format your response as a valid JSON list of strings.
    
    Answer: {answer_text}
    Context: {context_text[:1500]}
    """
    try:
        raw_follow = get_groq_response(
            system_instruction="Output ONLY a JSON list of 3 strings.",
            user_prompt=follow_up_prompt,
            response_format="json"
        )
        follow_up_questions = json.loads(raw_follow)
    except Exception:
        follow_up_questions = [
            "Can you explain this in more detail?",
            "What are the main advantages of this concept?",
            "Are there any case studies demonstrating this?"
        ]

    sources = []
    for c in context_chunks:
        # Approximate section name from text
        section_match = re.search(r'^[#* \t]*([A-Z][A-Za-z0-9 \t\-,]{3,30})', c["text"])
        section = section_match.group(1).strip() if section_match else doc_metadata.get("main_topic", "General Section")
        
        sources.append({
            "chunk_id": c["chunk_id"],
            "text": c["text"][:300] + "...",
            "page_number": c["page_number"],
            "section": section,
            "similarity_score": round(c["hybrid_score"], 3),
            "confidence_score": round(grounding_score, 3)
        })

    # 6. Persist Chat History
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
        "confidence_score": grounding_score,
        "confidence_label": confidence_label,
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

    related_concepts = doc_metadata.get("subtopics", [])[:4]

    return {
        "session_id": session_id,
        "answer": answer_text,
        "confidence_score": grounding_score,
        "confidence_label": confidence_label,
        "referenced_document": filename,
        "sources": sources,
        "related_concepts": related_concepts,
        "difficulty_level": "medium" if len(answer_text.split()) > 20 else "easy",
        "follow_up_questions": follow_up_questions
    }
