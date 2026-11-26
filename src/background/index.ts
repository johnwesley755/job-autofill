/**
 * AutoApply Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AutoApply] Extension installed or updated:', details.reason);
  // Default enable autofill state
  chrome.storage.local.get(['autoapply_enabled'], (res) => {
    if (res.autoapply_enabled === undefined) {
      chrome.storage.local.set({ autoapply_enabled: true });
    }
  });
});

async function openOrFocusDashboard() {
  const dashboardUrl = chrome.runtime.getURL('app.html');
  const tabs = await chrome.tabs.query({ url: dashboardUrl });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) {
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: dashboardUrl });
  }
}

// Relay messages between content scripts, popup, and dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return true;
  }

  // Open standalone dashboard tab from popup or elsewhere
  if (message.type === 'OPEN_DASHBOARD_TAB') {
    openOrFocusDashboard().then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // Relay dynamic form mutation notices from content script to active popup / dashboard
  if (message.type === 'DYNAMIC_FORM_CHANGED') {
    chrome.runtime.sendMessage({
      type: 'TAB_FORM_MUTATED',
      tabId: sender.tab?.id,
      url: sender.tab?.url,
    }).catch(() => {
      // Suppress error if view is not actively open
    });
    sendResponse({ received: true });
    return true;
  }

  return false;
});
