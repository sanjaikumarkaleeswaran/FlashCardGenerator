#!/bin/bash
echo "Starting SmartFlash Backend Server..."
cd "$(dirname "$0")/backend"
../venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
