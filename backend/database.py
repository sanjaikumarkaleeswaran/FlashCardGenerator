import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Retrieve MongoDB connection string (supports multiple env names)
MONGO_URL = (
    os.getenv("MONGO_URL") or 
    os.getenv("MONGODB_URI") or 
    os.getenv("MONGO_URI") or 
    "mongodb://localhost:27017/flashcard_db"
)

# Create AsyncIOMotorClient
client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

# Get collections
users_collection = db["users"]
flashcard_sets_collection = db["flashcard_sets"]
documents_collection = db["documents"]

async def ping_database():
    """Verify that MongoDB connection works."""
    try:
        await db.command("ping")
        print("MongoDB connection established successfully.")
        return True
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        return False
