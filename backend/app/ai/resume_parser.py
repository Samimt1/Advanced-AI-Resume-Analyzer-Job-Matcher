from io import BytesIO
from pathlib import Path
import fitz
from docx import Document

def extract_resume_text(data: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        with fitz.open(stream=data, filetype="pdf") as pdf:
            if len(pdf) > 15:
                raise ValueError("Maximum 15 pages")
            text = "\n".join(page.get_text() for page in pdf)
    elif ext == ".docx":
        doc = Document(BytesIO(data))
        lines = [p.text for p in doc.paragraphs]
        for table in doc.tables:
            for row in table.rows:
                lines.append(" | ".join(cell.text for cell in row.cells))
        text = "\n".join(lines)
    else:
        raise ValueError("Only PDF and DOCX supported")
    if not text.strip():
        raise ValueError("No readable text found")
    return text.strip()
