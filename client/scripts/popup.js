// Popup script for RemoveTube extension
document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const toggleBtn = document.getElementById('toggleBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const topicsList = document.getElementById('topicsList');
  const blockedCount = document.getElementById('blockedCount');
  const allowedCount = document.getElementById('allowedCount');

  // Load current settings and stats
  function loadData() {
    chrome.storage.sync.get([
      'allowedTopics', 
      'isSetupComplete', 
      'extensionEnabled', 
      'dailyStats'
    ], async (data) => {
      const topics = data.allowedTopics || [];
      const isSetup = data.isSetupComplete || false;
      const isEnabled = data.extensionEnabled !== false; // default to true
      const stats = data.dailyStats || { blocked: 0, allowed: 0, date: new Date().toDateString() };

      // Check server status
      let serverStatus = 'Unknown';
      try {
        const response = await fetch('http://localhost:8080/health');
        if (response.ok) {
          const health = await response.json();
          serverStatus = health.status === 'healthy' ? '✅ Online' : '⚠️ Issues';
        } else {
          serverStatus = '❌ Offline';
        }
      } catch (error) {
        serverStatus = '❌ Offline';
      }

      // Update status
      if (!isSetup) {
        statusDiv.textContent = '⚙️ Setup Required';
        statusDiv.className = 'status inactive';
        toggleBtn.textContent = 'Setup';
      } else if (!isEnabled) {
        statusDiv.textContent = '⏸️ Paused';
        statusDiv.className = 'status inactive';
        toggleBtn.textContent = 'Enable';
      } else if (topics.length === 0) {
        statusDiv.textContent = '⚠️ No Topics Set';
        statusDiv.className = 'status inactive';
        toggleBtn.textContent = 'Setup';
      } else {
        statusDiv.textContent = `✅ Active & Protecting (Server: ${serverStatus})`;
        statusDiv.className = 'status active';
        toggleBtn.textContent = 'Disable';
      }

      // Update topics list
      if (topics.length > 0) {
        topicsList.textContent = topics.join(', ');
      } else {
        topicsList.textContent = 'No topics set';
      }

      // Update stats (reset if new day)
      const today = new Date().toDateString();
      if (stats.date !== today) {
        stats.blocked = 0;
        stats.allowed = 0;
        stats.date = today;
        chrome.storage.sync.set({ dailyStats: stats });
      }

      blockedCount.textContent = stats.blocked;
      allowedCount.textContent = stats.allowed;
    });
  }

  // Toggle extension
  toggleBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['isSetupComplete', 'extensionEnabled'], (data) => {
      if (!data.isSetupComplete) {
        // Open options page for setup
        chrome.runtime.openOptionsPage();
      } else {
        // Toggle enabled state
        const newState = !data.extensionEnabled;
        chrome.storage.sync.set({ extensionEnabled: newState }, () => {
          loadData();
        });
      }
    });
  });

  // Open settings
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Load initial data
  loadData();

  // Refresh data every few seconds while popup is open
  const refreshInterval = setInterval(loadData, 3000);
  
  // Cleanup interval when popup closes
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });
});
