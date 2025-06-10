// Background script for RemoveTube extension

chrome.runtime.onInstalled.addListener((details) => {
  console.log('RemoveTube extension installed/updated, reason:', details.reason);
  
  // Set default values if not already set, but preserve existing setup
  chrome.storage.sync.get(['allowedTopics', 'isSetupComplete'], (data) => {
    const defaults = {
      allowedTopics: data.allowedTopics || [],
      isSetupComplete: data.isSetupComplete || false,
      strictMode: data.strictMode !== undefined ? data.strictMode : true,
      extensionEnabled: data.extensionEnabled !== undefined ? data.extensionEnabled : true
    };
    
    // For new installs, ensure setup is marked as incomplete
    if (details.reason === 'install') {
      defaults.isSetupComplete = false;
      defaults.allowedTopics = [];
      console.log('New installation detected, forcing setup');
    }
    // For updates, check if setup state is consistent
    else if (details.reason === 'update') {
      // If we have topics but setup is marked incomplete, or vice versa, fix it
      if (data.allowedTopics && data.allowedTopics.length > 0 && !data.isSetupComplete) {
        defaults.isSetupComplete = true;
        console.log('Update detected: correcting setup status to complete');
      } else if ((!data.allowedTopics || data.allowedTopics.length === 0) && data.isSetupComplete) {
        defaults.isSetupComplete = false;
        console.log('Update detected: correcting setup status to incomplete');
      }
    }

    chrome.storage.sync.set(defaults, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting default values:', chrome.runtime.lastError.message);
      } else {
        console.log('Extension defaults set:', defaults);
      }
    });
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    try {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error opening options page:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  // Handle session storage operations
  else if (request.action === 'setSessionStorage') {
    console.log('Background: Setting session storage:', request.data);
    try {
      chrome.storage.session.set(request.data, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting session storage:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Session storage set successfully:', request.data);
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('Error accessing session storage:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  else if (request.action === 'getSessionStorage') {
    console.log('Background: Getting session storage for keys:', request.keys);
    try {
      chrome.storage.session.get(request.keys, (data) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting session storage:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Session storage retrieved:', data);
          sendResponse({ success: true, data: data });
        }
      });
    } catch (error) {
      console.error('Error accessing session storage:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  else if (request.action === 'clearSessionStorage') {
    console.log('Background: Clearing session storage');
    try {
      chrome.storage.session.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing session storage:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Session storage cleared successfully');
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('Error clearing session storage:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});
