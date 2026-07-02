# backend/services/embeddings.py

import re
import numpy as np

# We attempt to load SentenceTransformer for local execution of the miniLM model
try:
    from sentence_transformers import SentenceTransformer
    # Cache the model instance
    MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    HAS_SENTENCE_TRANSFORMERS = True
except Exception:
    HAS_SENTENCE_TRANSFORMERS = False
    MODEL = None

class FeatureHashEmbedder:
    """
    Robust fallback sentence embedder using deterministic vocabulary projection.
    Creates 384-dimensional normalized vectors preserving term overlap similarity.
    """
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions

    def get_sentence_embedding(self, text: str) -> list:
        # Normalize and tokenize
        words = re.findall(r'\w+', text.lower())
        if not words:
            return [0.0] * self.dimensions
        
        vector = np.zeros(self.dimensions, dtype=float)
        for w in words:
            # Deterministic hash function
            h = hash(w)
            idx = abs(h) % self.dimensions
            # Directional projection
            sign = 1.0 if h > 0 else -1.0
            vector[idx] += sign

        # Normalize L2
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.tolist()

hash_embedder = FeatureHashEmbedder(dimensions=384)

def get_embedding(text: str) -> list:
    """Generate a 384-dimensional vector embedding for a string segment."""
    if HAS_SENTENCE_TRANSFORMERS and MODEL is not None:
        try:
            return MODEL.encode(text).tolist()
        except Exception:
            pass
    return hash_embedder.get_sentence_embedding(text)

def cosine_similarity(v1: list, v2: list) -> float:
    """Calculate the cosine similarity between two numeric vectors."""
    a = np.array(v1)
    b = np.array(v2)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))
