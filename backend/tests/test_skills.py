from app.ai.skill_extractor import extract_skills, canonicalize

def test_extract():
    assert extract_skills("Python and React") == ["python", "react"]
    assert "java" not in extract_skills("javascript")

def test_alias():
    assert canonicalize(["ReactJS", "postgres"]) == ["postgresql", "react"]
