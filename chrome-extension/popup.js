let serverUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.local.get(['serverUrl']);
  if (settings.serverUrl) {
    serverUrl = settings.serverUrl;
    document.getElementById('serverUrl').value = serverUrl;
  }
  
  // Check server status
  checkServerStatus();
  
  // Setup tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });
  
  // Form submission
  document.getElementById('jobForm').addEventListener('submit', handleJobSubmit);
  
  // Extract buttons
  document.getElementById('extractBtn').addEventListener('click', extractFromPage);
  document.getElementById('extractPageBtn').addEventListener('click', extractFromPage);
  document.getElementById('importWTTJBtn').addEventListener('click', importWTTJJobs);
  
  // Settings
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('openApp').addEventListener('click', openApp);
});

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

async function checkServerStatus() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  try {
    const response = await fetch(`${serverUrl}/api/health`);
    if (response.ok) {
      statusDot.classList.add('online');
      statusText.textContent = 'Serveur en ligne';
    } else {
      statusDot.classList.remove('online');
      statusText.textContent = 'Serveur hors ligne';
    }
  } catch (error) {
    statusDot.classList.remove('online');
    statusText.textContent = 'Impossible de se connecter';
  }
}

async function handleJobSubmit(e) {
  e.preventDefault();
  
  const jobData = {
    title: document.getElementById('title').value,
    company: document.getElementById('company').value,
    location: document.getElementById('location').value,
    description: document.getElementById('description').value,
    source: 'chrome-extension',
    url: await getCurrentPageUrl()
  };
  
  try {
    const response = await fetch(`${serverUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData)
    });
    
    if (response.ok) {
      const result = await response.json();
      showMessage('Offre publiée avec succès!', 'success');
      document.getElementById('jobForm').reset();
    } else {
      showMessage('Erreur lors de la publication', 'error');
    }
  } catch (error) {
    showMessage('Erreur de connexion au serveur', 'error');
  }
}

async function extractFromPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'extractJobInfo' }, (response) => {
    if (chrome.runtime.lastError) {
      showMessage('Impossible d\'extraire les données de cette page', 'error');
      return;
    }
    
    if (response && response.data) {
      // Fill form with extracted data
      const data = response.data;
      document.getElementById('title').value = data.title || '';
      document.getElementById('company').value = data.company || '';
      document.getElementById('location').value = data.location || '';
      document.getElementById('description').value = data.description || '';
      
      switchTab('post');
      showMessage('Données extraites! Vérifiez et publiez.', 'success');
    } else {
      showMessage('Aucune donnée trouvée sur cette page', 'error');
    }
  });
}

async function importWTTJJobs() {
  try {
    const response = await fetch(`${serverUrl}/api/import/wttj/mock`, {
      method: 'POST'
    });
    
    if (response.ok) {
      const result = await response.json();
      showMessage(`${result.imported} jobs importés (${result.duplicates} doublons ignorés)`, 'success');
    } else {
      showMessage('Erreur lors de l\'importation', 'error');
    }
  } catch (error) {
    showMessage('Erreur de connexion au serveur', 'error');
  }
}

async function saveSettings() {
  const newServerUrl = document.getElementById('serverUrl').value;
  await chrome.storage.local.set({ serverUrl: newServerUrl });
  serverUrl = newServerUrl;
  showMessage('Paramètres enregistrés', 'success');
  checkServerStatus();
}

function openApp() {
  chrome.tabs.create({ url: serverUrl });
}

async function getCurrentPageUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.url;
}

function showMessage(text, type) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `message ${type} show`;
  
  setTimeout(() => {
    message.classList.remove('show');
  }, 3000);
}
