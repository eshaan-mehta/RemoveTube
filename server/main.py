from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RemoveTube AI Classifier", version="1.0.0")

# Add CORS middleware to allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the sentence transformer model (fast and accurate)
# Using a smaller model for lower latency
MODEL_NAME = "all-MiniLM-L6-v2"  # 22MB, ~50ms inference time
logger.info(f"Loading model: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)
logger.info("Model loaded successfully!")

# Request/Response models
class TopicRequest(BaseModel):
    topics: List[str]

class ClassifyRequest(BaseModel):
    title: str
    description: str = ""
    topic_embeddings: List[List[float]]
    topic_names: List[str]
    strict_mode: bool = False

class TopicResponse(BaseModel):
    embeddings: List[List[float]]
    success: bool
    message: str

class ClassifyResponse(BaseModel):
    allowed: bool
    topic: str
    confidence: float
    method: str
    processing_time_ms: float

@app.get("/")
async def root():
    return {
        "message": "RemoveTube AI Classifier Server",
        "model": MODEL_NAME,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_name": MODEL_NAME
    }

@app.post("/embed-topics", response_model=TopicResponse)
async def embed_topics(request: TopicRequest):
    """
    Convert user's topic choices into embeddings for faster classification
    This is called once during setup to pre-compute embeddings
    """
    try:
        start_time = time.time()
        
        if not request.topics:
            raise HTTPException(status_code=400, detail="No topics provided")
        
        logger.info(f"Embedding topics: {request.topics}")
        
        # Generate embeddings for all topics
        embeddings = model.encode(request.topics, convert_to_numpy=True)
        
        # Convert numpy arrays to lists for JSON serialization
        embeddings_list = embeddings.tolist()
        
        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Embedded {len(request.topics)} topics in {processing_time:.2f}ms")
        
        return TopicResponse(
            embeddings=embeddings_list,
            success=True,
            message=f"Successfully embedded {len(request.topics)} topics"
        )
        
    except Exception as e:
        logger.error(f"Error embedding topics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error embedding topics: {str(e)}")

@app.post("/classify", response_model=ClassifyResponse)
async def classify_content(request: ClassifyRequest):
    """
    Classify video content against pre-computed topic embeddings
    This is called for each video the user clicks on
    """
    try:
        start_time = time.time()
        
        # Prepare content text
        content = f"{request.title}"
        if request.description:
            content += f". {request.description}"
        
        # Limit content length for faster processing
        content = content[:512]  # Truncate to model's context window
        
        logger.info(f"Classifying: '{content[:100]}...' against {len(request.topic_names)} topics")
        
        # Generate embedding for the content
        content_embedding = model.encode([content], convert_to_numpy=True)[0]
        
        # Convert topic embeddings back to numpy array
        topic_embeddings = np.array(request.topic_embeddings)
        
        # Calculate cosine similarities
        content_embedding = content_embedding.reshape(1, -1)
        similarities = cosine_similarity(content_embedding, topic_embeddings)[0]
        
        # Find best matching topic
        best_idx = np.argmax(similarities)
        best_score = float(similarities[best_idx])
        best_topic = request.topic_names[best_idx]
        
        # Determine threshold based on strict mode
        threshold = 0.3 if request.strict_mode else 0.15
        
        # Make decision
        is_allowed = best_score >= threshold
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"Classification result: {best_topic} ({best_score:.3f}) - {'ALLOWED' if is_allowed else 'BLOCKED'} [{processing_time:.2f}ms]")
        
        return ClassifyResponse(
            allowed=is_allowed,
            topic=best_topic,
            confidence=best_score,
            method="vector-embedding",
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error classifying content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error classifying content: {str(e)}")

@app.post("/classify-simple")
async def classify_simple(request: dict):
    """
    Simple endpoint that takes topics as text (for testing)
    """
    try:
        start_time = time.time()
        
        # Extract title and description from request
        title = request.get("title", "")
        description = request.get("description", "")
        content = request.get("content", "")
        
        # If content is not provided, combine title and description
        if not content:
            content = f"{title} {description}".strip()
        
        topics = request.get("topics", [])
        strict_mode = request.get("strict_mode", False)
        
        if not topics:
            return {"allowed": False, "topic": "no-topics", "confidence": 0.0}
        
        content = content[:512]  # Truncate to reasonable length
        
        # Generate embeddings
        content_embedding = model.encode([content], convert_to_numpy=True)[0]
        topic_embeddings = model.encode(topics, convert_to_numpy=True)
        
        # Calculate cosine similarities (more appropriate for sentence-transformers)
        from sklearn.metrics.pairwise import cosine_similarity
        content_embedding = content_embedding.reshape(1, -1)
        similarities = cosine_similarity(content_embedding, topic_embeddings)[0]
        
        best_idx = np.argmax(similarities)
        best_score = float(similarities[best_idx])
        best_topic = topics[best_idx]
        
        threshold = 0.3 if strict_mode else 0.15
        is_allowed = best_score >= threshold
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "allowed": is_allowed,
            "topic": best_topic,
            "confidence": best_score,
            "method": "vector-embedding-simple",
            "processing_time_ms": processing_time
        }
        
    except Exception as e:
        logger.error(f"Error in simple classification: {str(e)}")
        return {"allowed": False, "topic": "error", "confidence": 0.0, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
