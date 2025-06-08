// Background script for RemoveTube extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('RemoveTube extension installed');
  
  // Set default values if not already set
  chrome.storage.sync.get(['allowedTopics', 'isSetupComplete'], (data) => {
    if (!data.isSetupComplete) {
      chrome.storage.sync.set({
        allowedTopics: [],
        isSetupComplete: false,
        strictMode: true,
        hfApiKey: '',
        extensionEnabled: true
      });
    }
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
