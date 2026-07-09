import logging
from typing import List, Dict, Any
from services.embeddings import generate_embedding_for_text, cosine_similarity
from services.chunking.sentence_window import SentenceWindow
from database import document_chunks_collection

logger = logging.getLogger(__name__)

class EnterpriseRetriever:
    """Advanced Retrieval Pipeline."""
    
    def __init__(self):
        self.sentence_window = SentenceWindow()

    async def retrieve(self, query: str, user_id: str, document_ids: List[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        1. Semantic Search
        2. Top K
        3. Parent Retrieval
        4. Sentence Window Expansion
        5. Duplicate Removal
        """
        query_embedding = generate_embedding_for_text(query)
        if not query_embedding:
            logger.error("Failed to generate embedding for query.")
            return []
            
        # MongoDB Semantic Search
        match_stage = {"user_id": user_id}
        if document_ids:
            match_stage["document_id"] = {"$in": document_ids}
            
        cursor = document_chunks_collection.find(match_stage)
        all_chunks = await cursor.to_list(length=1000)
        
        # Calculate similarity
        scored_chunks = []
        for chunk in all_chunks:
            if "embedding" in chunk and chunk["embedding"]:
                score = cosine_similarity(query_embedding, chunk["embedding"])
                if score >= 0.2: # Base confidence threshold
                    scored_chunks.append({
                        "chunk": chunk,
                        "score": score
                    })
                    
        # Sort by Top K
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        top_chunks = scored_chunks[:top_k]
        
        # Expand Context (Parent Retrieval & Sentence Window)
        final_context = []
        seen_parents = set()
        
        for item in top_chunks:
            chunk = item["chunk"]
            score = item["score"]
            parent_id = chunk.get("parent_chunk_id")
            
            # Parent Retrieval Duplicate Removal
            if parent_id and parent_id in seen_parents:
                continue
                
            if parent_id:
                seen_parents.add(parent_id)
                
            # Sentence Window expansion (simulated via full parent text retrieval)
            # In a true sentence window, we'd pull the exact sentence. For now, parent text IS the context block.
            context_text = chunk.get("parent_text") or chunk.get("child_text") or chunk.get("text")
            
            final_context.append({
                "context": context_text,
                "score": score,
                "document_name": chunk.get("metadata", {}).get("document_name", "Unknown Document"),
                "page_number": chunk.get("metadata", {}).get("page_number", 1)
            })
            
        return final_context
