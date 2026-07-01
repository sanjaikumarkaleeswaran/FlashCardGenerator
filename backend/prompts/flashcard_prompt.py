# backend/prompts/flashcard_prompt.py

QA_PROMPT = """Generate exactly {count} flashcards of type "qa" based on the following study text.
For each flashcard, provide a 'question' and an 'answer'. Keep them highly factual and directly based on the text.
The difficulty of each card must be evaluated as "easy", "medium", or "hard" based on complexity and length.

Study Text:
{text}

Return ONLY a valid JSON object. Do not include markdown code block formatting, do not include any explanatory text. The response must be parseable as JSON.
Format:
{{
  "flashcards": [
    {{
      "type": "qa",
      "question": "question text",
      "answer": "answer text",
      "difficulty": "easy/medium/hard"
    }}
  ]
}}
"""

MCQ_PROMPT = """Generate exactly {count} flashcards of type "mcq" based on the following study text.
For each flashcard, provide a 'question', a list of exactly 4 options under 'options' (where one is the correct answer and 3 are plausible distractors), and the correct 'answer'.
The difficulty of each card must be evaluated as "easy", "medium", or "hard".

Study Text:
{text}

Return ONLY a valid JSON object. Do not include markdown code block formatting, do not include any explanatory text. The response must be parseable as JSON.
Format:
{{
  "flashcards": [
    {{
      "type": "mcq",
      "question": "question text",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "answer": "correct option text",
      "difficulty": "easy/medium/hard"
    }}
  ]
}}
"""

FILLUP_PROMPT = """Generate exactly {count} flashcards of type "fillup" based on the following study text.
For each flashcard, mask a key noun or phrase in the sentence with "____" (four underscores) to form the question, and provide the exact masked word/phrase as the answer.
Example:
Question: "The earth revolves around ____"
Answer: "sun"
The difficulty of each card must be evaluated as "easy", "medium", or "hard".

Study Text:
{text}

Return ONLY a valid JSON object. Do not include markdown code block formatting, do not include any explanatory text. The response must be parseable as JSON.
Format:
{{
  "flashcards": [
    {{
      "type": "fillup",
      "question": "sentence with ____",
      "answer": "masked word/phrase",
      "difficulty": "easy/medium/hard"
    }}
  ]
}}
"""
