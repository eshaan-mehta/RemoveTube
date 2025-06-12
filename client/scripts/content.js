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
        chrome.storage.sync.get(['allowedTopics', 'strictMode', 'isSetupComplete'], (data) => {
          if (chrome.runtime.lastError) {
            console.warn('RemoveTube: Error loading settings:', chrome.runtime.lastError.message);
            allowedTopics = [];
            strictMode = true;
            resolve(false);
            return;
          }
          allowedTopics = data.allowedTopics || [];
          strictMode = data.strictMode !== false;
          resolve(data.isSetupComplete === true);
        });
      } catch (error) {
        console.warn('RemoveTube: Error loading settings:', error);
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

  async function createSetupOverlay() {
    console.log('Creating setup overlay from external HTML and CSS');

    // Load HTML
    const htmlResp = await fetch(chrome.runtime.getURL('pages/setup_overlay.html'));
    const overlayHtml = await htmlResp.text();

    // Remove any existing overlay
    const existing = document.getElementById('removetube-setup-overlay');
    if (existing) existing.remove();

    // Parse the HTML and set the ID on the root overlay div
    const temp = document.createElement('div');
    temp.innerHTML = overlayHtml;
    const overlayElem = temp.firstElementChild;
    overlayElem.id = 'removetube-setup-overlay';
    document.body.appendChild(overlayElem);
    document.body.classList.add('removetube-overlay-active');

    // Wait for DOM elements to be available before attaching event listeners
    setTimeout(() => {
      const saveButton = document.getElementById('removetube-save');
      if (saveButton) {
        saveButton.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Save button clicked');
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
            if (topics.length === 0) {
              alert('Please enter at least one allowed topic before continuing.');
              topicsInput.focus();
              saveButton.textContent = originalText;
              saveButton.disabled = false;
              return;
            }
            const strict = strictInput.checked;
            const sessionData = {
              sessionTopics: topics,
              sessionStrictMode: strict
            };
            console.log('Attempting to save session data:', sessionData);
            if (!chrome || !chrome.runtime) {
              throw new Error('Chrome extension context is not available');
            }
            chrome.storage.sync.set({
              allowedTopics: topics,
              strictMode: strict,
              isSetupComplete: true
            }, async () => {
              if (chrome.runtime.lastError) {
                console.error('RemoveTube: Error saving settings:', chrome.runtime.lastError.message);
                alert('Error saving settings: ' + chrome.runtime.lastError.message + '. Please try again.');
                saveButton.textContent = originalText;
                saveButton.disabled = false;
                return;
              }
              console.log('Settings saved successfully, setting up AI server...');
              try {
                saveButton.textContent = 'Setting up AI...';
                await window.aiClassifier.setupTopics(topics);
                console.log('AI server setup complete');
              } catch (serverError) {
                console.warn('Server setup failed, will use fallback:', serverError);
              }
              try {
                overlayElem.remove();
                document.body.classList.remove('removetube-overlay-active');
                allowedTopics = topics;
                strictMode = strict;
                if (window.location.pathname.includes('/watch')) {
                  setTimeout(() => checkCurrentVideo(), 1000);
                }
              } catch (cleanupError) {
                console.warn('Error during overlay cleanup:', cleanupError);
              }
              loadSettings().then((isComplete) => {
                console.log('RemoveTube setup complete! Settings reloaded:', isComplete);
              }).catch((error) => {
                console.error('RemoveTube: Error loading settings after setup:', error);
              });
            });
          } catch (error) {
            console.error('Error during save operation:', error);
            alert('Error saving settings: ' + error.message + '. Please try again.');
            saveButton.textContent = originalText;
            saveButton.disabled = false;
          }
        });
      } else {
        console.error('Save button not found!');
      }
    }, 100);
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

  // Helper to get video ID from URL
  function getVideoIdFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    } catch {
      return null;
    }
  }

  // Block video with explanation
  async function blockVideo(reason, topic, confidence) {
    // Get current video ID
    const videoId = getVideoIdFromUrl(window.location.href);
    if (videoId) {
      // Check for override
      const overrides = await new Promise(resolve => {
        chrome.storage.local.get(['watchAnywayOverrides'], result => {
          resolve(result.watchAnywayOverrides || []);
        });
      });
      if (overrides.includes(videoId)) {
        console.log('Watch Anyway override found for this video, skipping block.');
        return;
      }
    }
    isVideoBlocked = true;
    const originalTitle = document.title;
    const originalUrl = window.location.href;
    console.log('Blocking video:', { originalUrl, reason, topic, confidence });

    // Load block overlay HTML
    const htmlResp = await fetch(chrome.runtime.getURL('pages/block_overlay.html'));
    let overlayHtml = await htmlResp.text();
    overlayHtml = overlayHtml
      .replace('{{topic}}', topic || 'Unknown')
      .replace('{{confidence}}', Math.round((confidence || 0) * 100))
      .replace('{{allowedTopics}}', allowedTopics.join(', '));

    // Remove all body content and inject overlay
    document.body.innerHTML = overlayHtml;

    // Load CSS (add only once)
    if (!document.getElementById('removetube-block-css')) {
      const cssLink = document.createElement('link');
      cssLink.id = 'removetube-block-css';
      cssLink.rel = 'stylesheet';
      cssLink.type = 'text/css';
      cssLink.href = chrome.runtime.getURL('styles/block_overlay.css');
      document.head.appendChild(cssLink);
    }

    setTimeout(() => {
      const goBackBtn = document.getElementById('go-back-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const watchAnywayBtn = document.getElementById('watch-anyway-btn');
      const blockedVideoUrl = window.location.href;
      console.log('Video blocked at URL:', blockedVideoUrl);
      const checkForNavigation = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== blockedVideoUrl) {
          isVideoBlocked = false;
          clearInterval(navigationChecker);
          const blockingOverlay = document.querySelector('body');
          if (blockingOverlay && blockingOverlay.innerHTML.includes('Content Blocked')) {
            setTimeout(() => {
              location.reload();
            }, 50);
          }
        }
      };
      const navigationChecker = setInterval(checkForNavigation, 500);
      setTimeout(() => {
        clearInterval(navigationChecker);
      }, 10000);
      if (goBackBtn) {
        goBackBtn.addEventListener('click', (e) => {
          e.preventDefault();
          goBackBtn.textContent = '⏳ Going back...';
          goBackBtn.disabled = true;
          goBackBtn.style.background = '#999';
          clearInterval(navigationChecker);
          isVideoBlocked = false;
          const currentUrl = window.location.href;
          try {
            if (window.history.length > 1) {
              const handlePopState = () => {
                window.removeEventListener('popstate', handlePopState);
                setTimeout(() => {
                  if (document.body.innerHTML.includes('Content Blocked')) {
                    location.reload();
                  }
                }, 100);
              };
              window.addEventListener('popstate', handlePopState);
              setTimeout(() => {
                window.removeEventListener('popstate', handlePopState);
                if (window.location.href === currentUrl) {
                  window.location.assign('https://www.youtube.com/');
                } else if (document.body.innerHTML.includes('Content Blocked')) {
                  location.reload();
                }
              }, 1000);
              setTimeout(() => {
                if (document.body.innerHTML.includes('Content Blocked')) {
                  window.location.assign('https://www.youtube.com/');
                }
              }, 2000);
              window.history.back();
            }
            window.location.assign('https://www.youtube.com/');
          } catch (error) {
            window.location.assign('https://www.youtube.com/');
          }
        });
      }
      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          clearInterval(navigationChecker);
          try {
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ action: 'openOptions' }, (response) => {
                if (chrome.runtime.lastError) {
                  fallbackToDirectOptionsOpen();
                } else if (response && !response.success) {
                  fallbackToDirectOptionsOpen();
                }
              });
            } else {
              fallbackToDirectOptionsOpen();
            }
          } catch (error) {
            fallbackToDirectOptionsOpen();
          }
        });
      }
      if (watchAnywayBtn) {
        watchAnywayBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const confirmed = confirm(
            'Are you sure you want to watch this video?\n\n' +
            'This will override the content filter for this video only. The filter will continue to work for other videos.\n\n' +
            'Click OK to proceed or Cancel to go back.'
          );
          if (confirmed) {
            const videoId = getVideoIdFromUrl(originalUrl);
            if (videoId) {
              chrome.storage.local.get(['watchAnywayOverrides'], result => {
                const overrides = result.watchAnywayOverrides || [];
                if (!overrides.includes(videoId)) {
                  overrides.push(videoId);
                  chrome.storage.local.set({ watchAnywayOverrides: overrides });
                }
              });
            }
            watchAnywayBtn.textContent = '⏳ Loading video...';
            watchAnywayBtn.disabled = true;
            watchAnywayBtn.style.background = '#999';
            clearInterval(navigationChecker);
            isVideoBlocked = false;
            window.location.assign(originalUrl);
          }
        });
      }
      function fallbackToDirectOptionsOpen() {
        try {
          if (chrome && chrome.runtime && chrome.runtime.id) {
            const optionsUrl = chrome.runtime.getURL('options.html');
            window.open(optionsUrl, '_blank');
          } else {
            alert('Please open extension settings from the browser toolbar (click the RemoveTube icon).');
          }
        } catch (error) {
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
    isVideoBlocked = false;
    const timeoutDuration = 5000;
    let timeoutId;
    try {
      showLoadingOverlay();
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
      let metadata = await fetchVideoMetadata(videoId);
      if (!metadata.title && !metadata.description) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        metadata = await findVideoElements();
      }
      // Only proceed if at least one is non-empty
      if (!metadata.title && !metadata.description) {
        console.log('No video metadata found (title/description both empty), skipping classification request.');
        clearTimeout(timeoutId);
        hideLoadingOverlay();
        isProcessing = false;
        return;
      }
      console.log('Found video metadata:', metadata.title, metadata.description);
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
    for (let attempt = 0; attempt < 7; attempt++) { // more attempts
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
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
      // If we found at least one, break
      if (title || description) {
        break;
      }
    }
    return { title, description };
  }

  // Check current video (fallback for when immediate check fails)
  async function checkCurrentVideo() {
    if (isProcessing) return;
    isProcessing = true;
    isVideoBlocked = false;
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const metadata = await findVideoElements();
      // Only proceed if at least one is non-empty
      if (!metadata.title && !metadata.description) {
        console.log('No video metadata found (title/description both empty) in fallback, skipping classification request.');
        isProcessing = false;
        return;
      }
      console.log('Fallback check - Video title/desc:', metadata.title, metadata.description);
      const result = await checkContentWithAI(metadata.title, metadata.description);
      if (!result.allowed) {
        blockVideo('Content not in allowed topics', result.topic, result.confidence);
      } else {
        console.log('Video allowed:', result.topic, `(${Math.round(result.confidence * 100)}% confidence)`);
      }
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
      // Always check persistent storage for setup status
      const setupData = await new Promise(resolve => {
        chrome.storage.sync.get(['allowedTopics', 'strictMode', 'isSetupComplete'], resolve);
      });
      allowedTopics = setupData.allowedTopics || [];
      strictMode = setupData.strictMode !== false;
      const isSetupComplete = setupData.isSetupComplete === true;
      console.log('RemoveTube settings loaded:', { allowedTopics: allowedTopics.length, sessionBased: true, isSetupComplete });
      // Show setup overlay on YouTube home page only if setup is not complete
      if (isYouTubeHomePage() && !isSetupComplete) {
        console.log('Showing setup overlay on YouTube home page - Setup not complete');
        setTimeout(() => {
          showSetupOverlay();
        }, 500);
        return;
      }
      if (allowedTopics.length === 0) {
        console.log('No allowed topics set, RemoveTube inactive');
        return;
      }
      if (window.location.pathname.includes('/watch')) {
        checkVideoBeforeLoad(window.location.href);
      }
      // Monitor for navigation changes (YouTube SPA)
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          // Always check persistent storage for setup status on navigation
          chrome.storage.sync.get(['isSetupComplete'], (data) => {
            if (chrome.runtime.lastError) {
              console.warn('RemoveTube: Error loading isSetupComplete during navigation:', chrome.runtime.lastError.message);
              return;
            }
            if (isYouTubeHomePage() && !data.isSetupComplete) {
              console.log('Navigation to home page detected, showing setup overlay (setup not complete)');
              setTimeout(() => showSetupOverlay(), 1000);
            }
          });
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
    if (window.location.hostname === 'www.youtube.com' || window.location.hostname === 'youtube.com') {
      // Do nothing if still on YouTube
      return;
    }
    chrome.storage.sync.remove(['allowedTopics', 'strictMode', 'isSetupComplete']);
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
