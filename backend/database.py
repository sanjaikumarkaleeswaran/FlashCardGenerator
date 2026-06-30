import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Retrieve MongoDB connection string
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/flashcard_db")

# Create AsyncIOMotorClient
client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

# Get collections
users_collection = db["users"]
flashcard_sets_collection = db["flashcard_sets"]

async def ping_database():
    """Verify that MongoDB connection works."""
    try:
        await db.command("ping")
        print("MongoDB connection established successfully.")
        return True
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        return False
