/**
 * Toggle / open the on-page side panel when the extension icon is clicked.
 * Also relays debug logs from content/panel scripts (CSP-safe).
 */

function isSupportedJobHost(url) {
  return /welcometothejungle\.com/i.test(url) || /indeed\.com/i.test(url);
}

// #region agent log
function debugLog(payload) {
  fetch("http://127.0.0.1:7429/ingest/b889d056-e3b9-407b-aa47-98348f117b99", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e47afc",
    },
    body: JSON.stringify({
      sessionId: "e47afc",
      runId: "ext-post",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "JT_DEBUG_LOG") {
    debugLog({
      hypothesisId: message.hypothesisId || "?",
      location: message.location || "extension",
      message: message.message || "debug",
      data: {
        ...(message.data || {}),
        tabUrl: sender?.tab?.url?.slice(0, 180) || null,
      },
    });
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
// #endregion

async function openPanelOnTab(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, { type: "OPEN_PANEL" });
  if (!response || response.ok !== true) {
    throw new Error("OPEN_PANEL did not confirm");
  }
  return response;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;

  // #region agent log
  debugLog({
    hypothesisId: "A",
    location: "background.js:onClicked",
    message: "extension icon clicked",
    data: {
      supported: isSupportedJobHost(tab.url),
      url: tab.url.slice(0, 180),
    },
  });
  // #endregion

  if (!isSupportedJobHost(tab.url)) {
    return;
  }

  try {
    const toggle = await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
    if (!toggle || toggle.ok !== true) {
      throw new Error("TOGGLE_PANEL did not confirm");
    }
    // #region agent log
    debugLog({
      hypothesisId: "A",
      location: "background.js:toggle-ok",
      message: "TOGGLE_PANEL succeeded",
      data: { tabId: tab.id, open: toggle.open ?? null },
    });
    // #endregion
  } catch (firstError) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js", "panel.js"],
      });
      const opened = await openPanelOnTab(tab.id);
      // #region agent log
      debugLog({
        hypothesisId: "B",
        location: "background.js:inject-ok",
        message: "injected scripts then OPEN_PANEL",
        data: {
          tabId: tab.id,
          open: opened.open ?? null,
          firstError:
            firstError instanceof Error ? firstError.message : String(firstError),
        },
      });
      // #endregion
    } catch (secondError) {
      // #region agent log
      debugLog({
        hypothesisId: "B",
        location: "background.js:inject-fail",
        message: "injection/open failed",
        data: {
          tabId: tab.id,
          firstError:
            firstError instanceof Error ? firstError.message : String(firstError),
          secondError:
            secondError instanceof Error
              ? secondError.message
              : String(secondError),
        },
      });
      // #endregion
    }
  }
});
