// Background service worker for the extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('JobApp Extension installed!');
    // Set default server URL
    chrome.storage.local.set({ serverUrl: 'http://localhost:3000' });
  } else if (details.reason === 'update') {
    console.log('JobApp Extension updated!');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJob') {
    saveJobToServer(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

// Function to save job to server
async function saveJobToServer(jobData) {
  const settings = await chrome.storage.local.get(['serverUrl']);
  const serverUrl = settings.serverUrl || 'http://localhost:3000';
  
  const response = await fetch(`${serverUrl}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to save job');
  }
  
  return await response.json();
}

// Context menu integration (right-click menu)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToJobApp',
    title: 'Enregistrer dans JobApp',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveToJobApp') {
    // Send message to content script to extract job info
    chrome.tabs.sendMessage(tab.id, { action: 'extractJobInfo' }, (response) => {
      if (response && response.data) {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'JobApp',
          message: 'Informations extraites! Ouvrez l\'extension pour publier.'
        });
      }
    });
  }
});

// Badge to show number of jobs (optional feature)
async function updateBadge() {
  try {
    const settings = await chrome.storage.local.get(['serverUrl']);
    const serverUrl = settings.serverUrl || 'http://localhost:3000';
    
    const response = await fetch(`${serverUrl}/api/jobs`);
    if (response.ok) {
      const jobs = await response.json();
      const count = jobs.length.toString();
      chrome.action.setBadgeText({ text: count });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    }
  } catch (error) {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge every 5 minutes
chrome.alarms.create('updateBadge', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBadge') {
    updateBadge();
  }
});

// Update badge on startup
updateBadge();
