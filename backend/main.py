import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import ping_database
from routes.auth import router as auth_router
from routes.flashcards import router as flashcards_router
from routes.documents import router as documents_router
from routes.settings import router as settings_router
from routes.study_assistant import router as study_assistant_router
from services.nlp_generator import get_nlp
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from services.rate_limiter import limiter

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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS — reads ALLOWED_ORIGINS from env (comma-separated list)
# Default allows localhost dev + any .onrender.com domain
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes.offline import router as offline_router
from routes.collaboration import router as collaboration_router
from routes.voice import router as voice_router
from routes.anki import router as anki_router

# Mount API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(flashcards_router, prefix="/api")
app.include_router(settings_router)
app.include_router(documents_router)
app.include_router(study_assistant_router)
app.include_router(offline_router, prefix="/api/offline", tags=["offline"])
app.include_router(collaboration_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(anki_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Smart Flashcard Generator API",
        "docs_url": "/docs"
    }
