// Options page script for RemoveTube extension
document.addEventListener('DOMContentLoaded', () => {
  const hfApiKeyInput = document.getElementById('hfApiKey');
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
      'hfApiKey',
      'allowedTopics', 
      'strictMode',
      'extensionEnabled',
      'dailyStats',
      'totalStats',
      'streak'
    ], (data) => {
      hfApiKeyInput.value = data.hfApiKey || '';
      
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
    const hfApiKey = hfApiKeyInput.value.trim();
    const topicsText = allowedTopicsInput.value.trim();
    const topics = topicsText
      .split(/[,\n]/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);
    
    const settings = {
      hfApiKey,
      allowedTopics: topics,
      strictMode: strictModeCheckbox.checked,
      extensionEnabled: enableExtensionCheckbox.checked,
      isSetupComplete: true
    };

    chrome.storage.sync.set(settings, () => {
      updateTopicDisplay(topics);
      showStatus('✅ Settings saved successfully!');
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
          hfApiKey: '',
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
});
