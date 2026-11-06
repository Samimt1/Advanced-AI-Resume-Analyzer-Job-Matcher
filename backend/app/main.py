from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from app.ai.resume_parser import extract_resume_text
from app.ai.matcher import match_resume

app = FastAPI(title="CareerMatch AI API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

class MatchRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=25000)
    job_description: str = Field(min_length=20, max_length=25000)
    required_skills: list[str] = Field(default_factory=list, max_length=60)
    preferred_skills: list[str] = Field(default_factory=list, max_length=60)

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.post("/api/v1/resumes/parse")
async def parse_resume(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(400, "PDF or DOCX required")
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Maximum file size is 5 MB")
    if filename.lower().endswith(".pdf") and not data.startswith(b"%PDF-"):
        raise HTTPException(400, "Invalid PDF")
    if filename.lower().endswith(".docx") and not data.startswith(b"PK"):
        raise HTTPException(400, "Invalid DOCX")
    try:
        text = await run_in_threadpool(extract_resume_text, data, filename)
    except Exception:
        raise HTTPException(422, "Cannot extract readable text")
    if len(text) > 25000:
        raise HTTPException(422, "Extracted text too long")
    return {"filename": filename, "text": text}

@app.post("/api/v1/matches/analyze")
async def analyze(payload: MatchRequest):
    try:
        return await run_in_threadpool(match_resume, payload.resume_text,
            payload.job_description, payload.required_skills, payload.preferred_skills)
    except Exception:
        raise HTTPException(503, "AI matching temporarily unavailable")
