/**
 * Toggle / open the on-page side panel when the extension icon is clicked.
 */

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;

  if (!/welcometothejungle\.com/i.test(tab.url)) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js", "panel.js"],
      });
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" });
    } catch {
      // Not a supported page or injection blocked
    }
  }
});
