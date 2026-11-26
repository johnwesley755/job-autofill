/**
 * AutoApply Background Service Worker (Manifest V3)
 * Handles external active application tab tracking and message relaying.
 */

import { GetActiveApplicationTabResponse } from '../messaging/protocol';

let lastActiveExternalTabId: number | null = null;

function isExtensionOrBrowserInternalUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://')
  );
}

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url && !isExtensionOrBrowserInternalUrl(tab.url)) {
      lastActiveExternalTabId = tab.id ?? null;
    }
  } catch (err) {
    // Ignore invalid tab queries
  }
});

// Track URL updates on tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !isExtensionOrBrowserInternalUrl(changeInfo.url)) {
    if (tab.active) {
      lastActiveExternalTabId = tabId;
    }
  }
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (lastActiveExternalTabId === tabId) {
    lastActiveExternalTabId = null;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoApply] Extension installed or updated');
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

  // Request tracked external application tab for Form Assistant
  if (message.type === 'GET_ACTIVE_APPLICATION_TAB') {
    (async () => {
      // 1. Verify if last tracked tab is still open and valid
      if (lastActiveExternalTabId !== null) {
        try {
          const tab = await chrome.tabs.get(lastActiveExternalTabId);
          if (tab && tab.url && !isExtensionOrBrowserInternalUrl(tab.url)) {
            const resp: GetActiveApplicationTabResponse = {
              tabId: tab.id ?? null,
              url: tab.url,
              title: tab.title ?? null,
              isSupportedDomain: true,
            };
            sendResponse(resp);
            return;
          }
        } catch {
          lastActiveExternalTabId = null;
        }
      }

      // 2. Fallback: Query all non-extension tabs in current or other windows
      const allTabs = await chrome.tabs.query({});
      const externalTabs = allTabs.filter((t) => t.url && !isExtensionOrBrowserInternalUrl(t.url));

      // Prefer currently active tab in another window if exists, or most recent
      const candidateTab = externalTabs.find((t) => t.active) || externalTabs[0];

      if (candidateTab && candidateTab.id && candidateTab.url) {
        lastActiveExternalTabId = candidateTab.id;

        const resp: GetActiveApplicationTabResponse = {
          tabId: candidateTab.id,
          url: candidateTab.url,
          title: candidateTab.title ?? null,
          isSupportedDomain: true,
        };
        sendResponse(resp);
      } else {
        const resp: GetActiveApplicationTabResponse = {
          tabId: null,
          url: null,
          title: null,
          isSupportedDomain: false,
        };
        sendResponse(resp);
      }
    })();
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
