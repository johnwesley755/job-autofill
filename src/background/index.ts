/**
 * AutoApply Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AutoApply] Extension installed or updated:', details.reason);
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

  // Relay dynamic form mutation notices from content script to active sidepanel / popups
  if (message.type === 'DYNAMIC_FORM_CHANGED') {
    // Broadcast to any active extension views (sidepanel/popup)
    chrome.runtime.sendMessage({
      type: 'TAB_FORM_MUTATED',
      tabId: sender.tab?.id,
      url: sender.tab?.url,
    }).catch(() => {
      // Suppress error if no extension views are actively listening
    });
    sendResponse({ received: true });
    return true;
  }

  return false;
});
