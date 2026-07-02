# backend/services/ai_flashcard_generator.py

import os
import json
import logging
from typing import List, Dict, Optional
from groq import Groq
from prompts.flashcard_generation import (
    SYSTEM_PROMPT,
    QA_PROMPT_TEMPLATE,
    MCQ_PROMPT_TEMPLATE,
    FILLUP_PROMPT_TEMPLATE
)
from services.nlp_generator import generate_flashcards_upgraded

logger = logging.getLogger(__name__)

def chunk_text_by_paragraphs(text: str, max_words: int = 1200) -> List[str]:
    """Split text into paragraph-preserved chunks of around 1000-1500 words."""
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_words = len(para.split())
        
        # If adding paragraph exceeds chunk size and we already have paragraph content, push the current chunk
        if current_word_count + para_words > max_words and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_word_count = para_words
        else:
            current_chunk.append(para)
            current_word_count += para_words
            
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks

def validate_and_filter_cards(cards: List[Dict], card_type: str) -> List[Dict]:
    """
    Quality Check Pipeline:
    - Removes empty questions or answers.
    - Removes cards with extremely short answers.
    - Ensures MCQ type has exactly 4 options.
    - Eliminates duplicates (case-insensitive question matching).
    """
    seen_questions = set()
    validated = []
    
    for c in cards:
        q = c.get("question") or c.get("question_text")
        a = c.get("answer") or c.get("answer_text") or c.get("correct_answer")
        
        if not q or not a:
            continue
            
        q_str = str(q).strip()
        a_str = str(a).strip()
        
        if not q_str or not a_str:
            continue
            
        if len(a_str) < 1:
            continue
            
        # Case insensitive question de-duplication
        norm_q = q_str.lower().replace(" ", "")
        if norm_q in seen_questions:
            continue
            
        card_data = {
            "type": card_type,
            "question": q_str,
            "answer": a_str,
            "difficulty": c.get("difficulty") or "medium",
            "topic": c.get("topic") or "General"
        }
        
        if card_type == "mcq":
            opts = c.get("options")
            if not isinstance(opts, list) or len(opts) < 4:
                # generate options from answer and defaults if missing
                opts = [a_str, "Alternative Option 1", "Alternative Option 2", "Alternative Option 3"]
            else:
                opts = [str(o).strip() for o in opts[:4]]
                # Ensure the correct answer is one of the options
                if a_str not in opts:
                    opts[0] = a_str
            card_data["options"] = opts
            
        elif card_type == "fillup":
            # Ensure blank exists in fillup question
            question_text = q_str
            if "______" not in question_text and "____" not in question_text:
                # Try replacing the answer in the question with blank if it exists
                if a_str.lower() in question_text.lower():
                    import re
                    pattern = re.compile(re.escape(a_str), re.IGNORECASE)
                    question_text = pattern.sub("______", question_text)
                else:
                    # Append blank if couldn't be replaced
                    question_text = f"{question_text} ______"
            # Standardize blank to 6 underscores
            if "____" in question_text and "______" not in question_text:
                question_text = question_text.replace("____", "______")
            card_data["question"] = question_text
            
        seen_questions.add(norm_q)
        validated.append(card_data)
        
    return validated

