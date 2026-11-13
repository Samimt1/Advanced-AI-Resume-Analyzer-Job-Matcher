# CareerMatch AI — Advanced AI Resume Analyzer & Job Matcher

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript)
![Status](https://img.shields.io/badge/status-active_development-orange)

**CareerMatch AI** is a full-stack application that compares a candidate's resume with a job description using semantic similarity and skill matching. Upload a resume or paste its text to see an interpretable match score, required and preferred skill coverage, and missing skills.

**[Live frontend demo](https://advanced-ai-resume-analyzer-job-mat.vercel.app/)** · **[Source code](https://github.com/Samimt1/Advanced-AI-Resume-Analyzer-Job-Matcher)**

> **Deployment note:** The live link is a Vercel frontend deployment. Resume parsing and matching require an accessible FastAPI backend and a correctly configured `NEXT_PUBLIC_API_URL`. The frontend link alone does not guarantee the analysis API is online.

## Features

- **PDF and DOCX resume upload:** Drag-and-drop or browse; extracts text from supported documents.
- **Manual resume editing:** Paste or edit extracted resume content before analysis.
- **Job description matching:** Compare a resume with a target job posting.
- **Semantic similarity:** Uses the `all-MiniLM-L6-v2` Sentence Transformers model.
- **Skill comparison:** Checks required and preferred skills, identifying matches and gaps.
- **Visual results:** Displays an overall score, score breakdown, progress indicators, and searchable skills.
- **Export:** Download analysis results as a JSON report.
- **Validation:** Limits uploads to 5 MB and checks supported formats and text lengths.
- **Interactive UI:** Responsive Next.js dashboard with Tailwind CSS, shadcn-style components, animations, and toast messages.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| UI | Radix UI, Lucide React, Framer Motion, Sonner |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| NLP | Sentence Transformers, `all-MiniLM-L6-v2` |
| Resume parsing | PyMuPDF, python-docx |
| Testing | pytest |
| Optional local infrastructure | Docker Compose, PostgreSQL/pgvector, Redis |
| Frontend hosting | Vercel |

> PostgreSQL and Redis are defined in the infrastructure Compose file, but the current resume parsing and matching endpoints do not rely on them.

## Project Structure

```text
Advanced-AI-Resume-Analyzer-Job-Matcher/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── embeddings.py
│   │   │   ├── matcher.py
│   │   │   ├── resume_parser.py
│   │   │   └── skill_extractor.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_skills.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/ui/
│   │   └── lib/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── infrastructure/
│   └── docker-compose.yml
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20 or later and npm
- Python 3.10 or later
- Git
- Internet access on the first model download

### 1. Clone the repository

```bash
git clone https://github.com/Samimt1/Advanced-AI-Resume-Analyzer-Job-Matcher.git
cd Advanced-AI-Resume-Analyzer-Job-Matcher
```

### 2. Start the backend

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend: **http://localhost:8000**  
Interactive API documentation: **http://localhost:8000/docs**

The embedding model is downloaded when first used; this initial request can take longer.

### 3. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Start the development server:

```bash
npm run dev
```

Open **http://localhost:3000**.

### 4. Configure CORS when using another frontend origin

The backend accepts `http://localhost:3000` by default. To allow other origins, set the `FRONTEND_URLS` environment variable before launching Uvicorn, for example:

```dotenv
FRONTEND_URLS=http://localhost:3000,https://your-frontend-domain.vercel.app
```

Use the real deployed frontend URL rather than the placeholder above.

## How to Use

1. Upload a PDF/DOCX resume (max 5 MB) or paste resume text.
2. Enter the job description.
3. Customize the comma-separated required and preferred skills.
4. Click the analysis button to run the comparison.
5. Review semantic similarity, skill coverage, and missing skills.
6. Download the JSON report if needed.

PDF extraction works best with text-based PDFs. Scanned image-only PDFs are not OCR-processed by the current parser. The PDF parser limits documents to 15 pages.

## API Reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health/version |
| POST | `/api/v1/resumes/parse` | Extract text from a PDF or DOCX upload |
| POST | `/api/v1/matches/analyze` | Analyze resume/job compatibility |

### Parse a resume

```bash
curl -X POST http://localhost:8000/api/v1/resumes/parse \
  -F "file=@resume.pdf"
```

### Analyze a match

```bash
curl -X POST http://localhost:8000/api/v1/matches/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Full stack developer experienced with Python, React, FastAPI, REST APIs and PostgreSQL.",
    "job_description": "We are hiring a developer with Python, React, FastAPI, Docker and AWS experience.",
    "required_skills": ["Python", "React", "FastAPI"],
    "preferred_skills": ["Docker", "AWS"]
  }'
```

The response includes:

```json
{
  "overall_score": 0,
  "semantic_score": 0,
  "required_skill_score": 0,
  "preferred_skill_score": 0,
  "matched_required_skills": [],
  "missing_required_skills": [],
  "matched_preferred_skills": [],
  "extracted_skills": [],
  "disclaimer": "Heuristic alignment score, not hiring probability. Experience not evaluated."
}
```

*The numeric values and arrays above are placeholders illustrating the response schema, not a sample model prediction.*

## Matching Method

The backend combines:

- Semantic similarity between the resume and job description.
- Coverage of explicitly provided required skills.
- Coverage of explicitly provided preferred skills.

The current implementation computes:

```text
overall_score = 0.35 × semantic_score
              + 0.40 × required_skill_score
              + 0.15 × preferred_skill_score
```

**Important:** The current formula allocates 90% of the possible 100-point scale. Therefore the maximum overall score is 90, not 100. The experience component is not implemented. Scores are heuristic indicators of text/skill alignment, **not predictions of interview selection or hiring probability**.

## Testing

From the `backend/` directory, with the virtual environment activated:

```bash
pytest -q
```

For frontend type checking:

```bash
cd frontend
npm run typecheck
```

## Deployment

### Frontend on Vercel

1. Import the GitHub repository in Vercel.
2. Set the **Root Directory** to `frontend`.
3. Configure `NEXT_PUBLIC_API_URL` with the publicly accessible backend API base URL, ending in `/api/v1`.
4. Deploy or redeploy after changing environment variables.

Live frontend URL: **https://advanced-ai-resume-analyzer-job-mat.vercel.app/**

### Backend

Deploy `backend/` to a Python-compatible hosting service and start it using:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Configure `FRONTEND_URLS` to allow your Vercel domain and ensure the hosting platform has enough memory for the sentence-transformers model. Configure the host's assigned port if it differs from 8000.

### Optional local infrastructure

To start the PostgreSQL/pgvector and Redis services:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

These services are **not required** for the current core API endpoints.

## Limitations and Roadmap

Current limitations:
- No OCR for image-only or scanned resumes.
- No verified work-experience evaluation or hiring-probability prediction.
- Heuristic matching accuracy depends on the resume text and skill lists.
- The matching formula's maximum is 90 until its weighting is revised.
- No persisted user accounts or job history in the current codebase.

Possible future enhancements:
- Resume improvement suggestions and keyword explanations.
- OCR support for scanned documents.
- Authentication and saved analysis history.
- Database-backed profiles and job listings.
- Better calibrated scores, evaluation datasets, and skill normalization.
- PDF report export and production monitoring.

## Contributing

Issues and pull requests are welcome. Please include clear reproduction steps for bugs and verify changes with the existing tests.

## Author

**Samuel Esubalew** — Software Engineering graduate & Full Stack Developer

- GitHub: [@Samimt1](https://github.com/Samimt1)
- Portfolio: [my-portfolia-woad.vercel.app](https://my-portfolia-woad.vercel.app/)

---

*Built to help job seekers understand how their resumes align with job descriptions.*
