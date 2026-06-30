# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the spaCy English model
RUN python -m spacy download en_core_web_sm

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 8000

# Run uvicorn server on container startup
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
