from typing import List, Dict
from bson import ObjectId

class ParentChildChunker:
    """Builds hierarchical Parent-Child chunks for granular retrieval with broad context."""

    def build_hierarchy(self, natural_chunks: List[Dict], max_child_words: int = 150) -> Dict[str, List[Dict]]:
        """
        Takes large parent chunks (from NaturalSplitter) and breaks them into smaller child chunks.
        Embeddings will be generated for the child chunks.
        """
        parent_chunks = []
        child_chunks = []
        
        for p_index, p_chunk in enumerate(natural_chunks):
            parent_id = str(ObjectId())
            parent_text = p_chunk.get("text", "")
            
            parent_record = {
                "id": parent_id,
                "text": parent_text,
                "type": "parent",
                "index": p_index
            }
            parent_chunks.append(parent_record)
            
            # Split parent into children
            words = parent_text.split()
            current_child_words = []
            c_index = 0
            
            for word in words:
                current_child_words.append(word)
                if len(current_child_words) >= max_child_words:
                    child_chunks.append({
                        "id": str(ObjectId()),
                        "parent_id": parent_id,
                        "text": " ".join(current_child_words),
                        "type": "child",
                        "index": c_index
                    })
                    current_child_words = []
                    c_index += 1
                    
            if current_child_words:
                child_chunks.append({
                    "id": str(ObjectId()),
                    "parent_id": parent_id,
                    "text": " ".join(current_child_words),
                    "type": "child",
                    "index": c_index
                })
                
        return {
            "parents": parent_chunks,
            "children": child_chunks
        }
