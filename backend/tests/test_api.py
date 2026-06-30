import sys
import os
import random
import string
import requests
import json
import io
import docx

# Add parent directory to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.nlp_generator import (
    generate_flashcards_upgraded,
    generate_qa,
    generate_fillups,
    generate_mcq,
    get_nlp
)
from services.document_processor import (
    extract_text_from_docx,
    extract_text_from_txt,
    extract_text
)

def test_document_extraction():
    """Verify document processing services for DOCX and TXT."""
    print("==================================================")
    print(" RUNNING DOCUMENT EXTRACTION TESTS")
    print("==================================================")
    
    # 1. Test TXT
    sample_txt = b"Photosynthesis occurs inside chloroplasts of green plants."
    text_txt = extract_text_from_txt(sample_txt)
    print(f"TXT Extracted: '{text_txt}'")
    assert "chloroplasts" in text_txt, "TXT extraction failed"
    print("[OK] TXT extraction passed.")

    # 2. Test DOCX (generate in-memory DOCX file using python-docx)
    doc = docx.Document()
    doc.add_paragraph("Albert Einstein developed relativity in 1915.")
    f_stream = io.BytesIO()
    doc.save(f_stream)
    docx_bytes = f_stream.getvalue()
    
    text_docx = extract_text_from_docx(docx_bytes)
    print(f"DOCX Extracted: '{text_docx}'")
    assert "Einstein" in text_docx, "DOCX extraction failed"
    print("[OK] DOCX extraction passed.")
    print("==================================================\n")

def test_upgraded_nlp_engine():
    """Test upgraded MCQ, Fillups, and QA rules in nlp_generator."""
    print("==================================================")
    print(" RUNNING UPGRADED NLP ENGINE TESTS")
    print("==================================================")
    
    engine = get_nlp()
    if engine is None:
        print("spaCy model not loaded. Skipping NLP tests.")
        return

    notes = (
        "Photosynthesis is the process plants use to convert sunlight into food. "
        "Mitochondria are the powerhouse of the cell. "
        "Albert Einstein developed the theory of relativity. "
        "The declaration was signed in Philadelphia in 1776."
    )

    # 1. Test QA Generation
    qa_cards = generate_flashcards_upgraded(notes, count=5, card_type="qa")
    print(f"\nGenerated {len(qa_cards)} QA cards:")
    for c in qa_cards:
        print(f"  Q: {c['question']} | A: {c['answer']}")
    assert len(qa_cards) > 0
    assert qa_cards[0]["type"] == "qa"
    print("[OK] QA generation test passed.")

    # 2. Test Fillups Generation
    fill_cards = generate_flashcards_upgraded(notes, count=5, card_type="fillup")
    print(f"\nGenerated {len(fill_cards)} Fill-in-the-blank cards:")
    for c in fill_cards:
        print(f"  Q: {c['question']} | A: {c['answer']}")
    assert len(fill_cards) > 0
    assert fill_cards[0]["type"] == "fillup"
    assert "______" in fill_cards[0]["question"]
    print("[OK] Fill-in-the-blank generation test passed.")

    # 3. Test MCQ Generation
    mcq_cards = generate_flashcards_upgraded(notes, count=5, card_type="mcq")
    print(f"\nGenerated {len(mcq_cards)} MCQ cards:")
    for c in mcq_cards:
        print(f"  Q: {c['question']}")
        print(f"  Correct Answer: {c['answer']}")
        print(f"  Options: {c['options']}")
    assert len(mcq_cards) > 0
    assert mcq_cards[0]["type"] == "mcq"
    assert len(mcq_cards[0]["options"]) == 4
    assert mcq_cards[0]["answer"] in mcq_cards[0]["options"]
    print("[OK] MCQ generation test passed.")

    # 4. Test Card Count parameter
    trimmed_cards = generate_flashcards_upgraded(notes, count=2, card_type="qa")
    assert len(trimmed_cards) <= 2
    print(f"[OK] Count limits parameter test passed (Count: {len(trimmed_cards)}).")
    print("==================================================\n")

