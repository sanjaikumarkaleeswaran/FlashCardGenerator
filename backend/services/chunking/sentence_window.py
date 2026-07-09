from typing import List, Dict
from services.nlp_generator import get_nlp

class SentenceWindow:
    """Builds sliding sentence windows for pinpoint retrieval context."""
    
    def __init__(self, window_prev: int = 2, window_next: int = 2):
        self.window_prev = window_prev
        self.window_next = window_next
        self.nlp = get_nlp()

    def build_windows(self, text: str) -> List[Dict]:
        """
        Splits text into sentences and creates a window for each sentence.
        """
        if not self.nlp or not text:
            return [{"text": text, "window": text}]
            
        doc = self.nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        
        windows = []
        for i, sent in enumerate(sentences):
            start = max(0, i - self.window_prev)
            end = min(len(sentences), i + self.window_next + 1)
            
            window_context = " ".join(sentences[start:end])
            
            windows.append({
                "sentence": sent,
                "window_context": window_context,
                "index": i
            })
            
        return windows
