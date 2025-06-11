import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import logging
import time
import re
from transformers import pipeline
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RemoveTube AI Classifier", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize zero-shot classifier
zero_shot_classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-1")

# Request/Response models
class ClassifyRequest(BaseModel):
    title: str
    description: str = ""
    topics: List[str]
    strict_mode: bool = False

class ClassifyResponse(BaseModel):
    allowed: bool
    topic: str
    confidence: float
    method: str
    processing_time_ms: float

def get_topic_variations(topic: str) -> List[str]:
    """Generate common variations of a topic for better matching"""
    variations = [topic.lower()]
    # Add plural form
    if not topic.endswith('s'):
        variations.append(topic.lower() + 's')
    # Add common prefixes/suffixes
    variations.extend([
        f"about {topic.lower()}",
        f"{topic.lower()} related",
        f"{topic.lower()} content"
    ])
    return variations

def keyword_match(content: str, topics: List[str], min_confidence: float = 0.8) -> tuple[bool, str, float]:
    """
    Perform keyword matching with word boundaries and topic variations
    Returns: (is_match, matched_topic, confidence)
    """
    content = content.lower()
    
    for topic in topics:
        variations = get_topic_variations(topic)
        for variation in variations:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(variation) + r'\b'
            if re.search(pattern, content):
                # Calculate confidence based on number of matches and position
                matches = len(re.findall(pattern, content))
                confidence = min(1.0, 0.7 + (matches * 0.1))  # Base 0.7 + 0.1 per match, max 1.0
                
                if confidence >= min_confidence:
                    return True, topic, confidence
    
    return False, "", 0.0

@app.get("/")
async def root():
    return {
        "message": "RemoveTube AI Classifier Server",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": True
    }

@app.post("/classify-simple", response_model=ClassifyResponse)
async def classify_simple(request: ClassifyRequest):
    """
    Classify video content using a hybrid approach:
    1. Quick keyword matching with variations
    2. Zero-shot classification as fallback
    """
    try:
        start_time = time.time()
        
        # Extract title and description
        title = request.title
        description = request.description
        content = f"{title} {description}".strip()
        
        # Log incoming request
        logger.info(f"Processing request - Title: '{title}' | Description: '{description}' | Topics: {request.topics} | Strict mode: {request.strict_mode}")
        
        # Limit content length
        content = content[:512]
        
        # 1. Enhanced keyword matching
        min_keyword_confidence = 0.8 if request.strict_mode else 0.7
        is_match, matched_topic, confidence = keyword_match(content, request.topics, min_keyword_confidence)
        
        if is_match:
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"Keyword match found for '{title}' - Topic: {matched_topic} (confidence: {confidence:.3f}) [{processing_time:.2f}ms]")
            return ClassifyResponse(
                allowed=True,
                topic=matched_topic,
                confidence=confidence,
                method="keyword",
                processing_time_ms=processing_time
            )
        
        # 2. Zero-shot classification
        if not title.strip():
            raise HTTPException(status_code=400, detail="Title must not be empty.")
        
        result = zero_shot_classifier(
            content,
            candidate_labels=request.topics,
            hypothesis_template="This video is about {} and contains content related to this topic."
        )
        
        # Fix: Get the index of the maximum score directly
        best_idx = result["scores"].index(max(result["scores"]))
        best_topic = result["labels"][best_idx]
        best_score = result["scores"][best_idx]
        
        # Determine threshold based on strict mode
        threshold = 0.5 if request.strict_mode else 0.3
        
        # Make decision
        is_allowed = best_score >= threshold
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"Zero-shot classification for '{title}' - Topic: {best_topic} (confidence: {best_score:.3f}) - {'ALLOWED' if is_allowed else 'BLOCKED'} [{processing_time:.2f}ms]")
        
        return ClassifyResponse(
            allowed=is_allowed,
            topic=best_topic,
            confidence=best_score,
            method="zero-shot",
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error classifying content for title '{request.title}':\nError: {str(e)}\nTraceback:\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Error classifying content: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
