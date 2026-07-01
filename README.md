# SmartFlash: AI Smart Flashcard Generator

SmartFlash is a complete, production-ready, full-stack EdTech application designed to help students study efficiently. Users can paste textbook text or study notes, and the system automatically generates high-yield flashcards (question-answer pairs) using a local natural language processing (NLP) parser. Learning progress is managed using a spaced repetition scheduling algorithm.

This project is built privacy-first: **no paid external AI APIs are used**. All machine learning parsing runs locally on your own machine.

---

## 🚀 Key Features

* **Local AI/NLP Parsing**: Automatic question extraction using grammar patterns and named entities via the spaCy `en_core_web_sm` model.
* **Spaced Repetition Review Queue**: Cards tagged as "Not Known" increase in review priority, while cards marked as "Known" decrease in priority.
* **Workspace Dashboard Analytics**: Circular mastery gauge tracking known versus review-ready cards.
* **Study History**: Expandable history lists allowing users to inspect cards, view review counts, and launch focused sub-reviews.
* **Secure Session Auth**: Standard token authentication with encrypted password hashing (bcrypt) and JWT signatures.

---

## 🤖 AI Architecture

The generation pipeline leverages **Groq inference** for high-speed LLM processing, falling back to a local offline spaCy parsing engine if the API is unavailable.

```text
User Notes
   ↓
Groq LLM (llama-3.1-8b-instant)
   ↓
Structured Flashcards (JSON validation)
   ↓
MongoDB
   ↓
SM-2 Review (Spaced Repetition)
```

> [!NOTE]
> This project does **not** use any OpenAI API. All main inference is handled by Groq for maximum speed and quality, with a fully local spaCy NLP engine as a fallback.

---

## 🛠 Tech Stack

### Frontend
* **Core**: React 19 + Vite 8
* **Routing**: React Router DOM v7
* **Styling**: Tailwind CSS v4 + Custom 3D perspective transforms for card flips
* **Icons**: Lucide React
* **HTTP Client**: Axios

### Backend
* **Web Framework**: Python FastAPI
* **Database Driver**: Motor Async MongoDB client
* **NLP Model**: spaCy (`en_core_web_sm`)
* **Auth**: PyJWT + Passlib (bcrypt)

### Database
* **Primary Store**: MongoDB Atlas (or local MongoDB container fallback)

---

## 📂 Folder Structure

```text
flashcard-generation/
├── backend/
│   ├── models/             # Pydantic schemas (User, Flashcard)
│   ├── routes/             # FastAPI routers (Auth, Flashcards)
│   ├── services/           # Business logic (spaCy NLP questions generator)
│   ├── tests/              # NLP unit tests & API integration suites
│   ├── .env.example        # Environment variable templates
│   ├── database.py         # Async MongoDB database client
│   ├── auth.py             # Security utilities & dependencies
│   ├── download_model.py   # spaCy downloader helper
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend container configurations
│   └── main.py             # FastAPI App entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (Navbar, Flashcard, Loader)
│   │   ├── pages/          # Layouts (Dashboard, Create, Review, History, Auth)
│   │   ├── services/       # Axios API client endpoints
│   │   ├── App.jsx         # Client Router setup
│   │   ├── index.css       # Tailwind entrypoint + 3D card css
│   │   └── main.jsx        # React DOM bootstrap
│   ├── index.html          # HTML Entrypoint (SEO optimized)
│   ├── tailwind.config.js  # Tailwind template content configurations
│   ├── postcss.config.js   # PostCSS configuration file
│   ├── nginx.conf          # Custom Nginx config to handle deep-linking
│   └── Dockerfile          # Frontend container configurations
└── docker-compose.yml      # Orchestration stack configurations
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
* Python 3.11 or higher
* Node.js v18 or higher (with npm)
* A running MongoDB Atlas instance or local MongoDB instance

---

### 1. Backend Setup

1. **Create a Virtual Environment (in the project root)**:
   ```bash
   python -m venv venv
   ```
2. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```
3. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**: `..\venv\Scripts\Activate.ps1`
   * **Windows (CMD)**: `..\venv\Scripts\activate`
   * **macOS/Linux**: `source ../venv/bin/activate`
4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Download the spaCy Language Model**:
   ```bash
   python download_model.py
   ```
6. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your connection details:
   ```ini
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/smartflash?retryWrites=true&w=majority
   JWT_SECRET=super_secure_development_jwt_secret_key_32_chars
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ```
7. **Run Unit Tests**:
   Verifies that the NLP parsing engine is correctly extracting questions:
   ```bash
   python tests/test_api.py
   ```
