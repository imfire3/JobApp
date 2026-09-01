let serverUrl = 'http://localhost:3000';

function chromeStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const storage = chromeStorage();
    if (storage) {
      const settings = await storage.get(['serverUrl']);
      if (settings.serverUrl) {
        serverUrl = settings.serverUrl;
        document.getElementById('serverUrl').value = serverUrl;
      }
    }
  } catch {
    // Missing or blocked extension APIs — keep the default localhost URL.
  }

  checkServerStatus();

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });

  document.getElementById('jobForm').addEventListener('submit', handleJobSubmit);
  document.getElementById('extractBtn').addEventListener('click', extractFromPage);
  document.getElementById('extractPageBtn').addEventListener('click', extractFromPage);
  document.getElementById('importWTTJBtn').addEventListener('click', importWTTJJobs);
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
    const response = await fetch(`${serverUrl}/api/health`, {
      signal: AbortSignal.timeout(4000),
    });
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
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      showMessage('Ouvrez le popup depuis l\'extension Chrome', 'error');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showMessage('Aucun onglet actif', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractJobInfo' }, (response) => {
      if (chrome.runtime.lastError) {
        showMessage('Impossible d\'extraire les données de cette page', 'error');
        return;
      }

      if (response && response.data) {
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
  } catch {
    showMessage('Impossible d\'extraire les données de cette page', 'error');
  }
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
  const storage = chromeStorage();
  if (storage) {
    await storage.set({ serverUrl: newServerUrl });
  }
  serverUrl = newServerUrl;
  showMessage('Paramètres enregistrés', 'success');
  checkServerStatus();
}

function openApp() {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: serverUrl });
    return;
  }
  window.open(serverUrl, '_blank');
}

async function getCurrentPageUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab && tab.url ? tab.url : null;
    }
  } catch {
    return null;
  }
  return null;
}

function showMessage(text, type) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `message ${type} show`;
  
  setTimeout(() => {
    message.classList.remove('show');
  }, 3000);
}
