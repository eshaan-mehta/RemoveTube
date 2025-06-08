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
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});
