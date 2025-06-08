// Content script for RemoveTube extension
(function() {
  'use strict';

  let isProcessing = false;
  let allowedTopics = [];
  let hfApiKey = '';
  let strictMode = true;

  // Load settings
  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['allowedTopics', 'hfApiKey', 'strictMode', 'isSetupComplete'], (data) => {
        allowedTopics = data.allowedTopics || [];
        hfApiKey = data.hfApiKey || '';
        strictMode = data.strictMode !== false; // default to true
        resolve(data.isSetupComplete || false);
      });
    });
  }

  // Show setup overlay
  function showSetupOverlay() {
    if (document.getElementById('removetube-setup-overlay')) return;

    // Check if API key already exists
    chrome.storage.sync.get(['hfApiKey'], (data) => {
      const existingApiKey = data.hfApiKey || '';
      const hasApiKey = existingApiKey.length > 0;
      
      const overlay = document.createElement('div');
      overlay.id = 'removetube-setup-overlay';
      overlay.innerHTML = `
        <div class="removetube-overlay">
          <div class="removetube-modal">
            <h2>🎯 Welcome to RemoveTube!</h2>
            <p>Let's set up your allowed content to help you stay focused.</p>
            
            <div class="removetube-form">
              <div id="api-key-section" class="${hasApiKey ? 'collapsed' : ''}">
                <div class="api-key-header">
                  <label for="removetube-api-key">
                    Hugging Face API Key ${hasApiKey ? '(Saved)' : '(optional for enhanced filtering)'}:
                  </label>
                  ${hasApiKey ? '<button type="button" id="toggle-api-key" class="toggle-btn">Show/Edit Key</button>' : ''}
                </div>
                <div class="api-key-input ${hasApiKey ? 'hidden' : ''}">
                  <input type="text" id="removetube-api-key" placeholder="hf_..." value="${hasApiKey ? existingApiKey : ''}" />
                  <small>Get your free API key from <a href="https://huggingface.co/settings/tokens" target="_blank">Hugging Face</a></small>
                </div>
                ${hasApiKey ? '<div class="api-key-status">✅ API key is saved and will be used for enhanced filtering</div>' : ''}
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
          max-width: 600px;
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
        
        .removetube-form small a {
          color: #667eea;
          text-decoration: none;
        }
        
        .removetube-form small a:hover {
          text-decoration: underline;
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
        
        /* API Key Section Styles */
        .api-key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .toggle-btn {
          background: #f0f0f0 !important;
          color: #333 !important;
          padding: 6px 12px !important;
          font-size: 12px !important;
          border-radius: 6px !important;
          width: auto !important;
          margin: 0 !important;
          transition: background-color 0.2s ease !important;
        }
        
        .toggle-btn:hover {
          background: #e0e0e0 !important;
          transform: none !important;
          box-shadow: none !important;
        }
        
        .api-key-input.hidden {
          display: none;
        }
        
        .api-key-status {
          margin-top: 8px;
          padding: 8px 12px;
          background: #e8f5e8;
          color: #2e7d32;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid #c8e6c9;
        }
        
        #api-key-section.collapsed {
          margin-bottom: 10px;
        }
        
        /* Hide all page content behind overlay */
        body.removetube-overlay-active {
          overflow: hidden;
        }
        
        body.removetube-overlay-active > *:not(#removetube-setup-overlay) {
          display: none !important;
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      
      // Hide all page content behind the overlay
      document.body.classList.add('removetube-overlay-active');

      // Handle toggle API key button
      const toggleBtn = document.getElementById('toggle-api-key');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const apiKeyInput = document.querySelector('.api-key-input');
          const isHidden = apiKeyInput.classList.contains('hidden');
          
          if (isHidden) {
            apiKeyInput.classList.remove('hidden');
            toggleBtn.textContent = 'Hide Key';
          } else {
            apiKeyInput.classList.add('hidden');
            toggleBtn.textContent = 'Show/Edit Key';
          }
        });
      }

      // Handle save button
      document.getElementById('removetube-save').addEventListener('click', () => {
        const topics = document.getElementById('removetube-topics').value
          .split(',')
          .map(topic => topic.trim())
          .filter(topic => topic.length > 0);
        
        // Validate that at least one topic is provided
        if (topics.length === 0) {
          alert('Please enter at least one allowed topic before continuing.');
          document.getElementById('removetube-topics').focus();
          return;
        }
        
        const apiKey = document.getElementById('removetube-api-key').value.trim();
        const strict = document.getElementById('removetube-strict').checked;

        // Only save API key if it's provided or if we're updating an existing one
        const saveData = {
          allowedTopics: topics,
          strictMode: strict,
          isSetupComplete: true
        };

        // Save API key if provided or keep existing one
        if (apiKey) {
          saveData.hfApiKey = apiKey;
        } else if (hasApiKey) {
          saveData.hfApiKey = existingApiKey; // Keep existing key
        }

        chrome.storage.sync.set(saveData, () => {
          overlay.remove();
          style.remove();
          document.body.classList.remove('removetube-overlay-active');
          loadSettings().then(() => {
            console.log('RemoveTube setup complete!');
            // Start checking videos after setup
            if (window.location.pathname.includes('/watch')) {
              setTimeout(() => checkCurrentVideo(), 1000);
            }
          });
        });
      });
    });
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

  // Check content using Hugging Face API
  async function checkContentWithAI(title, description) {
    if (!hfApiKey || allowedTopics.length === 0) {
      return checkContentSimple(title, description);
    }

    try {
      const inputText = `${title}. ${description}`;
      const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: inputText,
          parameters: { candidate_labels: allowedTopics }
        })
      });

      if (!response.ok) {
        console.warn('AI classification failed, falling back to simple matching');
        return checkContentSimple(title, description);
      }

      const result = await response.json();
      const topLabel = result?.labels?.[0];
      const topScore = result?.scores?.[0];

      const threshold = strictMode ? 0.7 : 0.5;
      
      return {
        allowed: topScore >= threshold,
        topic: topLabel,
        confidence: topScore
      };
    } catch (error) {
      console.warn('AI classification error, falling back to simple matching:', error);
      return checkContentSimple(title, description);
    }
  }

  // Block video with explanation
  function blockVideo(reason, topic, confidence) {
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
          ">⚙️ Settings</button>
        </div>
      </div>
    `;

    // Add event listeners after the content is created
    setTimeout(() => {
      const goBackBtn = document.getElementById('go-back-btn');
      const settingsBtn = document.getElementById('settings-btn');

      if (goBackBtn) {
        goBackBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Go back button clicked');
          
          // Try multiple navigation methods
          try {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // If no history, go to YouTube home
              window.location.href = 'https://www.youtube.com/';
            }
          } catch (error) {
            console.error('Error navigating back:', error);
            // Ultimate fallback
            window.location.href = 'https://www.youtube.com/';
          }
        });
      }

      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Settings button clicked');
          
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

  // Initialize
  async function init() {
    await loadSettings();
    
    // Show setup overlay only on YouTube home page if setup not complete
    if (window.location.hostname === 'www.youtube.com' && 
        (window.location.pathname === '/' || window.location.pathname === '') && 
        allowedTopics.length === 0) {
      showSetupOverlay();
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
        
        // Show setup if navigating to home page and no topics set
        if ((url.includes('youtube.com/') && !url.includes('/watch') && !url.includes('/channel') && !url.includes('/playlist')) && 
            allowedTopics.length === 0) {
          setTimeout(() => showSetupOverlay(), 1000);
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
  }

  // Start when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
