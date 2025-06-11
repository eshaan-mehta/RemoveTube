// Options page script for RemoveTube extension
document.addEventListener('DOMContentLoaded', () => {
  const allowedTopicsInput = document.getElementById('allowedTopics');
  const strictModeCheckbox = document.getElementById('strictMode');
  const enableExtensionCheckbox = document.getElementById('enableExtension');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const testBtn = document.getElementById('testBtn');
  const statusMessage = document.getElementById('statusMessage');
  const currentTopics = document.getElementById('currentTopics');
  const topicTags = document.getElementById('topicTags');
  
  // Stats elements
  const todayBlocked = document.getElementById('todayBlocked');
  const todayAllowed = document.getElementById('todayAllowed');
  const totalBlocked = document.getElementById('totalBlocked');
  const streakDays = document.getElementById('streakDays');

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get([
      'allowedTopics', 
      'strictMode',
      'extensionEnabled',
      'dailyStats',
      'totalStats',
      'streak'
    ], (data) => {
      const topics = data.allowedTopics || [];
      allowedTopicsInput.value = topics.join(', ');
      updateTopicDisplay(topics);
      
      strictModeCheckbox.checked = data.strictMode !== false;
      enableExtensionCheckbox.checked = data.extensionEnabled !== false;
      
      // Update stats
      const daily = data.dailyStats || { blocked: 0, allowed: 0, date: new Date().toDateString() };
      const total = data.totalStats || { blocked: 0, allowed: 0 };
      const streak = data.streak || 0;
      
      todayBlocked.textContent = daily.blocked;
      todayAllowed.textContent = daily.allowed;
      totalBlocked.textContent = total.blocked;
      streakDays.textContent = streak;
    });
  }

  // Update topic display
  function updateTopicDisplay(topics) {
    if (topics.length > 0) {
      topicTags.innerHTML = topics.map(topic => 
        `<span class="topic-tag">${topic.trim()}</span>`
      ).join('');
      currentTopics.style.display = 'block';
    } else {
      currentTopics.style.display = 'none';
    }
  }

  // Show status message
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }

  // Save settings
  saveBtn.addEventListener('click', () => {
    const topicsText = allowedTopicsInput.value.trim();
    const topics = topicsText
      .split(/[,\n]/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);
    
    const settings = {
      allowedTopics: topics,
      strictMode: strictModeCheckbox.checked,
      extensionEnabled: enableExtensionCheckbox.checked,
      isSetupComplete: true
    };

    chrome.runtime.sendMessage({ action: 'saveSettings', data: settings }, async (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        showStatus('Error saving settings. Please try again.', true);
        return;
      }
      updateTopicDisplay(topics);
      
      // Setup topics on the AI server
      try {
        showStatus('🧠 Setting up AI server...');
        await window.aiClassifier.setupTopics(topics);
        showStatus('✅ Settings saved and AI server configured!');
      } catch (serverError) {
        console.warn('Server setup failed:', serverError);
        showStatus('⚠️ Settings saved but server setup failed. Extension will use fallback mode.');
      }
    });
  });

  // Reset all settings
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings? This will also clear your statistics.')) {
      chrome.storage.sync.clear(() => {
        chrome.storage.sync.set({
          isSetupComplete: false,
          extensionEnabled: true,
          strictMode: true,
          allowedTopics: [],
          dailyStats: { blocked: 0, allowed: 0, date: new Date().toDateString() },
          totalStats: { blocked: 0, allowed: 0 },
          streak: 0
        }, () => {
          loadSettings();
          showStatus('🗑️ All settings reset!');
        });
      });
    }
  });

  // Test filtering
  testBtn.addEventListener('click', () => {
    const topics = allowedTopicsInput.value
      .split(/[,\n]/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);
    
    if (topics.length === 0) {
      showStatus('Please add some allowed topics first!', true);
      return;
    }

    // Example test cases
    const testCases = [
      { title: "Learn JavaScript in 30 Minutes", desc: "Complete beginner tutorial for JavaScript programming" },
      { title: "Top 10 Funny Cat Videos", desc: "Hilarious compilation of cats doing silly things" },
      { title: "How to Cook Perfect Pasta", desc: "Step by step cooking tutorial for pasta dishes" },
      { title: "Breaking News Update", desc: "Latest news and current events from around the world" }
    ];

    let results = [];
    testCases.forEach(test => {
      const content = `${test.title} ${test.desc}`.toLowerCase();
      let matched = false;
      let matchedTopic = '';
      
      for (const topic of topics) {
        if (content.includes(topic.toLowerCase())) {
          matched = true;
          matchedTopic = topic;
          break;
        }
      }
      
      results.push(`${matched ? '✅' : '❌'} "${test.title}" ${matched ? `(matches: ${matchedTopic})` : '(no match)'}`);
    });

    showStatus(`Test Results:\n${results.join('\n')}`);
  });

  // Preset topic buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topics = btn.dataset.topics;
      const currentTopics = allowedTopicsInput.value.trim();
      
      if (currentTopics) {
        allowedTopicsInput.value = currentTopics + ', ' + topics;
      } else {
        allowedTopicsInput.value = topics;
      }
      
      // Visual feedback
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 200);
    });
  });

  // Check server status
  async function checkServerStatus() {
    const statusElement = document.getElementById('serverStatusText');
    const statusContainer = document.getElementById('serverStatus');
    
    if (!statusElement || !statusContainer) return;
    
    try {
      const response = await fetch('http://localhost:8001/health');
      if (response.ok) {
        const health = await response.json();
        if (health.status === 'healthy') {
          statusElement.textContent = '✅ Online and Ready';
          statusContainer.style.backgroundColor = '#e8f5e8';
          statusContainer.style.color = '#2e7d32';
        } else {
          statusElement.textContent = '⚠️ Server Issues';
          statusContainer.style.backgroundColor = '#fff3e0';
          statusContainer.style.color = '#f57c00';
        }
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      statusElement.textContent = '❌ Offline (Extension will use fallback)';
      statusContainer.style.backgroundColor = '#ffebee';
      statusContainer.style.color = '#c62828';
    }
  }

  // Auto-update topic display as user types
  allowedTopicsInput.addEventListener('input', () => {
    const topics = allowedTopicsInput.value
      .split(/[,\n]/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);
    updateTopicDisplay(topics);
  });

  // Load initial settings
  loadSettings();
  
  // Check server status on page load
  checkServerStatus();
  
  // Recheck server status every 30 seconds
  setInterval(checkServerStatus, 30000);
});
