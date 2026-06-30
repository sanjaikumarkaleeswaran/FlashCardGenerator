import sys
import os
import random
import string
import requests
import json

# Add parent directory to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.nlp_generator import generate_flashcards, get_nlp

def test_nlp_engine():
    """Run local unit tests on the NLP Question Generation rules."""
    print("==================================================")
    print(" RUNNING NLP ENGINE UNIT TESTS")
    print("==================================================")
    
    # Ensure NLP engine is initialized
    print("Loading spaCy...")
    engine = get_nlp()
    if engine is None:
        print("Warning: spaCy is not installed. Testing fallback regex engine.")
    else:
        print("spaCy model loaded successfully.")

    # Test 1: Definition
    note_def = "Photosynthesis is the process plants use to create food. Sunlight provides the energy."
    cards = generate_flashcards(note_def)
    print(f"\nInput Notes:\n'{note_def}'")
    print(f"Generated {len(cards)} flashcards.")
    for idx, card in enumerate(cards):
        print(f"  [{idx+1}] Q: {card['question']} | A: {card['answer']} | Diff: {card['difficulty']}")
    
    # Assertions
    assert len(cards) >= 1, "Failed to generate any cards for definition test"
    # Find definition question
    def_cards = [c for c in cards if "What is" in c["question"] or "What is photosynthesis" in c["question"]]
    if engine:
        assert len(def_cards) > 0, "Definition question pattern not matched"
        assert "photosynthesis" in def_cards[0]["question"].lower()
        assert "food" in def_cards[0]["answer"].lower()
        print("[OK] Definition matching rule passed.")

    # Test 2: Person (Who)
    note_person = "Albert Einstein developed the theory of relativity. He was a theoretical physicist."
    cards_p = generate_flashcards(note_person)
    print(f"\nInput Notes:\n'{note_person}'")
    print(f"Generated {len(cards_p)} flashcards.")
    for idx, card in enumerate(cards_p):
        print(f"  [{idx+1}] Q: {card['question']} | A: {card['answer']}")
    
    person_cards = [c for c in cards_p if "Who" in c["question"]]
    if engine:
        assert len(person_cards) > 0, "Person question pattern not matched"
        assert "relativity" in person_cards[0]["question"].lower()
        assert "albert einstein" in person_cards[0]["answer"].lower()
        print("[OK] Person matching rule passed.")

    # Test 3: Location (Where)
    note_loc = "Photosynthesis occurs in chloroplasts. This reaction takes place inside cells."
    cards_l = generate_flashcards(note_loc)
    print(f"\nInput Notes:\n'{note_loc}'")
    for idx, card in enumerate(cards_l):
        print(f"  [{idx+1}] Q: {card['question']} | A: {card['answer']}")
        
    loc_cards = [c for c in cards_l if "Where" in c["question"]]
    if engine:
        assert len(loc_cards) > 0, "Location question pattern not matched"
        assert "occurs" in loc_cards[0]["question"].lower() or "occur" in loc_cards[0]["question"].lower()
        assert "chloroplasts" in loc_cards[0]["answer"].lower()
        print("[OK] Location matching rule passed.")

    # Test 4: Time (When)
    note_time = "The company was founded in 1995. They started as an online bookstore."
    cards_t = generate_flashcards(note_time)
    print(f"\nInput Notes:\n'{note_time}'")
    for idx, card in enumerate(cards_t):
        print(f"  [{idx+1}] Q: {card['question']} | A: {card['answer']}")
        
    time_cards = [c for c in cards_t if "When" in c["question"]]
    if engine:
        assert len(time_cards) > 0, "Time question pattern not matched"
        assert "founded" in time_cards[0]["question"].lower()
        assert "1995" in time_cards[0]["answer"].lower()
        print("[OK] Time matching rule passed.")

    # Test 5: Fallback Cloze Deletion
    note_fallback = "Plants use sunlight to produce energy. This is a very critical biological action."
    cards_f = generate_flashcards(note_fallback)
    print(f"\nInput Notes:\n'{note_fallback}'")
    for idx, card in enumerate(cards_f):
        print(f"  [{idx+1}] Q: {card['question']} | A: {card['answer']}")
        
    fallback_cards = [c for c in cards_f if "______" in c["question"]]
    assert len(fallback_cards) > 0, "Cloze-deletion fallback failed to generate"
    assert "sunlight" in fallback_cards[0]["answer"].lower() or "energy" in fallback_cards[0]["answer"].lower()
    print("[OK] Fallback cloze deletion passed.")

    # Test 6: Short note validation
    short_note = "Short text."
    short_cards = generate_flashcards(short_note)
    assert len(short_cards) == 0, "Validation failed: generated cards from notes shorter than 30 characters"
    print("[OK] Notes length validation passed.")
    
    print("\nALL NLP ENGINE UNIT TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")

