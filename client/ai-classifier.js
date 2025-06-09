/**
 * Server-based AI Content Classifier
 * Uses FastAPI + sentence-transformers for semantic content classification
 */

class AIClassifier {
  constructor() {
    this.serverUrl = 'http://localhost:8001';
    this.isInitialized = false;
    this.userTopics = [];
    this.userTopicEmbeddings = null;
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
    // Use stored topics if not provided
    if (!allowedTopics) {
      const stored = await this._loadStoredEmbeddings();
      if (stored && stored.userTopics && stored.userTopicEmbeddings) {
        this.userTopics = stored.userTopics;
        this.userTopicEmbeddings = stored.userTopicEmbeddings;
        allowedTopics = this.userTopics;
      } else {
        return this._fallbackClassification(title, description, ['programming']);
      }
    }

    // Try server-based classification first
    try {
      const serverResult = await this._classifyWithServer(title, description, allowedTopics, strictMode);
      if (serverResult) return serverResult;
    } catch (error) {
      console.warn('RemoveTube: Server classification failed, using fallback:', error);
    }

    // Fallback to keyword-based classification
    return this._fallbackClassification(title, description, allowedTopics);
  }

  /**
   * Server-based classification using pre-computed embeddings
   */
  async _classifyWithServer(title, description, topics, strictMode) {
    try {
      // Use simple endpoint for easier testing and reliability
      const response = await fetch(`${this.serverUrl}/classify-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          topics,
          strict_mode: strictMode
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      
      return {
        allowed: result.allowed,
        confidence: result.confidence,
        topic: result.topic,
        method: result.method || 'server-classification',
        reason: result.allowed ? 'Content matches allowed topics' : 'Content does not match allowed topics',
        similarity: result.confidence,
        threshold: strictMode ? 0.5 : 0.3,
        processingTime: result.processing_time_ms
      };

    } catch (error) {
      console.error('RemoveTube: Server classification error:', error);
      return null;
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
  _fallbackClassification(title, description, allowedTopics) {
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
   * Load stored embeddings - works with both extension context and page context
   */
  async _loadStoredEmbeddings() {
    // Try session storage first (for session-based topics)
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Use message passing for content script context
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'getSessionStorage',
            keys: ['userTopics', 'userTopicEmbeddings']
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        // Direct storage access for extension pages
        return await chrome.storage.local.get(['userTopics', 'userTopicEmbeddings']);
      }
    } catch (error) {
      console.warn('RemoveTube: Could not access storage:', error);
    }
    return null;
  }

  /**
   * Setup topics with message passing support
   */
  async setupTopics(topics) {
    if (!topics || topics.length === 0) {
      console.error('RemoveTube: No topics provided for setup');
      return false;
    }

    try {
      const response = await fetch(`${this.serverUrl}/embed-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topics })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        this.userTopics = topics;
        this.userTopicEmbeddings = result.embeddings;
        
        // Store in browser storage for persistence
        await this._storeEmbeddings(topics, result.embeddings);
        
        console.log('RemoveTube: Topic embeddings generated and stored');
        return true;
      }
    } catch (error) {
      console.error('RemoveTube: Failed to setup topics:', error);
    }
    
    return false;
  }

  /**
   * Store embeddings - works with both extension context and page context
   */
  async _storeEmbeddings(topics, embeddings) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Use message passing for content script context (session storage)
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'setSessionStorage',
            data: {
              userTopics: topics,
              userTopicEmbeddings: embeddings
            }
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        // Direct storage access for extension pages
        return await chrome.storage.local.set({
          userTopics: topics,
          userTopicEmbeddings: embeddings
        });
      }
    } catch (error) {
      console.warn('RemoveTube: Could not store embeddings:', error);
    }
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
