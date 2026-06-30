import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import ping_database
from routes.auth import router as auth_router
from routes.flashcards import router as flashcards_router
from services.nlp_generator import get_nlp

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting...")
    # Verify DB connection
    await ping_database()
    # Warm up NLP service
    print("Loading spaCy NLP Model...")
    nlp_engine = get_nlp()
    if nlp_engine:
        print("spaCy model 'en_core_web_sm' loaded successfully.")
    else:
        print("spaCy model NOT available. Fallback rules will be active.")
    yield
    # Shutdown
    print("Application shutting down...")

app = FastAPI(
    title="AI Smart Flashcard Generator API",
    description="Backend services for flashcard generation and progress tracking via local NLP.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend clients (Vercel, Localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(flashcards_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Smart Flashcard Generator API",
        "docs_url": "/docs"
    }
