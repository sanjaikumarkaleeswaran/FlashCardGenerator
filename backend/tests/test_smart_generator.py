# backend/tests/test_smart_generator.py

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Add parent directory to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ai_flashcard_generator import (
    chunk_text_by_paragraphs,
    validate_and_filter_cards,
    generate_smart_flashcards
)

class TestSmartGenerator(unittest.TestCase):
    
    def test_paragraph_chunking(self):
        """Verify that chunk_text_by_paragraphs correctly groups text into chunks."""
        text = "Para 1 word1 word2.\n\nPara 2 word3 word4.\n\nPara 3 word5 word6."
        # If max_words is small, it should split
        chunks = chunk_text_by_paragraphs(text, max_words=3)
        # Should split each paragraph into a separate chunk
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0], "Para 1 word1 word2.")
        self.assertEqual(chunks[1], "Para 2 word3 word4.")
        self.assertEqual(chunks[2], "Para 3 word5 word6.")
        
        # If max_words is large, it should group them
        large_chunks = chunk_text_by_paragraphs(text, max_words=100)
        self.assertEqual(len(large_chunks), 1)
        self.assertIn("Para 3", large_chunks[0])

    def test_validation_and_quality_checks(self):
        """Verify the quality check pipeline filters out low quality or bad structure cards."""
        raw_cards = [
            # Good QA card
            {"type": "qa", "question": "What is mitochondria?", "answer": "Powerhouse of the cell", "difficulty": "easy"},
            # Duplicate question (case/space variation)
            {"type": "qa", "question": "  what is mitochondria? ", "answer": "Another answer", "difficulty": "easy"},
            # Empty question
            {"type": "qa", "question": "", "answer": "Some answer"},
            # Missing answer
            {"type": "qa", "question": "What is ATP?", "answer": ""},
            # MCQ with insufficient options (should be repaired to 4 options)
            {"type": "mcq", "question": "Which organelle has DNA?", "answer": "Mitochondria", "options": ["Mitochondria"]},
            # Fillup without a blank (should auto-insert blank)
            {"type": "fillup", "question": "Ribosomes synthesize proteins", "answer": "proteins"}
        ]
        
        # Validate QA cards
        qa_validated = validate_and_filter_cards([raw_cards[0], raw_cards[1], raw_cards[2], raw_cards[3]], "qa")
        self.assertEqual(len(qa_validated), 1)
        self.assertEqual(qa_validated[0]["question"], "What is mitochondria?")
        
        # Validate MCQ card options repair
        mcq_validated = validate_and_filter_cards([raw_cards[4]], "mcq")
        self.assertEqual(len(mcq_validated), 1)
        self.assertEqual(len(mcq_validated[0]["options"]), 4)
        self.assertEqual(mcq_validated[0]["options"][0], "Mitochondria")
        
        # Validate Fillup auto-blanking
        fillup_validated = validate_and_filter_cards([raw_cards[5]], "fillup")
        self.assertEqual(len(fillup_validated), 1)
        self.assertIn("______", fillup_validated[0]["question"])
        self.assertEqual(fillup_validated[0]["answer"], "proteins")

    def test_missing_api_key_fallback(self):
        """Verify that generate_smart_flashcards falls back to spaCy when GROQ_API_KEY is not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Patch spaCy fallback generator to verify it gets called
            with patch('services.ai_flashcard_generator.generate_spaCy_fallback') as mock_fallback:
                mock_fallback.return_value = [
                    {"type": "qa", "question": "Spacy Question", "answer": "Spacy Answer", "difficulty": "easy", "topic": "General Fallback"}
                ]
                cards, method, model = generate_smart_flashcards("Sample text here to generate some cards.", "qa", 1)
                self.assertEqual(method, "spacy")
                self.assertEqual(model, "en_core_web_sm")
                self.assertEqual(len(cards), 1)
                self.assertEqual(cards[0]["question"], "Spacy Question")

    @patch('services.ai_flashcard_generator.Groq')
    def test_successful_groq_smart_generation(self, mock_groq):
        """Verify generate_smart_flashcards works with Groq response and enforces counts."""
        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content='''{
                "flashcards": [
                    {"type": "qa", "question": "Q1", "answer": "A1", "difficulty": "medium", "topic": "Cell Biology"},
                    {"type": "qa", "question": "Q2", "answer": "A2", "difficulty": "medium", "topic": "Cell Biology"},
                    {"type": "qa", "question": "Q3", "answer": "A3", "difficulty": "medium", "topic": "Cell Biology"}
                ]
            }'''))
        ]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        mock_groq.return_value = mock_client
        
        with patch.dict(os.environ, {"GROQ_API_KEY": "test_key"}):
            # Request exactly 2 cards
            cards, method, model = generate_smart_flashcards("Mitochondria are powerhouse of cell.", "qa", 2, "medium")
            self.assertEqual(method, "groq")
            self.assertEqual(model, "llama-3.1-8b-instant")
            self.assertEqual(len(cards), 2)  # Enforced to requested count
            self.assertEqual(cards[0]["question"], "Q1")
            self.assertEqual(cards[1]["question"], "Q2")

if __name__ == "__main__":
    unittest.main()
