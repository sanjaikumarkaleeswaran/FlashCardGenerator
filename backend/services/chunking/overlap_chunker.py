from typing import List, Dict

class OverlapChunker:
    """Applies contextual overlap to sequential chunks."""
    
    def __init__(self, overlap_words: int = 150):
        self.overlap_words = overlap_words

    def apply_overlap(self, chunks: List[Dict]) -> List[Dict]:
        """
        Appends the first `overlap_words` of the next chunk to the end of the current chunk,
        and prepends the last `overlap_words` of the previous chunk to the start of the current chunk
        to preserve context continuity.
        """
        if not chunks:
            return []
            
        processed_chunks = []
        
        for i, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            words = text.split()
            
            prefix_overlap = ""
            suffix_overlap = ""
            
            if i > 0:
                prev_text = chunks[i-1].get("text", "")
                prev_words = prev_text.split()
                if len(prev_words) > self.overlap_words:
                    prefix_overlap = " ".join(prev_words[-self.overlap_words:])
                else:
                    prefix_overlap = prev_text
                    
            if i < len(chunks) - 1:
                next_text = chunks[i+1].get("text", "")
                next_words = next_text.split()
                if len(next_words) > self.overlap_words:
                    suffix_overlap = " ".join(next_words[:self.overlap_words])
                else:
                    suffix_overlap = next_text
                    
            # Build the contextualized text, but keep the original text preserved for exact matching if needed
            contextual_text = f"{prefix_overlap}\n\n[...]\n\n{text}\n\n[...]\n\n{suffix_overlap}".strip()
            if not prefix_overlap and not suffix_overlap:
                contextual_text = text
                
            new_chunk = chunk.copy()
            new_chunk["contextual_text"] = contextual_text
            processed_chunks.append(new_chunk)
            
        return processed_chunks
