from datetime import datetime, timezone
from typing import Dict, Any

class MetadataBuilder:
    """Standardizes chunk metadata across the pipeline."""
    
    @staticmethod
    def build(
        document_id: str,
        document_name: str,
        text: str,
        parent_chunk_id: str = None,
        child_chunk_id: str = None,
        page_number: int = 1,
        chunk_index: int = 0
    ) -> Dict[str, Any]:
        """Returns a standardized metadata dictionary."""
        return {
            "document_id": document_id,
            "document_name": document_name,
            "page_number": page_number,
            "chunk_index": chunk_index,
            "parent_chunk_id": parent_chunk_id,
            "child_chunk_id": child_chunk_id,
            "char_count": len(text),
            "word_count": len(text.split()),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
