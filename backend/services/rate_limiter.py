# backend/services/rate_limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize the limiter using client IP address
limiter = Limiter(key_func=get_remote_address)
