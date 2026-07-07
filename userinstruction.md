# SmartFlash: AI Learning Platform - User Workflow Guide

Welcome to the **SmartFlash AI Learning Platform**! This guide outlines the end-to-end workflow for a user navigating the application, from uploading raw study materials to mastering concepts through AI-driven spaced repetition.

---

## 1. Authentication & Onboarding
* **Sign Up / Log In**: Users start by creating an account. Authentication is secured via JWT.
* **Dashboard Entry**: Upon login, the user lands on the Dashboard, which provides a high-level overview of their upcoming reviews, active study sets, and recent document uploads.

## 2. Ingesting Knowledge (Document Library)
The foundation of the platform relies on the user providing study materials.
* **Navigation**: User clicks on **Library** in the top navigation bar.
* **Uploading**: User uploads a file. Supported formats include PDF, DOCX, PPTX, TXT, Images (OCR), and Audio (Transcription).
* **Processing**: The backend instantly extracts the text, cleans it, segments it into semantic chunks, and stores it in the vector database (RAG Knowledge Base).

## 3. Active Learning & Interaction (AI Tutor)
Once documents are indexed, the user can interact directly with the material.
* **Navigation**: User clicks on **AI Tutor**.
* **Chatting**: The user selects an uploaded document and asks questions. 
* **Grounded Responses**: The AI provides detailed answers, extracting exact citations and page numbers directly from the uploaded document to prevent hallucination.

## 4. Distilling Information (Smart Summaries & Mind Maps)
Instead of reading 50 pages of notes, the user lets the AI extract the core concepts.
* **Smart Summaries**: User navigates to **Summaries**, selects a document, and the AI generates an Executive Summary, Key Concepts list, Definitions Glossary, and FAQs.
* **Mind Maps**: User navigates to **Mind Maps** to view a visual, node-based graph of how concepts within their document interlink (e.g., Core Theory -> Formulas -> Applications).

## 5. Assessment (AI Quizzes)
To test comprehension before an exam:
* **Navigation**: User clicks on **Quizzes**.
* **Generation**: User selects difficulty (Easy/Medium/Hard) and the number of questions. The AI generates Multiple Choice, True/False, and Fill-in-the-blank questions based *only* on their document.
* **Evaluation**: The user takes the test in the browser and submits it for instant AI grading and explanations of incorrect answers.

## 6. Flashcard Generation (Create Cards)
To commit concepts to long-term memory:
* **Navigation**: User clicks on **Create**.
* **AI Generation**: User selects a document or pastes text. The AI uses the Groq LLM (e.g., Llama 3) to automatically generate Question/Answer pairs, formatting them into an interactive deck.
* **Customization**: The user can specify custom instructions (e.g., "Make the answers sound like a pirate" or "Focus only on dates").

## 7. Mastery & Retention (Review Cards)
The core memorization engine powered by the SM-2 algorithm.
* **Navigation**: User clicks on **Review**.
* **Spaced Repetition**: The system presents due flashcards. The user reveals the answer and grades their memory recall (1-5 scale).
* **Scheduling**: Based on the grade, the SM-2 algorithm calculates exactly when the user should see that card again to optimize memory retention.

## 8. Exam Preparation (Study Planner)
For structured studying leading up to a specific test:
* **Navigation**: User clicks on **Planner**.
* **Configuration**: User inputs their Exam Date, target score, and daily available study hours.
* **Actionable Schedule**: The AI generates a tailored day-by-day and week-by-week revision schedule.

## 9. Progress Tracking (Analytics & History)
* **Analytics**: User navigates to **Analytics** to view beautiful charts displaying their mastery rate, upcoming forecast of due cards, and "Leech" cards (concepts they frequently fail).
* **History**: User can review all past interactions and generated materials.

## 10. Settings & Preferences
* **Navigation**: User clicks on **Settings**.
* **Customization**: User can select their preferred AI model, define default custom prompt instructions, and adjust spaced repetition interval multipliers.
* **Dark Mode**: Accessible at any time via the toggle in the top navigation bar.
