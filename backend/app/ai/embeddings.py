from functools import lru_cache
from sentence_transformers import SentenceTransformer

@lru_cache(maxsize=1)
def model():
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def semantic_score(resume: str, job: str) -> float:
    vectors = model().encode([resume, job], normalize_embeddings=True)
    return max(0.0, min(100.0, float(vectors[0] @ vectors[1]) * 100))
