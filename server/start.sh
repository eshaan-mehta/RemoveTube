#!/bin/bash
# FastAPI Server Startup Script
echo "Starting RemoveTube Server..."
cd "$(dirname "$0")"
python3 src/main.py
