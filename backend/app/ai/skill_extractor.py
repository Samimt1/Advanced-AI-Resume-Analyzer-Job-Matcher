import re

ALIASES = {
    "python": ["python"], "javascript": ["javascript"],
    "typescript": ["typescript"], "react": ["react", "react.js", "reactjs"],
    "next.js": ["next.js", "nextjs"], "node.js": ["node.js", "nodejs"],
    "fastapi": ["fastapi"], "postgresql": ["postgresql", "postgres"],
    "docker": ["docker"], "aws": ["aws", "amazon web services"],
    "machine learning": ["machine learning"], "tensorflow": ["tensorflow"],
    "pytorch": ["pytorch"], "java": ["java"], "redis": ["redis"],
    "sql": ["sql"], "rest api": ["rest api", "restful api", "rest apis"],
}

def canonicalize(items: list[str]) -> list[str]:
    result = set()
    for item in items:
        item = item.strip().casefold()
        if not item:
            continue
        result.add(next((key for key, aliases in ALIASES.items()
                         if item == key or item in aliases), item))
    return sorted(result)

def extract_skills(text: str) -> list[str]:
    text = text.casefold()
    return sorted(key for key, aliases in ALIASES.items()
                  if any(re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", text)
                         for alias in aliases))