def test_api_endpoints(base_url="http://127.0.0.1:8000"):
    """Run integration tests against a running FastAPI instance on localhost."""
    print("==================================================")
    print(" RUNNING INTEGRATION TESTS AGAINST ACTIVE API")
    print("==================================================")
    print(f"Targeting server: {base_url}")
    
    try:
        # Ping root endpoint
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
    print(f"Response Status: {reg_res.status_code}")
    print(f"Response Body: {reg_res.text}")
    assert reg_res.status_code == 201, "User registration failed"
    
    # 2. Login User
    login_payload = {
        "email": test_email,
        "password": test_password
    }
    print(f"\n[2] Logging in user: {test_email}")
    login_res = requests.post(f"{base_url}/api/login", json=login_payload)
    print(f"Response Status: {login_res.status_code}")
    assert login_res.status_code == 200, "Login failed"
    
    token_data = login_res.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Token retrieved successfully.")
    
    # Verify current user endpoint
    me_res = requests.get(f"{base_url}/api/me", headers=headers)
    print(f"Verify /api/me: {me_res.json()}")
    assert me_res.status_code == 200

    # 3. Generate Flashcard Set
    notes_payload = {
        "notes": "FastAPI is a modern, fast, high-performance web framework. It is used for building APIs with Python 3.8+ based on standard Python type hints. The documentation is generated automatically."
    }
    print(f"\n[3] Posting study notes to generate flashcards...")
    gen_res = requests.post(f"{base_url}/api/flashcards/generate", json=notes_payload, headers=headers)
    print(f"Response Status: {gen_res.status_code}")
    assert gen_res.status_code == 201, "Flashcard generation failed"
    
    set_data = gen_res.json()
    set_id = set_data["id"]
    cards = set_data["cards"]
    print(f"Generated Set Title: {set_data['title']}")
    print(f"Number of cards generated: {len(cards)}")
    for c in cards[:2]:
        print(f"  Q: {c['question']} | A: {c['answer']} | ID: {c['id']}")
    assert len(cards) > 0, "No cards returned in response"

    # 4. Fetch Sets History
    print("\n[4] Fetching all flashcard sets history...")
    history_res = requests.get(f"{base_url}/api/flashcards", headers=headers)
    print(f"Response Status: {history_res.status_code}")
    assert history_res.status_code == 200
    sets_list = history_res.json()
    print(f"Total flashcard sets in history: {len(sets_list)}")
    assert len(sets_list) >= 1
    
    # 5. Fetch Review Queue
    print("\n[5] Fetching review queue...")
    review_res = requests.get(f"{base_url}/api/review", headers=headers)
    print(f"Response Status: {review_res.status_code}")
    assert review_res.status_code == 200
    review_queue = review_res.json()
    print(f"Total cards in review queue: {len(review_queue)}")
    assert len(review_queue) > 0
    
    # Save a card ID to review
    target_card_id = review_queue[0]["id"]
    initial_priority = review_queue[0].get("priority", 0)
    print(f"Selecting card ID {target_card_id} with initial priority {initial_priority}")

    # 6. Update Card status to "not_known" (priority should increase by 2)
    print("\n[6] Review update: Marking card as 'not_known'...")
    update_payload = {
        "cardId": target_card_id,
        "status": "not_known"
    }
    update_res1 = requests.post(f"{base_url}/api/review/update", json=update_payload, headers=headers)
    print(f"Response Status: {update_res1.status_code}")
    assert update_res1.status_code == 200
    res_data1 = update_res1.json()
    print(f"Update response: {res_data1}")
    assert res_data1["newPriority"] == initial_priority + 2
    
    # 7. Update Card status to "known" (priority should decrease by 1)
    print("\n[7] Review update: Marking card as 'known'...")
    update_payload["status"] = "known"
    update_res2 = requests.post(f"{base_url}/api/review/update", json=update_payload, headers=headers)
    print(f"Response Status: {update_res2.status_code}")
    assert update_res2.status_code == 200
    res_data2 = update_res2.json()
    print(f"Update response: {res_data2}")
    assert res_data2["newPriority"] == (initial_priority + 2) - 1
    
    print("\nALL API INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")

if __name__ == "__main__":
    test_nlp_engine()
    # If a specific URL is provided, test it
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    test_api_endpoints(url)
