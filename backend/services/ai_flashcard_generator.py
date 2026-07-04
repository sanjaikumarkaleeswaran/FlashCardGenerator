# backend/services/ai_flashcard_generator.py

import os
import json
import logging
import re
from typing import List, Dict, Optional
from groq import Groq

from services.nlp_generator import generate_flashcards_upgraded
from services.document_intelligence import GenerationValidationPipeline

logger = logging.getLogger(__name__)

# System instructions to guide the LLM for education-grade outputs
SYSTEM_PROMPT = """You are an expert teacher creating study material.
Analyze the provided document context carefully.
Your task is to create high-quality educational flashcards.

Rules:
1. Questions must test deep conceptual understanding and match the specified card type exactly.
2. The answer must be accurate, explainable, and grounded strictly in the provided document text. Never invent facts.
3. Avoid duplicate questions or simple copy-pasting of sentences.
4. Output must be a single JSON object. Do not include markdown wraps or additional conversation.
"""

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

def get_type_specific_instruction(card_type: str) -> str:
    """Return explicit educational rules for the requested flashcard type."""
    instructions = {
        "definition": "Focus on defining key terms and vocabulary words. The question should ask for the meaning of a term.",
        "concept": "Focus on high-level theoretical concepts and their relationships.",
        "why": "Focus on causal relationships and rationale (e.g. 'Why does X occur?').",
        "how": "Focus on step-by-step processes, mechanisms, and procedures.",
        "explain": "Focus on detailed pedagogical explanations of a complex topic.",
        "application": "Focus on applying a concept from the text to a new context or scenario.",
        "example": "Ask the student to identify or explain a real-world example of a concept mentioned.",
        "mcq": "Create a multiple-choice question. You must provide exactly 4 options. Exactly 1 option must be the correct answer, and the other 3 must be realistic distractors.",
        "fillup": "Create a fill-in-the-blank question. Replace a single critical term in the question with exactly '______' (6 underscores). The answer must be that hidden term.",
        "tf": "Create a True/False question. The question must be a statement, and the answer must be 'True' or 'False'.",
        "assertion_reason": "Create an Assertion & Reason question. Structure: Assertion (A): [statement]. Reason (R): [reason]. The answer must evaluate if both are true and if R is the correct explanation.",
        "scenario": "Present a realistic scenario based on the text and ask the student to solve a problem or analyze it.",
        "interview": "Formulate a professional interview question testing practical knowledge of this concept.",
        "case_study": "Ask a case-study style analysis question grounded in instances from the text.",
        "numerical": "Focus on formulas, calculations, and mathematical properties mentioned in the text.",
        # Bloom's Taxonomy
        "remember": "Bloom's Level 1 (Remembering): Retrieve, recall, or recognize facts and definitions.",
        "understand": "Bloom's Level 2 (Understanding): Explain ideas, concepts, or translate information.",
        "apply": "Bloom's Level 3 (Applying): Use information in another familiar situation.",
        "analyze": "Bloom's Level 4 (Analyzing): Break information into parts to explore understandings and relationships.",
        "evaluate": "Bloom's Level 5 (Evaluating): Justify a decision, criticize a point of view, or defend a stand.",
        "create": "Bloom's Level 6 (Creating): Put elements together to form a coherent whole or make original assertions."
    }
    return instructions.get(card_type.lower(), "Create a concept-aware QA flashcard.")

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
                opts = [a_str, "Alternative Option 1", "Alternative Option 2", "Alternative Option 3"]
            else:
                opts = [str(o).strip() for o in opts[:4]]
                if a_str not in opts:
                    opts[0] = a_str
            card_data["options"] = opts
            
        elif card_type == "fillup":
            question_text = q_str
            if "______" not in question_text and "____" not in question_text:
                if a_str.lower() in question_text.lower():
                    pattern = re.compile(re.escape(a_str), re.IGNORECASE)
                    question_text = pattern.sub("______", question_text)
                else:
                    question_text = f"{question_text} ______"
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
    Upgraded concept-aware flashcard generator supporting 20+ card types,
    Bloom's Taxonomy, and 7-stage quality checks.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY is not set. Falling back directly to spaCy NLP generator.")
        fallback_cards = generate_spaCy_fallback(document_text, flashcard_type, number_of_cards, difficulty)
        return (validate_and_filter_cards(fallback_cards, flashcard_type), "spacy", "en_core_web_sm")

    if not model:
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    client = Groq(api_key=api_key)
    chunks = chunk_text_by_paragraphs(document_text, max_words=1200)
    
    type_instruction = get_type_specific_instruction(flashcard_type)
    
    # Request a slight surplus to allow room for the validation pipeline filter
    cards_per_chunk = max(3, (number_of_cards // len(chunks)) + 2)
    all_raw_cards = []
    
    for i, chunk in enumerate(chunks):
        prompt = f"""
        Document Text Chunk:
        \"\"\"
        {chunk}
        \"\"\"

        Task:
        Generate exactly {cards_per_chunk} flashcards of type '{flashcard_type}'.
        Difficulty level: {difficulty}
        
        Specific Card Type Guidelines:
        {type_instruction}

        Output MUST be a single valid JSON object matching this structure EXACTLY. No markdown wrappers, no extra explanation:
        {{
          "flashcards": [
            {{
              "type": "{flashcard_type}",
              "question": "Question text here?",
              "answer": "Answer here",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // ONLY if type is mcq
              "difficulty": "{difficulty}",
              "topic": "Specific subtopic or concept name"
            }}
          ]
        }}
        """
        
        if custom_instructions and custom_instructions.strip():
            prompt += f"\n\nAdditional user guidelines:\n{custom_instructions.strip()}"

        try:
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
            logger.error(f"Groq generation failed for chunk {i+1}: {e}")

    # Initial filtering and cleaning
    raw_filtered = validate_and_filter_cards(all_raw_cards, flashcard_type)

    # 7-STAGE QUALITY VALIDATION PIPELINE
    validated_cards = []
    existing_questions = set()
    existing_answers = []

    for card in raw_filtered:
        q = card["question"]
        a = card["answer"]
        
        norm_q = q.lower().replace(" ", "")
        if norm_q in existing_questions:
            continue

        # Run multi-stage validator
        val_res = GenerationValidationPipeline.validate_answer(
            question=q,
            answer=a,
            context=document_text,
            existing_answers=existing_answers
        )

        if not val_res["approved"]:
            logger.info(f"Card rejected by validation pipeline: Q: {q}")
            continue

        card["difficulty"] = val_res["difficulty"]
        existing_questions.add(norm_q)
        existing_answers.append(a)
        validated_cards.append(card)

    logger.info(f"Flashcard Ingestion Validation: Approved {len(validated_cards)} out of {len(raw_filtered)} raw candidates.")

    # Fallback backfilling if we did not reach target cards count
    if len(validated_cards) < number_of_cards:
        shortage = number_of_cards - len(validated_cards)
        fallback_cards = generate_spaCy_fallback(document_text, flashcard_type, shortage, difficulty)
        for f_card in fallback_cards:
            norm_q = f_card["question"].lower().replace(" ", "")
            if norm_q not in existing_questions:
                validated_cards.append(f_card)
                existing_questions.add(norm_q)
                if len(validated_cards) == number_of_cards:
                    break

    return (validated_cards[:number_of_cards], "groq", model)

def generate_spaCy_fallback(text: str, card_type: str, count: int, difficulty: str) -> List[Dict]:
    """Fallback generator mapping local spaCy results."""
    try:
        raw_fallback = generate_flashcards_upgraded(text, count, card_type, difficulty=difficulty)
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
        logger.error(f"Fallback generator failed: {e}")
        return []
