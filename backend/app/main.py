
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.ai.resume_parser import extract_resume_text
from app.ai.matcher import match_resume


# ==========================================================
# Configuration
# ==========================================================

APP_NAME = "CareerMatch AI API"
APP_VERSION = "1.0.0"

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_TEXT_LENGTH = 25000

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

ALLOWED_MIME_TYPES = {
    ".pdf": {
        "application/pdf",
        "application/octet-stream",
    },
    ".docx": {
        "application/vnd.openxmlformats-officedocument."
        "wordprocessingml.document",
        "application/octet-stream",
    },
}

FRONTEND_URLS = [
    url.strip()
    for url in os.getenv(
        "FRONTEND_URLS",
        "http://localhost:3000",
    ).split(",")
    if url.strip()
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("careermatch")


# ==========================================================
# Application Lifecycle
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", APP_NAME, APP_VERSION)
    yield
    logger.info("Shutting down %s", APP_NAME)


app = FastAPI(
    title=APP_NAME,
    description=(
        "AI-powered resume parsing, skill matching, "
        "and job compatibility analysis."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
)


# ==========================================================
# CORS Configuration
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ==========================================================
# Request / Response Models
# ==========================================================

class MatchRequest(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    resume_text: str = Field(
        min_length=20,
        max_length=MAX_TEXT_LENGTH,
        description="Extracted resume content",
    )

    job_description: str = Field(
        min_length=20,
        max_length=MAX_TEXT_LENGTH,
        description="Target job description",
    )

    required_skills: list[str] = Field(
        default_factory=list,
        max_length=60,
    )

    preferred_skills: list[str] = Field(
        default_factory=list,
        max_length=60,
    )

    @field_validator(
        "required_skills",
        "preferred_skills",
    )
    @classmethod
    def validate_skills(cls, skills: list[str]) -> list[str]:
        cleaned = []
        seen = set()

        for skill in skills:
            if not isinstance(skill, str):
                raise ValueError("Each skill must be a string")

            skill = skill.strip()

            if not skill:
                continue

            if len(skill) > 100:
                raise ValueError(
                    "Each skill must be at most 100 characters"
                )

            key = skill.casefold()

            if key not in seen:
                seen.add(key)
                cleaned.append(skill)

        return cleaned


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ResumeParseResponse(BaseModel):
    filename: str
    text: str
    character_count: int
    word_count: int


# ==========================================================
# Utility Functions
# ==========================================================

def validate_file_signature(
    data: bytes,
    extension: str,
) -> None:
    if extension == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file signature",
            )

    elif extension == ".docx":
        if not data.startswith(b"PK\x03\x04"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid DOCX file signature",
            )


def normalize_text(text: str) -> str:
    return " ".join(text.split())


# ==========================================================
# Health Endpoint
# ==========================================================

@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["Health"],
)
async def health_check():
    return HealthResponse(
        status="healthy",
        service=APP_NAME,
        version=APP_VERSION,
    )


# ==========================================================
# Resume Parsing Endpoint
# ==========================================================

@app.post(
    "/api/v1/resumes/parse",
    response_model=ResumeParseResponse,
    tags=["Resume"],
    status_code=status.HTTP_200_OK,
)
async def parse_resume(
    file: Annotated[UploadFile, File(
        description="Upload a PDF or DOCX resume"
    )],
):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    try:
        # Validate filename and extension
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF and DOCX files are supported",
            )

        # Validate declared MIME type
        if file.content_type not in ALLOWED_MIME_TYPES[extension]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file content type",
            )

        # Read with a strict size limit
        data = await file.read(MAX_FILE_SIZE + 1)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="Maximum allowed file size is 5 MB",
            )

        # Validate basic file signature
        validate_file_signature(data, extension)

        # Extract resume text
        try:
            extracted_text = await run_in_threadpool(
                extract_resume_text,
                data,
                filename,
            )

        except Exception:
            logger.exception("Resume extraction failed")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Unable to extract readable resume text",
            )

        if not isinstance(extracted_text, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Resume parser returned invalid text",
            )

        extracted_text = normalize_text(extracted_text)

        if len(extracted_text) < 20:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Resume contains insufficient readable text",
            )

        if len(extracted_text) > MAX_TEXT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Extracted resume exceeds 25,000 characters",
            )

        logger.info("Resume parsed successfully")

        return ResumeParseResponse(
            filename=filename,
            text=extracted_text,
            character_count=len(extracted_text),
            word_count=len(extracted_text.split()),
        )

    finally:
        await file.close()


# ==========================================================
# AI Job Matching Endpoint
# ==========================================================

@app.post(
    "/api/v1/matches/analyze",
    tags=["AI Matching"],
    status_code=status.HTTP_200_OK,
)
async def analyze_resume(payload: MatchRequest):
    try:
        logger.info("Starting resume matching analysis")

        result = await run_in_threadpool(
            match_resume,
            payload.resume_text,
            payload.job_description,
            payload.required_skills,
            payload.preferred_skills,
        )

        if not isinstance(result, dict):
            logger.error("Matcher returned an invalid result")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI matching returned an invalid response",
            )

        logger.info("Resume matching completed")

        return result

    except HTTPException:
        raise

    except (ValueError, TypeError):
        logger.exception("Invalid matching input or result")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unable to process matching data",
        )

    except Exception:
        logger.exception("Unexpected AI matching error")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI matching service temporarily unavailable",
        )


# ==========================================================
# Global Unexpected Error Handler
# ==========================================================

@app.exception_handler(Exception)
async def unexpected_error_handler(request, exc):
    logger.error(
        "Unhandled error on %s",
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred"
        },
    )