8. **Start the FastAPI Server**:
   * **Using the Shortcut Script (from Root Directory)**:
     * **Windows**: Run `.\run_backend.bat` (or double-click it).
     * **macOS/Linux**: Run `./run_backend.sh`.
   * **Using Uvicorn Manually (from backend folder, with venv activated)**:
     ```bash
     uvicorn main:app --reload --host 127.0.0.1 --port 8000
     ```
   * **Using Uvicorn without manual activation (from backend folder)**:
     * **Windows**: `..\venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000`
     * **macOS/Linux**: `../venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000`

---

### 2. Frontend Setup

1. **Navigate to the frontend folder**:
   ```bash
   cd ../frontend
   ```
2. **Install node packages**:
   ```bash
   npm install
   ```
3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Running with Docker Compose

To deploy both the frontend and backend inside containers with a single command, run the following in the project root:

```bash
docker-compose up --build
```

* **Frontend** will be accessible at: [http://localhost:3000](http://localhost:3000)
* **Backend API** will be running at: [http://localhost:8000](http://localhost:8000)

*(Ensure your backend `.env` contains a valid network-accessible MongoDB Atlas URI, or run a local mongo instance accessible to the docker network).*

---

## 🧠 Local NLP Generation Rules

The core question generation engine works offline in `backend/services/nlp_generator.py` through five semantic rules:

1. **Definition Matcher**: Looks for root copula verbs ("is", "are"). Reconstructs `"What is {subject}?"` and returns everything after the verb as the definition answer.
2. **Biographical Matcher**: Detects `PERSON` named entities. If the person acts as a subject, it replaces their name with `"Who"`.
3. **Geographical Matcher**: Detects prepositions of location (`in`, `at`, `on`, `to`) linked to nouns or `LOC`/`GPE` entities. Formulates questions using `"Where does/do/did {subject} {verb}?"`.
4. **Chronological Matcher**: Detects `DATE` or `TIME` named entities. Formulates questions using `"When was/did {subject} {verb}?"`.
5. **Cloze Deletion Fallback**: For sentences that don't match rules 1-4, it identifies key direct objects or nouns, masks them with `______`, and generates a fill-in-the-blank prompt.

---

## 📊 API Specifications

### 1. User Authentication
* **Register**: `POST /api/register`
  * Request: `{"email": "student@test.com", "password": "password123"}`
  * Response (201): `{"id": "...", "email": "student@test.com"}`
* **Login**: `POST /api/login`
  * Request: `{"email": "student@test.com", "password": "password123"}`
  * Response (200): `{"access_token": "...", "token_type": "bearer"}`

### 2. Flashcard Management
* **Generate Flashcards**: `POST /api/flashcards/generate`
  * Request (Accepts `notes` or `content`):
    ```json
    {
      "content": "Photosynthesis is the process plants use to create food. Albert Einstein developed relativity in 1915.",
      "type": "mcq",
      "count": 10
    }
    ```
  * Response (201):
    ```json
    {
      "id": "set_id_123",
      "title": "Photosynthesis & Relativity",
      "card_count": 1,
      "source": "groq",
      "model": "llama-3.1-8b-instant",
      "generation_method": "groq",
      "generation_model": "llama-3.1-8b-instant",
      "cards": [
        {
          "id": "card_id_1",
          "question": "What is Photosynthesis?",
          "answer": "The process plants use to create food",
          "difficulty": "easy",
          "status": "not_known",
          "priority": 0,
          "reviewCount": 0
        }
      ],
      "flashcards": [
        {
          "id": "card_id_1",
          "question": "What is Photosynthesis?",
          "answer": "The process plants use to create food",
          "difficulty": "easy",
          "status": "not_known",
          "priority": 0,
          "reviewCount": 0
        }
      ]
    }
    ```
* **List Historical Sets**: `GET /api/flashcards`
  * Returns user's sets sorted by newest first.

### 3. Spaced Repetition Reviews
* **Fetch Review Queue**: `GET /api/review`
  * Returns all user cards flattened and sorted by `priority DESC` (higher priority cards need review first).
* **Update Card State**: `POST /api/review/update`
  * Request: `{"cardId": "card_id_1", "status": "known"}` (or `"not_known"`)
  * Business Logic:
    * `"not_known"`: Increases priority weight by `+2`.
    * `"known"`: Decreases priority weight by `-1` (floor of `0`).
  * Response (200): `{"cardId": "...", "newStatus": "known", "newPriority": 0}`
