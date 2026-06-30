import io
from pypdf import PdfReader
import docx

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file bytes using pypdf."""
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file bytes using python-docx."""
    docx_file = io.BytesIO(file_bytes)
    doc = docx.Document(docx_file)
    text = ""
    for para in doc.paragraphs:
        if para.text:
            text += para.text + "\n"
    return text

def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text from TXT file bytes supporting UTF-8 and Latin-1."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1")

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Unified function to extract text based on file extension."""
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    elif ext in ["txt", "text"]:
        return extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file format: .{ext}")
