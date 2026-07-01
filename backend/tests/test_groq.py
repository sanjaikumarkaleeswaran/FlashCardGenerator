# backend/tests/test_groq.py

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Add parent directory to path so we can import packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.groq_service import generate_flashcards_with_groq
from services.nlp_generator import generate_flashcards_upgraded

class TestGroqService(unittest.TestCase):
    
    def test_missing_api_key(self):
        """Verify that generate_flashcards_with_groq raises ValueError if GROQ_API_KEY is not set."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError) as ctx:
                generate_flashcards_with_groq("Photosynthesis is nice.", "qa", 2)
            self.assertIn("GROQ_API_KEY", str(ctx.exception))

    @patch('services.groq_service.Groq')
    def test_successful_groq_qa_generation(self, mock_groq):
        """Verify that generate_flashcards_with_groq parses a correct QA JSON response."""
        # Mock client chat completion response
        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content='''{
                "flashcards": [
                    {"type": "qa", "question": "What is Mitochondria?", "answer": "Powerhouse of cell", "difficulty": "easy"}
                ]
            }'''))
        ]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        mock_groq.return_value = mock_client
        
        with patch.dict(os.environ, {"GROQ_API_KEY": "test_key", "GROQ_MODEL": "llama-3.1-8b-instant"}):
            cards = generate_flashcards_with_groq("Mitochondria are the powerhouse of the cell.", "qa", 1)
            self.assertEqual(len(cards), 1)
            self.assertEqual(cards[0]["question"], "What is Mitochondria?")
            self.assertEqual(cards[0]["answer"], "Powerhouse of cell")
            self.assertEqual(cards[0]["difficulty"], "easy")

    @patch('services.groq_service.Groq')
    def test_successful_groq_mcq_generation(self, mock_groq):
        """Verify that generate_flashcards_with_groq parses a correct MCQ JSON response."""
        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content='''{
                "flashcards": [
                    {
                        "type": "mcq", 
                        "question": "What revolves around the earth?", 
                        "options": ["Sun", "Moon", "Mars", "Venus"], 
                        "answer": "Moon", 
                        "difficulty": "medium"
                    }
                ]
            }'''))
        ]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        mock_groq.return_value = mock_client
        
        with patch.dict(os.environ, {"GROQ_API_KEY": "test_key"}):
            cards = generate_flashcards_with_groq("The moon revolves around the earth.", "mcq", 1)
            self.assertEqual(len(cards), 1)
            self.assertEqual(cards[0]["type"], "mcq")
            self.assertEqual(len(cards[0]["options"]), 4)
            self.assertIn("Moon", cards[0]["options"])
            self.assertEqual(cards[0]["answer"], "Moon")

    @patch('services.groq_service.Groq')
    def test_successful_groq_fillup_generation(self, mock_groq):
        """Verify that generate_flashcards_with_groq parses and formats a correct fillup response."""
        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content='''{
                "flashcards": [
                    {
                        "type": "fillup", 
                        "question": "The earth revolves around ____.", 
                        "answer": "sun", 
                        "difficulty": "easy"
                    }
                ]
            }'''))
        ]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        mock_groq.return_value = mock_client
        
        with patch.dict(os.environ, {"GROQ_API_KEY": "test_key"}):
            cards = generate_flashcards_with_groq("The earth revolves around sun.", "fillup", 1)
            self.assertEqual(len(cards), 1)
            self.assertEqual(cards[0]["type"], "fillup")
            self.assertIn("____", cards[0]["question"])
            self.assertEqual(cards[0]["answer"], "sun")

if __name__ == "__main__":
    unittest.main()
