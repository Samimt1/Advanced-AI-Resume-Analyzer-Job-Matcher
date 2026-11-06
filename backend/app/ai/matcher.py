from .embeddings import semantic_score
from .skill_extractor import canonicalize, extract_skills

def match_resume(resume: str, job: str, required: list[str],
                 preferred: list[str] | None = None) -> dict:
    found = set(extract_skills(resume))
    required_set = set(canonicalize(required))
    preferred_set = set(canonicalize(preferred or []))
    required_score = 100 * len(found & required_set) / len(required_set) if required_set else 100
    preferred_score = 100 * len(found & preferred_set) / len(preferred_set) if preferred_set else 100
    semantic = semantic_score(resume, job)
    # Experience extraction not implemented; use 0 rather than invent evidence.
    overall = .35 * semantic + .40 * required_score + .15 * preferred_score
    return {
        "overall_score": round(overall, 2),
        "semantic_score": round(semantic, 2),
        "required_skill_score": round(required_score, 2),
        "preferred_skill_score": round(preferred_score, 2),
        "matched_required_skills": sorted(found & required_set),
        "missing_required_skills": sorted(required_set - found),
        "matched_preferred_skills": sorted(found & preferred_set),
        "extracted_skills": sorted(found),
        "disclaimer": "Heuristic alignment score, not hiring probability. Experience not evaluated."
    }
