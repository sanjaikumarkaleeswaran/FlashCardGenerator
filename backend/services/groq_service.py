# backend/services/groq_service.py

import os
import io
import json
import logging
from typing import List, Dict, Optional
from groq import Groq, AuthenticationError, RateLimitError, APIError
from prompts.flashcard_prompt import QA_PROMPT, MCQ_PROMPT, FILLUP_PROMPT

logger = logging.getLogger(__name__)

def generate_flashcards_with_groq(
    study_text: str,
    flashcard_type: str,
    number_of_cards: int,
    model: Optional[str] = None,
    custom_instructions: Optional[str] = None
) -> List[Dict]:
    """
    Generate structured flashcards using the Groq API.
    Raises ValueError, AuthenticationError, RateLimitError, APIError, or json.JSONDecodeError.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
        
    if not model:
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Initialize client
    client = Groq(api_key=api_key)
    
    # Select prompt template
    if flashcard_type == "mcq":
        prompt_template = MCQ_PROMPT
    elif flashcard_type == "fillup":
        prompt_template = FILLUP_PROMPT
    else:
        prompt_template = QA_PROMPT
        
    prompt = prompt_template.format(text=study_text, count=number_of_cards, type=flashcard_type)
    
    if custom_instructions and custom_instructions.strip():
        prompt += f"\n\nCRITICAL ADDITIONAL INSTRUCTIONS (Strictly apply these styling and focus filters):\n{custom_instructions.strip()}"
    
    logger.info(f"Calling Groq API using model: {model} for type: {flashcard_type}")
    
    # Request completion
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a professional educational assistant. You only output valid JSON. Do not include markdown code blocks or any other explanation."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model=model,
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    
    response_text = chat_completion.choices[0].message.content
    if not response_text or not response_text.strip():
        raise ValueError("Empty response received from Groq API.")
        
    logger.info("Parsing Groq JSON response...")
    # Parse and validate JSON
    data = json.loads(response_text)
    
    if "flashcards" not in data or not isinstance(data["flashcards"], list):
        raise ValueError("Invalid response structure: 'flashcards' key is missing or is not a list.")
        
    flashcards = data["flashcards"]
    validated_cards = []
    
    for card in flashcards:
        q = card.get("question") or card.get("question_text")
        a = card.get("answer") or card.get("answer_text") or card.get("correct_answer")
        
        if not q or not a:
            continue
            
        difficulty = card.get("difficulty") or "medium"
        if difficulty not in ["easy", "medium", "hard"]:
            difficulty = "medium"
            
        validated_card = {
            "type": flashcard_type,
            "question": q.strip(),
            "answer": a.strip(),
            "difficulty": difficulty,
            "options": []
        }
        
        # Structure validations per type requirement:
        if flashcard_type == "mcq":
            opts = card.get("options")
            if not isinstance(opts, list) or len(opts) < 4:
                # generate options from answer and fallbacks if missing
                opts = [a.strip(), "Alternative A", "Alternative B", "Alternative C"]
            else:
                opts = [o.strip() for o in opts[:4]]
                # Ensure the correct answer is one of the options
                if a.strip() not in opts:
                    opts[0] = a.strip()
            validated_card["options"] = opts
            
        elif flashcard_type == "fillup":
            # Ensure blank exists in fillup question
            question_text = q.strip()
            if "____" not in question_text:
                # Try replacing the answer in the question with blank if it exists
                if a.strip().lower() in question_text.lower():
                    # Case insensitive replace
                    import re
                    pattern = re.compile(re.escape(a.strip()), re.IGNORECASE)
                    question_text = pattern.sub("____", question_text)
                else:
                    # Append blank if couldn't be replaced
                    question_text = f"{question_text} ____"
            validated_card["question"] = question_text
            
        validated_cards.append(validated_card)
        
    if not validated_cards:
        raise ValueError("No valid flashcards could be parsed from the Groq API response.")
        
    return validated_cards


def get_groq_response(
    system_instruction: str,
    user_prompt: str,
    model: Optional[str] = None,
    response_format: Optional[str] = None
) -> str:
    """
    General-purpose Groq LLM completion helper for RAG, summaries, quizzes, and study plans.
    Returns the raw text response from the Groq API.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    if not model:
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    client = Groq(api_key=api_key)

    kwargs = {
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "model": model,
        "temperature": 0.4,
    }

    # Enable JSON mode only when explicitly requested
    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        logger.info(f"[get_groq_response] Calling Groq API with model: {model}")
        completion = client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"[get_groq_response] Groq API call failed: {e}")
        raise e

def transcribe_audio_with_groq(file_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio bytes to text using Groq's Audio API (Whisper-large-v3).
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    
    # Initialize client
    client = Groq(api_key=api_key)
    
    # Create named in-memory file for requests/multipart compatibility
    class NamedBytesIO(io.BytesIO):
        def __init__(self, val, name):
            super().__init__(val)
            self.name = name

    audio_file = NamedBytesIO(file_bytes, filename)
    
    try:
        logger.info(f"Calling Groq Audio API for file: {filename}")
        translation = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="text"
        )
        return translation
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise e
