import re
from typing import List, Dict
from services.nlp_generator import get_nlp
import logging

logger = logging.getLogger(__name__)

class NaturalSplitter:
    """Splits text using natural semantic boundaries without breaking context."""

    def __init__(self, max_chunk_words: int = 800):
        self.max_chunk_words = max_chunk_words
        self.nlp = get_nlp()

    def split_document(self, text: str) -> List[Dict]:
        """
        Splits text by:
        1. Double newlines (paragraphs/headings)
        2. Sentences (if paragraphs are too large)
        Returns a list of dicts with text and rough structural metadata.
        """
        if not text or not text.strip():
            return []

        # Simple heuristic: Split by paragraphs first
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        
        chunks = []
        current_chunk_text = ""
        current_word_count = 0
        
        for para in paragraphs:
            para_word_count = len(para.split())
            
            if current_word_count + para_word_count <= self.max_chunk_words:
                current_chunk_text += ("\n\n" + para if current_chunk_text else para)
                current_word_count += para_word_count
            else:
                if current_chunk_text:
                    chunks.append({"text": current_chunk_text.strip()})
                
                # If a single paragraph is larger than max words, we split by sentences
                if para_word_count > self.max_chunk_words and self.nlp:
                    doc = self.nlp(para)
                    sentence_chunks = []
                    current_sent_chunk = ""
                    current_sent_wc = 0
                    
                    for sent in doc.sents:
                        sent_text = sent.text.strip()
                        sent_wc = len(sent_text.split())
                        if current_sent_wc + sent_wc <= self.max_chunk_words:
                            current_sent_chunk += (" " + sent_text if current_sent_chunk else sent_text)
                            current_sent_wc += sent_wc
                        else:
                            if current_sent_chunk:
                                sentence_chunks.append({"text": current_sent_chunk.strip()})
                            current_sent_chunk = sent_text
                            current_sent_wc = sent_wc
                    
                    if current_sent_chunk:
                        sentence_chunks.append({"text": current_sent_chunk.strip()})
                    
                    chunks.extend(sentence_chunks)
                    current_chunk_text = ""
                    current_word_count = 0
                else:
                    current_chunk_text = para
                    current_word_count = para_word_count
                    
        if current_chunk_text:
            chunks.append({"text": current_chunk_text.strip()})
            
        return chunks
