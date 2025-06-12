/**
 * Server-based AI Content Classifier
 * Uses FastAPI + sentence-transformers for semantic content classification
 */

class AIClassifier {
  constructor() {
    this.serverUrl = 'http://localhost:8080';
    this.isInitialized = false;
    this.userTopics = [];
  }

  /**
   * Initialize the classifier - check server connection
   */
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      // Check server health
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        console.log('RemoveTube: Server connected:', health);
        this.isInitialized = true;
        return true;
      }
    } catch (error) {
      console.warn('RemoveTube: Server not available, will use fallback:', error);
    }
    
    return false;
  }

  /**
   * Classify content using the server-based semantic model
   * @param {string} title - Video title
   * @param {string} description - Video description  
   * @param {string[]} allowedTopics - Topics to classify against
   * @param {boolean} strictMode - Use strict classification threshold
   * @returns {Object} Classification result
   */
  async classifyContent(title, description = '', allowedTopics = null, strictMode = false) {
    if (!allowedTopics) {
      allowedTopics = this.userTopics;
      if (!allowedTopics || allowedTopics.length === 0) {
        console.warn('No allowed topics set, using default programming topic');
        return this.fallbackToKeywordMatching(title, description, ['programming']);
      }
    }

    // First try server classification
    try {
      console.log('Attempting server classification...');
      const serverResult = await this.classifyWithServer(title, description, allowedTopics, strictMode);
      if (serverResult) {
        console.log('Server classification successful:', serverResult);
        return serverResult;
      }
    } catch (error) {
      console.warn('Server classification failed:', error);
    }

    // If server classification fails, try to initialize the server
    try {
      console.log('Attempting to initialize server...');
      const initialized = await this.initialize();
      if (initialized) {
        console.log('Server initialized, retrying classification...');
        const retryResult = await this.classifyWithServer(title, description, allowedTopics, strictMode);
        if (retryResult) {
          console.log('Retry classification successful:', retryResult);
          return retryResult;
        }
      }
    } catch (error) {
      console.warn('Server initialization failed:', error);
    }

    // Only fall back to keyword matching if all server attempts fail
    console.warn('All server attempts failed, falling back to keyword matching');
    return this.fallbackToKeywordMatching(title, description, allowedTopics);
  }

  /**
   * Server-based classification using pre-computed embeddings
   */
  async classifyWithServer(title, description, topics, strictMode) {
    try {
      // Always add 'other' to the topics list if not present
      let topicsWithOther = Array.isArray(topics) ? [...topics] : [];
      if (!topicsWithOther.map(t => t.toLowerCase()).includes('other')) {
        topicsWithOther.push('other');
      }
      console.log('Sending classification request to server...');
      // Use simple endpoint for easier testing and reliability
      const response = await fetch(`${this.serverUrl}/classify-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          topics: topicsWithOther,
          strict_mode: strictMode
        })
      });

      if (!response.ok) {
        console.error(`Server responded with error status: ${response.status}`);
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      console.log('Server classification response:', result);
      
      if (!result || typeof result.allowed !== 'boolean') {
        console.error('Invalid server response format:', result);
        throw new Error('Invalid server response format');
      }

      return {
        allowed: result.allowed,
        confidence: result.confidence || 0,
        topic: result.topic || 'unknown',
        method: result.method || 'server-classification',
        reason: result.allowed ? 'Content matches allowed topics' : 'Content does not match allowed topics',
        similarity: result.confidence || 0,
        threshold: strictMode ? 0.5 : 0.3,
        processingTime: result.processing_time_ms || 0
      };

    } catch (error) {
      console.error('Server classification error:', error);
      throw error; // Re-throw to allow retry logic
    }
  }

  /**
   * Hierarchical classification - check title first, then full content
   */
  async classifyHierarchical(title, description, allowedTopics, strictMode = false) {
    // First classify just the title (faster)
    const titleResult = await this.classifyContent(title, '', allowedTopics, strictMode);
    
    // If title is clearly allowed or blocked with high confidence, return early
    if (Math.abs(titleResult.confidence) > 0.6) {
      return {
        ...titleResult,
        method: 'hierarchical-title-only'
      };
    }
    
    // Otherwise, classify with full content
    const fullResult = await this.classifyContent(title, description, allowedTopics, strictMode);
    return {
      ...fullResult,
      method: 'hierarchical-full-content'
    };
  }

  /**
   * Simple classification endpoint for testing
   */
  async classifySimple(title, description, topics) {
    try {
      const response = await fetch(`${this.serverUrl}/classify-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          topics
        })
      });

      return await response.json();
    } catch (error) {
      console.error('RemoveTube: Simple classification failed:', error);
      return { allowed: false, error: error.message };
    }
  }

  /**
   * Fallback keyword-based classification when server is unavailable
   */
  fallbackToKeywordMatching(title, description, allowedTopics) {
    const content = `${title} ${description}`.toLowerCase();
    
    // Simple keyword matching for emergency fallback
    const programmingKeywords = ['programming', 'code', 'coding', 'javascript', 'python', 'react', 'tutorial', 'development', 'software'];
    const technologyKeywords = ['tech', 'technology', 'computer', 'software', 'hardware', 'digital'];
    
    let maxScore = 0;
    let bestTopic = allowedTopics[0] || 'unknown';
    
    for (const topic of allowedTopics) {
      let score = 0;
      const keywords = topic.toLowerCase().includes('program') ? programmingKeywords : technologyKeywords;
      
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestTopic = topic;
      }
    }
    
    const allowed = maxScore > 0;
    
    return {
      allowed,
      confidence: maxScore / 10, // Normalize to 0-1 range
      topic: bestTopic,
      method: 'keyword-fallback',
      reason: allowed ? 'Keyword match found' : 'No keyword matches',
      similarity: maxScore / 10,
      threshold: 0.1,
      processingTime: 1
    };
  }

  /**
   * Get classifier status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      serverAvailable: this.isInitialized,
      topicsConfigured: this.userTopics && this.userTopics.length > 0
    };
  }

  /**
   * Check server health
   */
  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        return health.status === 'healthy';
      }
    } catch (error) {
      console.warn('RemoveTube: Server health check failed:', error);
    }
    return false;
  }

  /**
   * Setup topics with message passing support
   */
  async setupTopics(topics) {
    this.userTopics = topics;
    console.log('RemoveTube: Topics set:', topics);
  }

  /**
   * Test the brownies case specifically
   */
  async testBrowniesCase() {
    try {
      const stored = await this._loadStoredEmbeddings();
      const topics = stored?.userTopics || ['programming', 'technology'];
      
      const result = await this.classifySimple(
        "How to Make Perfect Brownies at Home",
        "Learn the secret techniques for baking delicious, fudgy brownies with a crispy top and soft center. Perfect for dessert lovers!",
        topics
      );
      
      // Brownies should be BLOCKED (allowed = false) for programming/tech topics
      const passed = !result.allowed;
      
      return {
        passed,
        expected: false,
        actual: result.allowed,
        result: result,
        error: result.error
      };
    } catch (error) {
      return {
        passed: false,
        expected: false,
        actual: null,
        result: null,
        error: error.message
      };
    }
  }
}

// Create global instance
const aiClassifier = new AIClassifier();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.aiClassifier = aiClassifier;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIClassifier, aiClassifier };
}
