// Content script for RemoveTube extension
(function() {
  'use strict';

  let isProcessing = false;
  let allowedTopics = [];
  let strictMode = true;

  // Global flag to track if we're in blocked video state
  let isVideoBlocked = false;

  // Load settings from session storage via background script
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        // Don't access storage if we're in blocked video state
        if (isVideoBlocked) {
          console.log('RemoveTube: Skipping storage access in blocked video state');
          resolve(false);
          return;
        }

        // Check if chrome extension context is still valid
        if (!chrome || !chrome.runtime) {
          console.warn('RemoveTube: Chrome extension context invalidated, using default settings');
          allowedTopics = [];
          strictMode = true;
          resolve(false);
          return;
        }

        // First check session storage for current session topics via background script
        chrome.runtime.sendMessage({
          action: 'getSessionStorage',
          keys: ['sessionTopics', 'sessionStrictMode']
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('RemoveTube: Session storage error:', chrome.runtime.lastError.message);
            // Fallback to empty session
            allowedTopics = [];
            strictMode = true;
            resolve(false);
            return;
          }

          if (!response || !response.success) {
            console.warn('RemoveTube: Failed to get session storage:', response?.error);
            allowedTopics = [];
            strictMode = true;
            resolve(false);
            return;
          }

          const sessionData = response.data;
          const hasSessionTopics = sessionData.sessionTopics && sessionData.sessionTopics.length > 0;
          
          if (hasSessionTopics) {
            // Use session data if available
            allowedTopics = sessionData.sessionTopics;
            strictMode = sessionData.sessionStrictMode !== false;
            console.log('RemoveTube: Loaded session topics:', allowedTopics);
            resolve(true);
          } else {
            // No session topics - this means setup is needed
            allowedTopics = [];
            strictMode = true;
            console.log('RemoveTube: No session topics found, setup required');
            resolve(false);
          }
        });
      } catch (error) {
        console.warn('RemoveTube: Error loading settings, extension context may be invalidated:', error);
        allowedTopics = [];
        strictMode = true;
        resolve(false);
      }
    });
  }

  // Show setup overlay
  function showSetupOverlay() {
    console.log('showSetupOverlay called');
    
    try {
      if (document.getElementById('removetube-setup-overlay')) {
        console.log('Setup overlay already exists, skipping');
        return;
      }

      console.log('Creating setup overlay...');
      createSetupOverlay();
    } catch (error) {
      console.error('Error in showSetupOverlay:', error);
    }
  }

  function createSetupOverlay() {
      console.log('Creating setup overlay without API key sections');
      
      const overlay = document.createElement('div');
      overlay.id = 'removetube-setup-overlay';
      overlay.innerHTML = `
        <div class="removetube-overlay">
          <div class="removetube-modal">
            <h2>🎯 Welcome to RemoveTube!</h2>
            <p>Let's set up your allowed content to help you stay focused using our powerful server-based AI.</p>
            
            <div class="removetube-form">
              <div class="ai-info-section">
                <div class="ai-info-card">
                  <h3>🧠 Powered by Server-Based AI</h3>
                  <p>RemoveTube uses advanced local AI models that run directly in your browser for:</p>
                  <ul>
                    <li>✅ <strong>Privacy:</strong> No data sent to external servers</li>
                    <li>✅ <strong>Speed:</strong> Instant content analysis</li>
                    <li>✅ <strong>Accuracy:</strong> Smart content classification</li>
                    <li>✅ <strong>No Setup:</strong> Works immediately, no API keys needed</li>
                  </ul>
                </div>
              </div>
              
              <label for="removetube-topics">What content do you want to allow? (comma-separated) <span style="color: red;">*</span>:</label>
              <input type="text" id="removetube-topics" placeholder="education, music, cooking, programming" required />
              <small style="color: #888; font-size: 12px;">This field is required. Enter at least one topic to continue.</small>
              
              <div class="removetube-checkbox">
                <input type="checkbox" id="removetube-strict" checked />
                <label for="removetube-strict">Strict mode (block if uncertain)</label>
              </div>
              
              <button id="removetube-save">Save & Continue</button>
            </div>
          </div>
        </div>
      `;

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .removetube-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #1a1a1a;
          z-index: 999999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          backdrop-filter: none;
          overflow: hidden;
        }
        
        .removetube-overlay::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: -1;
        }
        
        .removetube-modal {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
          max-width: 700px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .removetube-modal h2 {
          margin: 0 0 20px 0;
          color: #333;
          text-align: center;
          font-size: 28px;
          font-weight: 600;
        }
        
        .removetube-modal p {
          margin: 0 0 30px 0;
          color: #666;
          text-align: center;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .ai-info-section {
          margin-bottom: 30px;
        }
        
        .ai-info-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        
        .ai-info-card h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .ai-info-card p {
          margin: 0 0 15px 0;
          color: rgba(255, 255, 255, 0.9);
          text-align: left;
          font-size: 14px;
        }
        
        .ai-info-card ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        
        .ai-info-card li {
          margin: 8px 0;
          padding: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }
        
        .removetube-form label {
          display: block;
          margin: 20px 0 8px 0;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .removetube-form input[type="text"] {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 10px;
          box-sizing: border-box;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }
        
        .removetube-form input[type="text"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .removetube-form input[type="text"][required] {
          border-color: #d32f2f;
        }
        
        .removetube-form input[type="text"][required]:valid {
          border-color: #2e7d32;
        }
        
        .removetube-form small {
          color: #888;
          font-size: 12px;
          margin-top: 6px;
          display: block;
          line-height: 1.4;
        }
        
        .removetube-checkbox {
          display: flex;
          align-items: center;
          margin: 20px 0;
          padding: 12px;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 8px;
        }
        
        .removetube-checkbox input {
          margin-right: 12px;
          transform: scale(1.2);
        }
        
        .removetube-checkbox label {
          margin: 0;
          color: #333;
          font-size: 14px;
        }
        
        .removetube-form button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .removetube-form button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .removetube-form button:active {
          transform: translateY(0);
        }
        
        /* Hide all page content behind overlay */
        body.removetube-overlay-active {
          overflow: hidden;
        }
        
        body.removetube-overlay-active > *:not(#removetube-setup-overlay) {
          display: none !important;
        }
      `;      document.head.appendChild(style);
      document.body.appendChild(overlay);
      
      // Hide all page content behind the overlay
      document.body.classList.add('removetube-overlay-active');

      // Wait for DOM elements to be available before attaching event listeners
      setTimeout(() => {
        // Handle save button with improved error handling and timing
        const saveButton = document.getElementById('removetube-save');
        if (saveButton) {
          saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Save button clicked');
            
            // Add loading state to button
            const originalText = saveButton.textContent;
            saveButton.textContent = '⏳ Saving...';
            saveButton.disabled = true;
            
            try {
              const topicsInput = document.getElementById('removetube-topics');
              const strictInput = document.getElementById('removetube-strict');
              
              if (!topicsInput || !strictInput) {
                throw new Error('Required form elements not found');
              }
              
              const topics = topicsInput.value
                .split(',')
                .map(topic => topic.trim())
                .filter(topic => topic.length > 0);
              
              // Validate that at least one topic is provided
              if (topics.length === 0) {
                alert('Please enter at least one allowed topic before continuing.');
                topicsInput.focus();
                // Reset button state
                saveButton.textContent = originalText;
                saveButton.disabled = false;
                return;
              }
              
              const strict = strictInput.checked;

              // Save to session storage (topics expire when leaving YouTube)
              const sessionData = {
                sessionTopics: topics,
                sessionStrictMode: strict
              };
              
              console.log('Attempting to save session data:', sessionData);
              
              // Verify chrome extension context before saving
              if (!chrome || !chrome.runtime) {
                throw new Error('Chrome extension context is not available');
              }

              chrome.runtime.sendMessage({
                action: 'setSessionStorage',
                data: sessionData
              }, async (response) => {
                if (chrome.runtime.lastError) {
                  console.error('RemoveTube: Error saving session settings:', chrome.runtime.lastError.message);
                  alert('Error saving settings: ' + chrome.runtime.lastError.message + '. Please try again.');
                  // Reset button state
                  saveButton.textContent = originalText;
                  saveButton.disabled = false;
                  return;
                }

                if (!response || !response.success) {
                  console.error('RemoveTube: Failed to save session settings:', response?.error);
                  alert('Error saving settings: ' + (response?.error || 'Unknown error') + '. Please try again.');
                  // Reset button state
                  saveButton.textContent = originalText;
                  saveButton.disabled = false;
                  return;
                }
                
                console.log('Session settings saved successfully, setting up AI server...');
                
                // Cleanup overlay
                try {
                  overlay.remove();
                  style.remove();
                  document.body.classList.remove('removetube-overlay-active');
                } catch (cleanupError) {
                  console.warn('Error during overlay cleanup:', cleanupError);
                }
                
                // Reload settings to confirm they were saved
                loadSettings().then((isComplete) => {
                  console.log('RemoveTube setup complete! Settings reloaded:', isComplete);
                  // Start checking videos after setup
                  if (window.location.pathname.includes('/watch')) {
                    setTimeout(() => checkCurrentVideo(), 1000);
                  }
                }).catch((error) => {
                  console.error('RemoveTube: Error loading settings after setup:', error);
                });
              });
              
            } catch (error) {
              console.error('Error during save operation:', error);
              alert('Error saving settings: ' + error.message + '. Please try again.');
              // Reset button state
              saveButton.textContent = originalText;
              saveButton.disabled = false;
            }
          });
        } else {
          console.error('Save button not found!');
        }
        
      }, 100); // End of setTimeout for event listener attachment
    
    console.log('Setup overlay created and event listeners attached');
  }

  // Check if content matches allowed topics using simple keyword matching
  function checkContentSimple(title, description) {
    const content = `${title} ${description}`.toLowerCase();
    
    for (const topic of allowedTopics) {
      if (content.includes(topic.toLowerCase())) {
        return { allowed: true, topic: topic, confidence: 0.8 };
      }
    }
    
    return { allowed: false, confidence: 0.2 };
  }

  // Check content using server-based AI
  async function checkContentWithAI(title, description) {
    if (!allowedTopics || allowedTopics.length === 0) {
      console.warn('No allowed topics set, falling back to simple matching');
      return checkContentSimple(title, description);
    }

    try {
      console.log('Using server-based AI classification...');
      
      // Use hierarchical classification for better performance and accuracy
      const result = await window.aiClassifier.classifyHierarchical(
        title, 
        description, 
        allowedTopics, 
        strictMode
      );
      
      console.log('Server AI classification result:', result);
      
      return {
        allowed: result.allowed,
        topic: result.topic,
        confidence: result.confidence,
        method: result.method || 'browser-ai'
      };
    } catch (error) {
      console.warn('Browser AI classification error, falling back to simple matching:', error);
      return checkContentSimple(title, description);
    }
  }

  // Block video with explanation
  function blockVideo(reason, topic, confidence) {
    // Set blocked video flag to prevent storage access
    isVideoBlocked = true;
    
    // Store original page state before blocking
    const originalTitle = document.title;
    const originalUrl = window.location.href;
    
    console.log('Blocking video:', { originalUrl, reason, topic, confidence });
    
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        margin: 0;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-width: 500px;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
          <h2 style="color: #d32f2f; margin: 0 0 15px 0;">Content Blocked</h2>
          <p style="color: #666; margin: 0 0 20px 0; line-height: 1.5;">
            This video doesn't match your allowed topics and has been blocked to help you stay focused.
          </p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Detected topic:</strong> ${topic || 'Unknown'}<br>
            <strong>Confidence:</strong> ${Math.round((confidence || 0) * 100)}%<br>
            <strong>Allowed topics:</strong> ${allowedTopics.join(', ')}
          </div>
          <p style="color: #ff9800; font-size: 14px; margin: 15px 0 5px 0; line-height: 1.4;">
            <strong>Think this is a mistake?</strong> Use "Watch Anyway" if the video was incorrectly detected.
          </p>
          <button id="go-back-btn" style="
            background: #1976d2;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
          ">← Go Back</button>
          <button id="settings-btn" style="
            background: #666;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
          ">⚙️ Settings</button>
          <button id="watch-anyway-btn" style="
            background: #f57c00;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          ">⚠️ Watch Anyway</button>
        </div>
      </div>
    `;

    // Add event listeners after the content is created
    setTimeout(() => {
      const goBackBtn = document.getElementById('go-back-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const watchAnywayBtn = document.getElementById('watch-anyway-btn');
      
      // Store original URL to detect navigation
      const blockedVideoUrl = window.location.href;
      console.log('Video blocked at URL:', blockedVideoUrl);
      
      // Set up navigation detection
      const checkForNavigation = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== blockedVideoUrl) {
          console.log('Navigation detected! URL changed from', blockedVideoUrl, 'to', currentUrl);
          // Reset blocked video flag since user has navigated away
          isVideoBlocked = false;
          // Clear the navigation checker
          clearInterval(navigationChecker);
          // Remove the blocking overlay since user has navigated away
          const blockingOverlay = document.querySelector('body');
          if (blockingOverlay && blockingOverlay.innerHTML.includes('Content Blocked')) {
            console.log('Removing blocking overlay after navigation');
            // Force page reload to clear blocked content and load new page
            setTimeout(() => {
              location.reload();
            }, 50);
          }
        }
      };
      
      // Check for navigation every 500ms
      const navigationChecker = setInterval(checkForNavigation, 500);
      
      // Clean up interval after 10 seconds (navigation should happen quickly)
      setTimeout(() => {
        clearInterval(navigationChecker);
      }, 10000);

      if (goBackBtn) {
        goBackBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Go back button clicked');
          
          // Immediately show loading state
          goBackBtn.textContent = '⏳ Going back...';
          goBackBtn.disabled = true;
          goBackBtn.style.background = '#999';
          
          // Clear the interval immediately to prevent further storage access
          clearInterval(navigationChecker);
          
          // Reset blocked video flag since we're navigating away
          isVideoBlocked = false;
          
          const currentUrl = window.location.href;
          console.log('Current URL before navigation:', currentUrl);
          
          // Try history.back() first, then fallback to YouTube home
          try {
            if (window.history.length > 1) {
              console.log('Using history.back()');
              
              // Set up a listener for when the page actually changes
              const handlePopState = () => {
                console.log('Navigation completed via history.back()');
                window.removeEventListener('popstate', handlePopState);
                // Force reload to clear the blocked content
                setTimeout(() => {
                  if (document.body.innerHTML.includes('Content Blocked')) {
                    console.log('Blocked content still visible, reloading page');
                    location.reload();
                  }
                }, 100);
              };
              
              window.addEventListener('popstate', handlePopState);
              
              // Also set a backup timer in case popstate doesn't fire
              setTimeout(() => {
                window.removeEventListener('popstate', handlePopState);
                if (window.location.href === currentUrl) {
                  console.log('history.back() failed, navigating to YouTube home');
                  window.location.assign('https://www.youtube.com/');
                } else if (document.body.innerHTML.includes('Content Blocked')) {
                  console.log('URL changed but blocked content still visible, reloading');
                  location.reload();
                }
              }, 1000);
              
              // Additional fallback: if still blocked after 2 seconds, force clear
              setTimeout(() => {
                if (document.body.innerHTML.includes('Content Blocked')) {
                  console.log('Blocked content persisted, forcing navigation to YouTube home');
                  window.location.assign('https://www.youtube.com/');
                }
              }, 2000);
              
              window.history.back();
            } else {
              console.log('No history, navigating to YouTube home');
              window.location.assign('https://www.youtube.com/');
            }
          } catch (error) {
            console.error('Navigation error:', error);
            console.log('Fallback: navigating to YouTube home');
            window.location.assign('https://www.youtube.com/');
          }
        });
      }

      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Settings button clicked');
          
          // Clear the interval immediately to prevent further storage access
          clearInterval(navigationChecker);
          
          // Send message to background script to open options
          try {
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ action: 'openOptions' }, (response) => {
                if (chrome.runtime.lastError) {
                  console.warn('Runtime error:', chrome.runtime.lastError);
                  fallbackToDirectOptionsOpen();
                } else if (response && !response.success) {
                  console.warn('Background script error:', response.error);
                  fallbackToDirectOptionsOpen();
                }
              });
            } else {
              fallbackToDirectOptionsOpen();
            }
          } catch (error) {
            console.error('Error sending message to background:', error);
            fallbackToDirectOptionsOpen();
          }
        });
      }

      if (watchAnywayBtn) {
        watchAnywayBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Watch Anyway button clicked - user override for misdetection');
          console.log('Override details:', { 
            url: originalUrl, 
            detectedTopic: topic, 
            confidence: confidence,
            allowedTopics: allowedTopics 
          });
          
          // Show confirmation to ensure user understands
          const confirmed = confirm(
            'Are you sure you want to watch this video?\n\n' +
            'This will override the content filter for this video only. The filter will continue to work for other videos.\n\n' +
            'Click OK to proceed or Cancel to go back.'
          );
          
          if (confirmed) {
            // Show loading state
            watchAnywayBtn.textContent = '⏳ Loading video...';
            watchAnywayBtn.disabled = true;
            watchAnywayBtn.style.background = '#999';
            
            // Clear the interval immediately
            clearInterval(navigationChecker);
            
            // Reset blocked video flag
            isVideoBlocked = false;
            
            console.log('User confirmed override, reloading original video at:', originalUrl);
            
            // Track override usage for debugging (optional - could be used for improving detection)
            try {
              chrome.storage.local.get(['overrideCount'], (result) => {
                const count = (result.overrideCount || 0) + 1;
                chrome.storage.local.set({ overrideCount: count });
                console.log('User override count updated:', count);
              });
            } catch (error) {
              console.log('Could not track override usage:', error);
            }
            
            try {
              // Restore the original page by reloading
              window.location.reload();
            } catch (error) {
              console.error('Error reloading page:', error);
              // Fallback: try to navigate to the original URL
              try {
                window.location.assign(originalUrl);
              } catch (fallbackError) {
                console.error('Fallback navigation failed:', fallbackError);
                alert('Unable to load the video. Please try refreshing the page manually.');
              }
            }
          } else {
            console.log('User cancelled override');
          }
        });
      }

      function fallbackToDirectOptionsOpen() {
        try {
          // Try to get extension ID and open options page directly
          if (chrome && chrome.runtime && chrome.runtime.id) {
            const optionsUrl = chrome.runtime.getURL('options.html');
            window.open(optionsUrl, '_blank');
          } else {
            // If all else fails, alert the user
            alert('Please open extension settings from the browser toolbar (click the RemoveTube icon).');
          }
        } catch (error) {
          console.error('All fallback methods failed:', error);
          alert('Please open extension settings from the browser toolbar (click the RemoveTube icon).');
        }
      }
    }, 100);
  }

  // Debug function to find title and description elements
  function debugSelectors() {
    console.log('=== DEBUG: Looking for YouTube elements ===');
    
    // Look for any h1 elements
    const h1Elements = document.querySelectorAll('h1');
    console.log('Found h1 elements:', h1Elements.length);
    h1Elements.forEach((el, i) => {
      console.log(`H1 ${i}:`, el.textContent?.trim(), el.className, el.id);
    });
    
    // Look for elements with "title" in class or id
    const titleElements = document.querySelectorAll('[class*="title"], [id*="title"]');
    console.log('Found title-related elements:', titleElements.length);
    titleElements.forEach((el, i) => {
      if (el.textContent?.trim() && el.textContent.length > 10) {
        console.log(`Title ${i}:`, el.textContent.substring(0, 50), el.tagName, el.className);
      }
    });
    
    // Look for elements with "description" in class or id
    const descElements = document.querySelectorAll('[class*="description"], [id*="description"]');
    console.log('Found description-related elements:', descElements.length);
    descElements.forEach((el, i) => {
      if (el.textContent?.trim() && el.textContent.length > 20) {
        console.log(`Desc ${i}:`, el.textContent.substring(0, 100), el.tagName, el.className);
      }
    });
    
    console.log('=== END DEBUG ===');
  }

  // Get video ID from URL
  function getVideoIdFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  }

  // Fetch video metadata from YouTube API (fallback method)
  async function fetchVideoMetadata(videoId) {
    try {
      // Try to get basic info from the page URL and any available metadata
      const metaTags = document.querySelectorAll('meta[property*="og:"], meta[name*="description"], meta[name*="title"]');
      let title = '';
      let description = '';
      
      for (const meta of metaTags) {
        if (meta.getAttribute('property') === 'og:title' || meta.getAttribute('name') === 'title') {
          title = meta.getAttribute('content') || '';
        }
        if (meta.getAttribute('property') === 'og:description' || meta.getAttribute('name') === 'description') {
          description = meta.getAttribute('content') || '';
        }
      }

      // Try to extract from YouTube's initial data
      if (!title || !description) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.textContent && script.textContent.includes('ytInitialData')) {
            try {
              const match = script.textContent.match(/var ytInitialData = ({.*?});/);
              if (match) {
                const data = JSON.parse(match[1]);
                const videoDetails = findVideoDetailsInData(data, videoId);
                if (videoDetails.title) title = videoDetails.title;
                if (videoDetails.description) description = videoDetails.description;
                break;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
      
      return { title, description };
    } catch (error) {
      console.warn('Error fetching video metadata:', error);
      return { title: '', description: '' };
    }
  }

  // Helper function to find video details in YouTube's initial data
  function findVideoDetailsInData(data, videoId) {
    let title = '';
    let description = '';
    
    try {
      // Look for video details in various parts of the data structure
      function searchForVideoDetails(obj) {
        if (obj && typeof obj === 'object') {
          if (obj.videoId === videoId) {
            if (obj.title) {
              if (typeof obj.title === 'string') {
                title = obj.title;
              } else if (obj.title.runs) {
                title = obj.title.runs.map(run => run.text).join('');
              } else if (obj.title.simpleText) {
                title = obj.title.simpleText;
              }
            }
            if (obj.shortDescription) {
              if (typeof obj.shortDescription === 'string') {
                description = obj.shortDescription;
              } else if (obj.shortDescription.runs) {
                description = obj.shortDescription.runs.map(run => run.text).join('');
              } else if (obj.shortDescription.simpleText) {
                description = obj.shortDescription.simpleText;
              }
            }
          }
          
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && (!title || !description)) {
              searchForVideoDetails(obj[key]);
            }
          }
        }
      }
      
      searchForVideoDetails(data);
    } catch (e) {
      // Ignore errors in data traversal
    }
    
    return { title, description };
  }

  // Show loading overlay while checking video
  function showLoadingOverlay() {
    if (document.getElementById('removetube-loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'removetube-loading-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 999999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      ">
        <div style="
          text-align: center;
          color: white;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
          "></div>
          <h3 style="margin: 0 0 10px 0; color: white;">🎯 RemoveTube</h3>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.8);">Checking if this content matches your allowed topics...</p>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  // Remove loading overlay
  function hideLoadingOverlay() {
    const overlay = document.getElementById('removetube-loading-overlay');
    if (overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  }

  // Check video immediately when navigating to watch page
  async function checkVideoBeforeLoad(videoUrl) {
    if (isProcessing) return;
    isProcessing = true;

    // Reset blocked video flag at start of check
    isVideoBlocked = false;

    const timeoutDuration = 5000; // 5 seconds timeout
    let timeoutId;

    try {
      showLoadingOverlay();
      
      // Set a timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.log('Video check timeout, allowing video to load');
        hideLoadingOverlay();
        isProcessing = false;
      }, timeoutDuration);
      
      const videoId = getVideoIdFromUrl(videoUrl);
      if (!videoId) {
        clearTimeout(timeoutId);
        hideLoadingOverlay();
        isProcessing = false;
        return;
      }

      console.log('Checking video immediately:', videoId);

      // First, try to get metadata from the current page if available
      let metadata = await fetchVideoMetadata(videoId);
      
      // If no metadata found, wait a bit and try to find elements
      if (!metadata.title && !metadata.description) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        metadata = await findVideoElements();
      }

      // If still no metadata after reasonable attempts, allow the video to load
      if (!metadata.title && !metadata.description) {
        console.log('No video metadata found, allowing video to load');
        clearTimeout(timeoutId);
        hideLoadingOverlay();
        isProcessing = false;
        return;
      }

      console.log('Found video metadata:', metadata.title);

      // Check content
      const result = await checkContentWithAI(metadata.title, metadata.description);

      clearTimeout(timeoutId);
      hideLoadingOverlay();

      if (!result.allowed) {
        blockVideo('Content not in allowed topics', result.topic, result.confidence);
      } else {
        console.log('Video allowed:', result.topic, `(${Math.round(result.confidence * 100)}% confidence)`);
      }
    } catch (error) {
      console.error('Error checking video before load:', error);
      clearTimeout(timeoutId);
      hideLoadingOverlay();
    } finally {
      isProcessing = false;
    }
  }

  // Find video elements on the page
  async function findVideoElements() {
    const titleSelectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.ytd-video-primary-info-renderer yt-formatted-string',
      'h1[class*="title"] yt-formatted-string',
      '#title h1 yt-formatted-string',
      '.ytd-watch-metadata h1',
      '.title.style-scope.ytd-video-primary-info-renderer',
      'h1.title',
      '#above-the-fold #title h1'
    ];
    
    const descSelectors = [
      '#description-inline-expander yt-formatted-string',
      '.ytd-expandable-video-description-body-renderer yt-formatted-string',
      '#description yt-formatted-string',
      '.content.style-scope.ytd-video-secondary-info-renderer',
      '#meta-contents #description',
      '.description-content',
      '[id="description"]',
      '.ytd-video-secondary-info-renderer #description'
    ];
    
    let title = '';
    let description = '';
    
    // Try multiple times with increasing delays
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Try to find title
      if (!title) {
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            title = element.textContent.trim();
            break;
          }
        }
      }
      
      // Try to find description
      if (!description) {
        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            description = element.textContent.trim();
            break;
          }
        }
      }
      
      // If we found both or at least a title, break
      if (title && (description || attempt >= 2)) {
        break;
      }
    }
    
    return { title, description };
  }

  // Check current video (fallback for when immediate check fails)
  async function checkCurrentVideo() {
    if (isProcessing) return;
    isProcessing = true;

    // Reset blocked video flag at start of check
    isVideoBlocked = false;

    try {
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      const metadata = await findVideoElements();
      
      if (!metadata.title && !metadata.description) {
        // Not a video page or content not loaded yet
        isProcessing = false;
        return;
      }

      console.log('Fallback check - Video title:', metadata.title);

      // Check content
      const result = await checkContentWithAI(metadata.title, metadata.description);

      if (!result.allowed) {
        blockVideo('Content not in allowed topics', result.topic, result.confidence);
      } else {
        console.log('Video allowed:', result.topic, `(${Math.round(result.confidence * 100)}% confidence)`);
      }
    } catch (error) {
      console.error('Error checking video:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Listen for messages from background script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'SHOW_SETUP_OVERLAY') {
      showSetupOverlay();
    }
  });

  // Helper function to check if we're on YouTube home page
  function isYouTubeHomePage() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isYouTube = hostname === 'www.youtube.com' || hostname === 'youtube.com';
    const isHomePage = pathname === '/' || pathname === '' || pathname === '/index.html';
    
    console.log('RemoveTube URL Check:', { hostname, pathname, isYouTube, isHomePage });
    return isYouTube && isHomePage;
  }

  // Initialize with retry logic
  async function init() {
    console.log('RemoveTube initializing...');
    try {
      const isSetupComplete = await loadSettings();
      
      console.log('RemoveTube settings loaded:', { 
        allowedTopics: allowedTopics.length, 
        sessionBased: true 
      });
      
      // Show setup overlay on YouTube home page if no session topics
      // (This will happen every time user visits YouTube since session storage is cleared)
      if (isYouTubeHomePage() && allowedTopics.length === 0) {
        console.log('Showing setup overlay on YouTube home page - No session topics found');
        // Add a small delay to ensure page is ready
        setTimeout(() => {
          showSetupOverlay();
        }, 500);
        return;
      }

    if (allowedTopics.length === 0) {
      console.log('No allowed topics set, RemoveTube inactive');
      return;
    }

    // Check if we're on a video page immediately
    if (window.location.pathname.includes('/watch')) {
      checkVideoBeforeLoad(window.location.href);
    }

    // Monitor for navigation changes (YouTube SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        
        // Show setup if navigating to home page (session-based, so always needed)
        if (isYouTubeHomePage()) {
          try {
            chrome.runtime.sendMessage({
              action: 'getSessionStorage',
              keys: ['sessionTopics']
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn('RemoveTube: Session storage error during navigation:', chrome.runtime.lastError.message);
                return;
              }

              if (!response || !response.success) {
                console.warn('RemoveTube: Failed to get session storage during navigation:', response?.error);
                return;
              }

              const topics = response.data.sessionTopics || [];
              if (topics.length === 0) {
                console.log('Navigation to home page detected, showing setup overlay (session-based)');
                setTimeout(() => showSetupOverlay(), 1000);
              }
            });
          } catch (error) {
            console.warn('RemoveTube: Error accessing session storage during navigation:', error);
          }
        }
        
        // Check videos immediately when navigating to watch page
        if (url.includes('/watch')) {
          checkVideoBeforeLoad(url);
        }
      }
    }).observe(document, { subtree: true, childList: true });

    // Also intercept clicks on video links for even faster checking
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href*="/watch"]');
      if (link && allowedTopics.length > 0) {
        const href = link.getAttribute('href');
        if (href && href.includes('/watch')) {
          // Small delay to allow navigation to start
          setTimeout(() => {
            if (window.location.href.includes('/watch')) {
              checkVideoBeforeLoad(window.location.href);
            }
          }, 100);
        }
      }
    }, true);

    // Intercept history navigation (back/forward buttons)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (window.location.href.includes('/watch') && allowedTopics.length > 0) {
          checkVideoBeforeLoad(window.location.href);
        }
      }, 100);
    });

    // Override pushState and replaceState for SPA navigation detection
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => {
        if (window.location.href.includes('/watch') && allowedTopics.length > 0) {
          checkVideoBeforeLoad(window.location.href);
        }
      }, 50);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => {
        if (window.location.href.includes('/watch') && allowedTopics.length > 0) {
          checkVideoBeforeLoad(window.location.href);
        }
      }, 50);
    };
    } catch (error) {
      console.error('RemoveTube: Error during initialization:', error);
      // Fall back to basic functionality without extension features
      console.log('RemoveTube: Running in fallback mode due to initialization error');
    }
  }

  // Initialize with multiple retry attempts
  function initWithRetry() {
    let attempts = 0;
    const maxAttempts = 20; // More attempts since YouTube is complex
    
    function tryInit() {
      attempts++;
      console.log(`RemoveTube init attempt ${attempts}/${maxAttempts}`);
      
      // Check if DOM is ready enough for our operations
      if (document.body && document.head) {
        console.log('DOM ready, running RemoveTube init');
        init().catch(error => {
          console.error('RemoveTube init failed:', error);
        });
      } else if (attempts < maxAttempts) {
        console.log('DOM not ready, retrying in 100ms...');
        setTimeout(tryInit, 100);
      } else {
        console.warn('RemoveTube init failed after maximum attempts');
      }
    }
    
    tryInit();
  }

  // Add global function for manual testing
  window.forceRemoveTubeSetup = function() {
    console.log('Forcing RemoveTube setup...');
    showSetupOverlay();
  };

  // Add function to reset setup wizard (helpful for debugging)
  window.resetRemoveTubeSetup = function() {
    console.log('Resetting RemoveTube session setup...');
    try {
      chrome.runtime.sendMessage({ action: 'clearSessionStorage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing session storage:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('RemoveTube session cleared - setup will appear on next YouTube visit');
        }
        // Remove any existing overlay
        const existingOverlay = document.getElementById('removetube-setup-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
          document.body.classList.remove('removetube-overlay-active');
        }
        // Show setup immediately if on home page
        if (isYouTubeHomePage()) {
          setTimeout(() => showSetupOverlay(), 500);
        }
      });
    } catch (error) {
      console.error('Error accessing storage for reset:', error);
    }
  };

  // Add debug function to check current state
  window.debugRemoveTube = function() {
    console.log('=== RemoveTube Debug Info ===');
    console.log('Current URL:', window.location.href);
    console.log('Is YouTube Home Page:', isYouTubeHomePage());
    console.log('Setup overlay exists:', !!document.getElementById('removetube-setup-overlay'));
    console.log('Extension context available:', !!(chrome && chrome.storage));
    console.log('Current settings:', { allowedTopics, strictMode });
    
    // Check session storage
    try {
      chrome.runtime.sendMessage({ action: 'getSessionStorage', keys: null }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Session storage error:', chrome.runtime.lastError.message);
        } else if (response && response.success) {
          const sessionData = response.data || {};
          console.log('📱 Session storage data:', sessionData);
          console.log('📱 Session topics:', sessionData.sessionTopics || []);
          console.log('📱 Session strict mode:', sessionData.sessionStrictMode !== false);
        }
        
        // Also check persistent storage for comparison
        chrome.storage.sync.get(null, (data) => {
          if (chrome.runtime.lastError) {
            console.log('Persistent storage error:', chrome.runtime.lastError.message);
            return;
          }
          console.log('💾 Persistent storage data:', data);
          console.log('💾 Extension enabled:', data.extensionEnabled !== false);
          
          // Check override count if it exists
          if (data.overrideCount !== undefined) {
            console.log('🚨 Manual override count:', data.overrideCount);
          } else {
            console.log('📊 No manual overrides recorded yet');
          }
          
          console.log('✅ Session-based setup: Topics are stored per YouTube session only');
          console.log('✅ Setup wizard will appear every time you visit YouTube');
        });
      });
    } catch (error) {
      console.log('Error accessing storage:', error);
    }
  };

  // Add function to clear session storage for testing
  window.clearRemoveTubeStorage = function() {
    try {
      chrome.runtime.sendMessage({ action: 'clearSessionStorage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error clearing session storage:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('RemoveTube session storage cleared - setup will appear on next page load');
        }
        // Show setup immediately if on home page
        if (isYouTubeHomePage()) {
          setTimeout(() => showSetupOverlay(), 500);
        }
      });
    } catch (error) {
      console.log('Error accessing session storage for clear:', error);
    }
  };

  // Add function to check override statistics and test manual override
  window.debugRemoveTubeOverrides = function() {
    console.log('=== RemoveTube Manual Override Debug ===');
    
    try {
      chrome.storage.local.get(['overrideCount'], (result) => {
        if (chrome.runtime.lastError) {
          console.log('Storage error:', chrome.runtime.lastError.message);
          return;
        }
        
        const count = result.overrideCount || 0;
        console.log('📊 Total manual overrides used:', count);
        
        if (count > 0) {
          console.log('💡 Users have used the "Watch Anyway" feature', count, 'times');
          console.log('💡 This suggests either false positives in detection or legitimate override needs');
        } else {
          console.log('✅ No manual overrides recorded - filtering is working well or not being used');
        }
        
        // Check if we're currently on a blocked video page
        const blockedContent = document.body.innerHTML.includes('Content Blocked');
        if (blockedContent) {
          console.log('🚫 Currently viewing blocked content');
          console.log('🔄 To test manual override: click the "Watch Anyway" button');
          const watchAnywayBtn = document.getElementById('watch-anyway-btn');
          if (watchAnywayBtn) {
            console.log('✅ "Watch Anyway" button found and ready');
          } else {
            console.log('❌ "Watch Anyway" button not found - this might be an error');
          }
        } else {
          console.log('🎬 Not currently on a blocked video page');
          console.log('💡 To test manual override: navigate to a video outside your allowed topics');
        }
      });
    } catch (error) {
      console.log('Error accessing storage:', error);
    }
  };

  // Add function to test navigation (for debugging)
  window.testRemoveTubeNavigation = function() {
    console.log('Testing RemoveTube navigation...');
    console.log('Current URL:', window.location.href);
    console.log('History length:', window.history.length);
    
    try {
      console.log('Testing history.back()...');
      window.history.back();
      
      setTimeout(() => {
        console.log('After history.back() - URL:', window.location.href);
        if (window.location.href.includes('/watch')) {
          console.log('history.back() failed, testing location.assign...');
          window.location.assign('https://www.youtube.com/');
        }
      }, 1500);
    } catch (error) {
      console.error('Navigation test error:', error);
    }
  };

  // Multiple initialization triggers for reliability
  if (document.readyState === 'loading') {
    console.log('Document loading, waiting for DOMContentLoaded and using retry logic');
    document.addEventListener('DOMContentLoaded', initWithRetry);
    // Also try with retry in case DOMContentLoaded already fired
    setTimeout(initWithRetry, 100);
  } else {
    console.log('Document already loaded, initializing immediately');
    initWithRetry();
  }

  // Also try after a delay to catch cases where YouTube loads content dynamically
  setTimeout(() => {
    if (!document.getElementById('removetube-setup-overlay') && isYouTubeHomePage()) {
      console.log('Delayed check: trying to show setup overlay again');
      try {
        chrome.runtime.sendMessage({ action: 'getSessionStorage', keys: ['sessionTopics'] }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('RemoveTube: Session storage error in delayed check:', chrome.runtime.lastError.message);
            return;
          }
          if (response && response.success) {
            const sessionData = response.data || {};
            const topics = sessionData.sessionTopics || [];
            if (topics.length === 0) {
              console.log('Delayed check: showing setup overlay (session-based)');
              showSetupOverlay();
            }
          }
        });
      } catch (error) {
        console.warn('RemoveTube: Error accessing session storage in delayed check:', error);
      }
    }
  }, 2000);

  // Clean up session storage when leaving YouTube
  window.addEventListener('beforeunload', () => {
    console.log('RemoveTube: User leaving YouTube, clearing session storage');
    try {
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'clearSessionStorage' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('RemoveTube: Error clearing session storage:', chrome.runtime.lastError.message);
          } else if (response && response.success) {
            console.log('RemoveTube: Session storage cleared');
          }
        });
      }
    } catch (error) {
      console.warn('RemoveTube: Error accessing session storage for cleanup:', error);
    }
  });

  // Also clean up when navigating away from YouTube domain
  let lastHostname = window.location.hostname;
  new MutationObserver(() => {
    const currentHostname = window.location.hostname;
    if (currentHostname !== lastHostname) {
      lastHostname = currentHostname;
      if (currentHostname !== 'www.youtube.com' && currentHostname !== 'youtube.com') {
        console.log('RemoveTube: Navigating away from YouTube, clearing session storage');
        try {
          if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'clearSessionStorage' }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn('RemoveTube: Error clearing session storage on navigation:', chrome.runtime.lastError.message);
              } else if (response && response.success) {
                console.log('RemoveTube: Session storage cleared on navigation');
              }
            });
          }
        } catch (error) {
          console.warn('RemoveTube: Error accessing session storage for navigation cleanup:', error);
        }
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
