/**
 * AutoApply Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AutoApply] Extension installed or updated:', details.reason);
  // Set default side panel behavior to open on action click if supported
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('[AutoApply] Failed to configure sidepanel behavior:', err);
    });
  }
});

// Relay messages between content scripts, popup, and sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return true;
  }

  if (message.type === 'OPEN_SIDEPANEL') {
    if (sender.tab?.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId }).then(() => {
        sendResponse({ success: true });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  }

  return false;
});