def generate_smart_flashcards(
    document_text: str,
    flashcard_type: str,
    number_of_cards: int,
    difficulty: str = "medium",
    model: Optional[str] = None,
    custom_instructions: Optional[str] = None
) -> tuple[List[Dict], str, str]:
    """
    Generate high-quality concept-aware flashcards using Groq with spaCy fallback.
    Supports chunking for large documents, quality verification, and card count enforcement.
    Returns: (validated_cards, generation_method, generation_model)
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY is not set. Falling back directly to spaCy NLP generator.")
        fallback_cards = generate_spaCy_fallback(document_text, flashcard_type, number_of_cards, difficulty)
        return (validate_and_filter_cards(fallback_cards, flashcard_type), "spacy", "en_core_web_sm")

    if not model:
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    client = Groq(api_key=api_key)
    
    # 1. Chunk document if it's large
    chunks = chunk_text_by_paragraphs(document_text, max_words=1200)
    logger.info(f"Document text split into {len(chunks)} chunks.")
    
    # Choose prompt template
    if flashcard_type == "mcq":
        prompt_template = MCQ_PROMPT_TEMPLATE
    elif flashcard_type == "fillup":
        prompt_template = FILLUP_PROMPT_TEMPLATE
    else:
        prompt_template = QA_PROMPT_TEMPLATE
        
    all_raw_cards = []
    
    # Calculate how many cards to request from each chunk
    # Request a slight surplus per chunk to allow for quality control filtering
    cards_per_chunk = max(3, (number_of_cards // len(chunks)) + 2)
    
    for i, chunk in enumerate(chunks):
        prompt = prompt_template.format(text=chunk, count=cards_per_chunk, difficulty=difficulty)
        if custom_instructions and custom_instructions.strip():
            prompt += f"\n\nCRITICAL ADDITIONAL INSTRUCTIONS (Strictly apply these styling and focus filters):\n{custom_instructions.strip()}"
            
        try:
            logger.info(f"Calling Groq API for chunk {i+1}/{len(chunks)} using model {model}...")
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                model=model,
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            response_text = chat_completion.choices[0].message.content
            if response_text:
                data = json.loads(response_text)
                if "flashcards" in data and isinstance(data["flashcards"], list):
                    all_raw_cards.extend(data["flashcards"])
        except Exception as e:
            logger.error(f"Error generating cards from chunk {i+1} via Groq: {e}")

    # 2. Quality Check and Filter
    validated_cards = validate_and_filter_cards(all_raw_cards, flashcard_type)
    logger.info(f"Quality Check: {len(validated_cards)} validated out of {len(all_raw_cards)} raw cards.")
    
    # If all Groq calls failed or returned zero valid cards, trigger full spaCy fallback
    if not validated_cards:
        logger.warning("Groq failed completely or returned no valid cards. Falling back to spaCy.")
        fallback_cards = generate_spaCy_fallback(document_text, flashcard_type, number_of_cards, difficulty)
        return (validate_and_filter_cards(fallback_cards, flashcard_type), "spacy", "en_core_web_sm")
        
    # 3. Limit/Supplement Card Count
    if len(validated_cards) >= number_of_cards:
        return (validated_cards[:number_of_cards], "groq", model)
    
    # If we are short of cards, supplement with spaCy
    shortage = number_of_cards - len(validated_cards)
    logger.warning(f"Shortage of {shortage} cards. Supplementing using spaCy fallback...")
    
    fallback_cards = generate_spaCy_fallback(document_text, flashcard_type, shortage, difficulty)
    validated_fallback = validate_and_filter_cards(fallback_cards, flashcard_type)
    
    for f_card in validated_fallback:
        norm_q = f_card["question"].lower().replace(" ", "")
        if not any(v["question"].lower().replace(" ", "") == norm_q for v in validated_cards):
            validated_cards.append(f_card)
            if len(validated_cards) == number_of_cards:
                break
                
    return (validated_cards, "groq", model)

def generate_spaCy_fallback(text: str, card_type: str, count: int, difficulty: str) -> List[Dict]:
    """Helper method to run local spaCy generator as a fallback."""
    try:
        raw_fallback = generate_flashcards_upgraded(text, count, card_type, difficulty=difficulty)
        # Map fields to match Groq output structure
        mapped = []
        for card in raw_fallback:
            mapped.append({
                "type": card_type,
                "question": card.get("question"),
                "answer": card.get("answer"),
                "options": card.get("options", []),
                "difficulty": card.get("difficulty") or difficulty,
                "topic": "General Fallback"
            })
        return mapped
    except Exception as e:
        logger.error(f"Fallback spaCy generator also failed: {e}")
        return []
