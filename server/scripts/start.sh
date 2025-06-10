#!/bin/bash
# FastAPI Server Startup Script
echo "🚀 Starting RemoveTube AI Classifier Server..."
cd "$(dirname "$0")"
python3 ../src/main.py
