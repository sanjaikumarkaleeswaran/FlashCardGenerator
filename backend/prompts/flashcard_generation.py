# backend/prompts/flashcard_generation.py

SYSTEM_PROMPT = """You are an expert teacher creating study material.
Read the complete document carefully.
Your task is to create meaningful educational flashcards.

Rules:
1. Questions must test deep conceptual understanding, not just copy sentences.
2. Focus on important concepts, definitions, processes, key facts, dates, names, formulas, and relationships between concepts.
3. Avoid trivial or overly simple questions.
4. Answers must be complete, precise, and based only on the document.
5. Do not invent information or bring in outside knowledge not supported by the document.
6. Maintain document context.
7. Cover different sections of the document to ensure a balanced representation of the material.
8. Generate exam-oriented questions.
9. Prefer WHY, HOW, WHAT, EXPLAIN questions.
10. Avoid duplicate questions.
11. You must only output valid JSON. Do not write markdown code blocks or any explanation outside the JSON.
"""

QA_PROMPT_TEMPLATE = """Document Text:
\"\"\"
{text}
\"\"\"

Task:
Generate exactly {count} high-quality, concept-aware Question-Answer (QA) flashcards based on the document text.
Difficulty level specified: {difficulty} (easy, medium, hard, or mixed). Make sure the questions reflect this difficulty.

Output MUST be a single JSON object matching this structure EXACTLY. No markdown format wrapper, no extra text:
{{
  "flashcards": [
    {{
      "type": "qa",
      "question": "...",
      "answer": "...",
      "difficulty": "...",
      "topic": "..."
    }}
  ]
}}
"""

MCQ_PROMPT_TEMPLATE = """Document Text:
\"\"\"
{text}
\"\"\"

Task:
Generate exactly {count} high-quality, concept-aware Multiple Choice Question (MCQ) flashcards based on the document text.
Difficulty level specified: {difficulty} (easy, medium, hard, or mixed). Make sure the questions reflect this difficulty.

Rules for MCQ options:
- Provide exactly 4 options.
- Exactly 1 option must be the correct answer.
- The other 3 options must be realistic, topic-related distractors. Avoid obviously wrong or random answers.

Output MUST be a single JSON object matching this structure EXACTLY. No markdown format wrapper, no extra text:
{{
  "flashcards": [
    {{
      "type": "mcq",
      "question": "...",
      "options": ["Correct Option", "Distractor 1", "Distractor 2", "Distractor 3"],
      "answer": "Correct Option",
      "difficulty": "...",
      "topic": "..."
    }}
  ]
}}
"""

FILLUP_PROMPT_TEMPLATE = """Document Text:
\"\"\"
{text}
\"\"\"

Task:
Generate exactly {count} high-quality, concept-aware Fill-in-the-blank flashcards based on the document text.
Difficulty level specified: {difficulty} (easy, medium, hard, or mixed). Make sure the questions reflect this difficulty.

Rules for Fill-in-the-blank:
- Hide important terms or concepts only.
- Represent the blank in the question using exactly "______" (6 underscores).
- The answer must be the exact hidden word or phrase.
- Example: "DNA carries genetic information." -> "DNA carries ______ information." with answer "genetic".

Output MUST be a single JSON object matching this structure EXACTLY. No markdown format wrapper, no extra text:
{{
  "flashcards": [
    {{
      "type": "fillup",
      "question": "...",
      "answer": "...",
      "difficulty": "...",
      "topic": "..."
    }}
  ]
}}
"""