def test_api_endpoints(base_url="http://127.0.0.1:8000"):
    """Run integration tests against a running FastAPI instance on localhost."""
    print("==================================================")
    print(" RUNNING INTEGRATION TESTS AGAINST ACTIVE API")
    print("==================================================")
    print(f"Targeting server: {base_url}")
    
    try:
        response = requests.get(base_url)
        if response.status_code != 200:
            print(f"Server returned status code {response.status_code}. Aborting API tests.")
            return
    except requests.exceptions.ConnectionError:
        print("FastAPI server is not running on localhost. Skipping active API tests.")
        print("Tip: Start the FastAPI server using `uvicorn main:app --reload` first.")
        return

    # 1. Register User
    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
    test_email = f"student_{rand_suffix}@test.com"
    test_password = "password123"
    
    register_payload = {
        "email": test_email,
        "password": test_password
    }
    
    print(f"\n[1] Registering user: {test_email}")
    reg_res = requests.post(f"{base_url}/api/register", json=register_payload)
    assert reg_res.status_code == 201, "User registration failed"
    
    # 2. Login User
    login_payload = {
        "email": test_email,
        "password": test_password
    }
    print(f"\n[2] Logging in user: {test_email}")
    login_res = requests.post(f"{base_url}/api/login", json=login_payload)
    assert login_res.status_code == 200, "Login failed"
    
    token_data = login_res.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Token retrieved successfully.")

    # 3. Test File Upload
    print("\n[3] Testing document upload /api/documents/upload...")
    file_content = b"Photosynthesis occurs inside chloroplasts of plants. Sunlight energy is required."
    files = {"file": ("photosynthesis.txt", file_content, "text/plain")}
    
    upload_res = requests.post(
        f"{base_url}/api/documents/upload",
        files=files,
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Upload Response Status: {upload_res.status_code}")
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    document_id = doc_data["document_id"]
    print(f"Uploaded Document ID: {document_id}")
    
    # 4. Generate from Document Source
    print("\n[4] Generating MCQs from Document Source ID...")
    gen_payload = {
        "source": document_id,
        "count": 5,
        "type": "mcq"
    }
    gen_res = requests.post(f"{base_url}/api/flashcards/generate", json=gen_payload, headers=headers)
    print(f"Generation Response Status: {gen_res.status_code}")
    assert gen_res.status_code == 201
    set_data = gen_res.json()
    print(f"Generated Set Title: {set_data['title']}")
    print(f"Source Type: {set_data['source_type']}")
    print(f"Flashcard Type: {set_data['flashcard_type']}")
    print(f"Cards Count: {len(set_data['cards'])}")
    assert len(set_data["cards"]) > 0
    assert set_data["cards"][0]["type"] == "mcq"
    
    # 5. Fetch History
    print("\n[5] Fetching history...")
    history_res = requests.get(f"{base_url}/api/flashcards", headers=headers)
    assert history_res.status_code == 200
    sets = history_res.json()
    print(f"Total sets in history: {len(sets)}")
    assert sets[0]["source_type"] == "txt"
    assert sets[0]["flashcard_type"] == "mcq"
    
    # 6. Fetch Review Queue
    print("\n[6] Fetching review queue...")
    review_res = requests.get(f"{base_url}/api/review", headers=headers)
    assert review_res.status_code == 200
    queue = review_res.json()
    print(f"Cards in queue: {len(queue)}")
    assert len(queue) > 0
    assert queue[0]["type"] == "mcq"
    
    # 7. Update Card Review Status
    target_card_id = queue[0]["id"]
    update_payload = {
        "cardId": target_card_id,
        "status": "known"
    }
    update_res = requests.post(f"{base_url}/api/review/update", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    print("[OK] Review update API verified.")
    
    print("\nALL API INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")

if __name__ == "__main__":
    test_document_extraction()
    test_upgraded_nlp_engine()
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    test_api_endpoints(url)
