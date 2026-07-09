import logging

logger = logging.getLogger(__name__)

class ChunkValidator:
    """Validates chunks before embedding generation to ensure quality."""
    
    @staticmethod
    def is_valid(text: str, min_words: int = 5, min_chars: int = 15) -> bool:
        """
        Validates if a chunk contains enough substantive information to be embedded.
        """
        if not text:
            return False
            
        text = text.strip()
        words = text.split()
        
        # Discard empty, overly short, or purely numeric chunks
        if len(words) < min_words:
            return False
            
        if len(text) < min_chars:
            return False
            
        # Optional: check if it's just special characters
        import re
        if re.fullmatch(r'[\W_0-9]+', text):
            return False
            
        return True
