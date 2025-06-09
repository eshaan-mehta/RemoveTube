#!/bin/bash
# FastAPI Server Startup Script
echo "🚀 Starting RemoveTube AI Classifier Server..."
cd "$(dirname "$0")"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
