/**
 * Browser-based AI Content Classifier
 * Uses Transformers.js for local content classification without external APIs
 */

class AIClassifier {
  constructor() {
    this.isInitialized = false;
    this.classifier = null;
    this.embedder = null;
    this.initPromise = null;
  }

  /**
   * Initialize the AI models
   */
  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('Initializing AI Classifier...');
      
      // Import Transformers.js
      if (typeof Transformers === 'undefined') {
        await this._loadTransformers();
      }

      // Initialize models with timeout and retry logic
      console.log('Loading classification model...');
      this.classifier = await Promise.race([
        Transformers.pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Classification model timeout')), 30000))
      ]);
      
      console.log('Loading embedding model...');
      this.embedder = await Promise.race([
        Transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding model timeout')), 30000))
      ]);
      
      this.isInitialized = true;
      console.log('AI Classifier initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize AI Classifier:', error);
      this.isInitialized = false;
      this.classifier = null;
      this.embedder = null;
      throw error;
    }
  }

  /**
   * Load Transformers.js library
   */
  async _loadTransformers() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('lib/transformers.min.js');
      script.onload = () => {
        console.log('Transformers.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Transformers.js'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Classify content based on allowed topics
   */
  async classifyContent(title, description, allowedTopics, strictMode = false) {
    try {
      await this.initialize();

      if (!this.isInitialized || !this.classifier) {
        console.warn('AI models not available, using fallback classification');
        return this._fallbackClassification(title, description, allowedTopics);
      }

      if (!allowedTopics || allowedTopics.length === 0) {
        return { allowed: false, topic: 'no-topics', confidence: 0 };
      }

      // Combine title and description with smart truncation
      const content = this._prepareContent(title, description);
      
      // Use zero-shot classification with timeout
      const result = await Promise.race([
        this.classifier(content, allowedTopics),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Classification timeout')), 10000))
      ]);
      
      const topLabel = result.labels[0];
      const topScore = result.scores[0];
      
      // Adjust threshold based on strict mode
      const threshold = strictMode ? 0.7 : 0.5;
      
      console.log(`AI Classification: "${topLabel}" (${topScore.toFixed(3)}) - ${topScore >= threshold ? 'ALLOWED' : 'BLOCKED'}`);
      
      return {
        allowed: topScore >= threshold,
        topic: topLabel,
        confidence: topScore,
        allScores: result.scores.map((score, i) => ({
          topic: result.labels[i],
          confidence: score
        }))
      };
    } catch (error) {
      console.error('AI classification error:', error);
      // Fallback to keyword matching
      return this._fallbackClassification(title, description, allowedTopics);
    }
  }

  /**
   * Enhanced classification with semantic similarity
   */
  async classifyWithSimilarity(title, description, allowedTopics, strictMode = false) {
    try {
      await this.initialize();

      if (!this.isInitialized || !this.embedder) {
        console.warn('Embedding model not available, falling back to regular classification');
        return this.classifyContent(title, description, allowedTopics, strictMode);
      }

      if (!allowedTopics || allowedTopics.length === 0) {
        return { allowed: false, topic: 'no-topics', confidence: 0 };
      }

      const content = this._prepareContent(title, description);
      
      // Get embeddings for content and topics with timeout
      const contentEmbedding = await Promise.race([
        this.embedder(content),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Content embedding timeout')), 10000))
      ]);
      
      const topicEmbeddings = await Promise.all(
        allowedTopics.map(topic => 
          Promise.race([
            this.embedder(topic),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Topic embedding timeout')), 5000))
          ])
        )
      );
      
      // Calculate similarity scores
      const similarities = topicEmbeddings.map((topicEmb, i) => ({
        topic: allowedTopics[i],
        similarity: this._cosineSimilarity(contentEmbedding, topicEmb)
      }));
      
      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      const bestMatch = similarities[0];
      const threshold = strictMode ? 0.8 : 0.6;
      
      console.log(`Similarity Classification: "${bestMatch.topic}" (${bestMatch.similarity.toFixed(3)}) - ${bestMatch.similarity >= threshold ? 'ALLOWED' : 'BLOCKED'}`);
      
      return {
        allowed: bestMatch.similarity >= threshold,
        topic: bestMatch.topic,
        confidence: bestMatch.similarity,
        allScores: similarities
      };
    } catch (error) {
      console.error('Similarity classification error:', error);
      // Fallback to regular classification
      return this.classifyContent(title, description, allowedTopics, strictMode);
    }
  }

  /**
   * Hierarchical classification: check title first, then description
   */
  async classifyHierarchical(title, description, allowedTopics, strictMode = false) {
    try {
      // First check title only
      const titleResult = await this.classifyContent(title, '', allowedTopics, strictMode);
      
      // If title is clearly allowed, return immediately
      if (titleResult.allowed && titleResult.confidence > 0.8) {
        console.log('Content allowed based on title classification');
        return { ...titleResult, method: 'title-only' };
      }
      
      // If title is clearly blocked, return immediately
      if (!titleResult.allowed && titleResult.confidence > 0.8) {
        console.log('Content blocked based on title classification');
        return { ...titleResult, method: 'title-only' };
      }
      
      // For uncertain cases, check full content
      console.log('Title classification uncertain, checking full content...');
      const fullResult = await this.classifyContent(title, description, allowedTopics, strictMode);
      return { ...fullResult, method: 'hierarchical' };
      
    } catch (error) {
      console.error('Hierarchical classification error:', error);
      return this.classifyContent(title, description, allowedTopics, strictMode);
    }
  }

  /**
   * Smart content preparation with chunking for long descriptions
   */
  _prepareContent(title, description) {
    const maxLength = 512; // Model context limit
    const titleText = title || '';
    const descText = description || '';
    
    // Always include title
    let content = titleText;
    
    // Add description if there's room
    if (descText) {
      const remainingLength = maxLength - titleText.length - 10; // Buffer for punctuation
      
      if (descText.length <= remainingLength) {
        content += '. ' + descText;
      } else {
        // Smart truncation at sentence boundaries
        const sentences = descText.split(/[.!?]+/);
        let truncatedDesc = '';
        
        for (const sentence of sentences) {
          if ((truncatedDesc + sentence).length <= remainingLength) {
            truncatedDesc += sentence + '. ';
          } else {
            break;
          }
        }
        
        content += '. ' + truncatedDesc.trim();
      }
    }
    
    return content.trim();
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  _cosineSimilarity(a, b) {
    // Flatten tensors to arrays
    const vecA = Array.isArray(a) ? a : Array.from(a.data);
    const vecB = Array.isArray(b) ? b : Array.from(b.data);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fallback keyword-based classification
   */
  _fallbackClassification(title, description, allowedTopics) {
    const content = `${title} ${description}`.toLowerCase();
    
    for (const topic of allowedTopics) {
      const topicWords = topic.toLowerCase().split(/[\s,]+/);
      const matchCount = topicWords.filter(word => 
        content.includes(word) || 
        content.includes(word.slice(0, -1)) || // Handle plurals
        content.includes(word + 's')
      ).length;
      
      const confidence = matchCount / topicWords.length;
      
      if (confidence > 0.3) {
        console.log(`Fallback classification: "${topic}" (${confidence.toFixed(3)}) - ALLOWED`);
        return {
          allowed: true,
          topic: topic,
          confidence: confidence,
          method: 'fallback-keywords'
        };
      }
    }
    
    console.log('Fallback classification: No matches found - BLOCKED');
    return {
      allowed: false,
      topic: 'unmatched',
      confidence: 0,
      method: 'fallback-keywords'
    };
  }

  /**
   * Get model status and performance info
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasClassifier: !!this.classifier,
      hasEmbedder: !!this.embedder
    };
  }
}

// Create global instance
window.aiClassifier = new AIClassifier();
