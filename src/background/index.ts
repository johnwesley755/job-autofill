/**
 * AutoApply Background Service Worker (Manifest V3)
 * Handles external active application tab tracking, dashboard launch, and message relaying.
 */

import { GetActiveApplicationTabResponse } from '../messaging/protocol';

// Supported hostnames or patterns for application forms
const SUPPORTED_HOST_PATTERNS = [
  'greenhouse.io',
  'lever.co',
  'myworkdayjobs.com',
  'ashbyhq.com',
  'docs.google.com',
  'forms.gle',
  'forms.office.com',
  'forms.microsoft.com',
  'forms.zoho.com',
  'forms.zohopublic.com',
  'forms.zohopublic.in',
  'recruit.zoho.com',
  'recruit.zoho.in',
  'zohorecruit.com',
  'keka.com',
  'app.keka.com',
];

interface PersistedTabInfo {
  tabId: number;
  url: string;
  title?: string;
  domain: string;
  timestamp: number;
}

const STORAGE_KEY_LAST_TAB = 'autoapply_last_external_tab';

function isExtensionOrBrowserInternalUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://') ||
    url.startsWith('view-source:')
  );
}

export function isSupportedApplicationDomain(url?: string): boolean {
  if (!url || isExtensionOrBrowserInternalUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Specific domain matches
    if (SUPPORTED_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
      // For google docs, only /forms
      if (hostname === 'docs.google.com' && !pathname.includes('/forms/')) {
        return false;
      }
      return true;
    }

    // Generic job keywords in URL
    if (
      pathname.includes('/job') ||
      pathname.includes('/career') ||
      pathname.includes('/apply') ||
      pathname.includes('/application')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function persistTrackedTab(tabId: number, url: string, title?: string) {
  if (isExtensionOrBrowserInternalUrl(url)) return;
  try {
    const parsed = new URL(url);
    const tabInfo: PersistedTabInfo = {
      tabId,
      url,
      title: title || '',
      domain: parsed.hostname,
      timestamp: Date.now(),
    };
    await chrome.storage.session?.set({ [STORAGE_KEY_LAST_TAB]: tabInfo }).catch(() => {
      // Fallback to local storage if session storage is unavailable
      chrome.storage.local.set({ [STORAGE_KEY_LAST_TAB]: tabInfo });
    });
  } catch (err) {
    // Ignore invalid URLs
  }
}

async function getPersistedTrackedTab(): Promise<PersistedTabInfo | null> {
  try {
    const res = await (chrome.storage.session
      ? chrome.storage.session.get([STORAGE_KEY_LAST_TAB])
      : chrome.storage.local.get([STORAGE_KEY_LAST_TAB]));
    return (res && res[STORAGE_KEY_LAST_TAB]) || null;
  } catch {
    return null;
  }
}

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url && !isExtensionOrBrowserInternalUrl(tab.url)) {
      await persistTrackedTab(tab.id!, tab.url, tab.title);
    }
  } catch {
    // Ignore invalid queries
  }
});

// Track URL updates on tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (currentUrl && !isExtensionOrBrowserInternalUrl(currentUrl)) {
    if (tab.active) {
      persistTrackedTab(tabId, currentUrl, tab.title);
    }
  }
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const current = await getPersistedTrackedTab();
  if (current && current.tabId === tabId) {
    if (chrome.storage.session) {
      await chrome.storage.session.remove([STORAGE_KEY_LAST_TAB]);
    } else {
      await chrome.storage.local.remove([STORAGE_KEY_LAST_TAB]);
    }
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

/**
 * Opens or focuses the single standalone dashboard tab.
 */
export async function openOrFocusDashboard(): Promise<chrome.tabs.Tab> {
  const dashboardUrl = chrome.runtime.getURL('app.html');
  const tabs = await chrome.tabs.query({});
  const existingDashboard = tabs.find((t) => t.url && t.url.startsWith(dashboardUrl));

  if (existingDashboard && existingDashboard.id) {
    await chrome.tabs.update(existingDashboard.id, { active: true });
    if (existingDashboard.windowId) {
      await chrome.windows.update(existingDashboard.windowId, { focused: true });
    }
    return existingDashboard;
  } else {
    return await chrome.tabs.create({ url: dashboardUrl });
  }
}

// Register toolbar click listener to open/focus standalone dashboard
chrome.action.onClicked.addListener(async () => {
  try {
    await openOrFocusDashboard();
  } catch (err) {
    console.error('[AutoApply] Failed to open dashboard on toolbar action click:', err);
  }
});

// Relay messages between content scripts, popup, and dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return true;
  }

  // Request tracked external application tab for Form Assistant
  if (message.type === 'GET_ACTIVE_APPLICATION_TAB') {
    (async () => {
      // 1. Try to read persisted tab context first
      const persisted = await getPersistedTrackedTab();
      if (persisted && persisted.tabId) {
        try {
          const tab = await chrome.tabs.get(persisted.tabId);
          if (tab && tab.url && !isExtensionOrBrowserInternalUrl(tab.url)) {
            const domain = new URL(tab.url).hostname;
            const resp: GetActiveApplicationTabResponse = {
              tabId: tab.id ?? null,
              url: tab.url,
              title: tab.title ?? null,
              domain,
              isSupportedDomain: isSupportedApplicationDomain(tab.url),
            };
            sendResponse(resp);
            return;
          }
        } catch {
          // Tab is closed
        }
      }

      // 2. Fallback: Query all non-extension tabs in current or other windows
      const allTabs = await chrome.tabs.query({});
      const externalTabs = allTabs.filter((t) => t.url && !isExtensionOrBrowserInternalUrl(t.url));

      // Prefer supported domain if active or available, otherwise active external tab
      const supportedCandidate = externalTabs.find((t) => isSupportedApplicationDomain(t.url));
      const activeCandidate = externalTabs.find((t) => t.active);
      const candidateTab = supportedCandidate || activeCandidate || externalTabs[0];

      if (candidateTab && candidateTab.id && candidateTab.url) {
        await persistTrackedTab(candidateTab.id, candidateTab.url, candidateTab.title);
        const domain = new URL(candidateTab.url).hostname;

        const resp: GetActiveApplicationTabResponse = {
          tabId: candidateTab.id,
          url: candidateTab.url,
          title: candidateTab.title ?? null,
          domain,
          isSupportedDomain: isSupportedApplicationDomain(candidateTab.url),
        };
        sendResponse(resp);
      } else {
        const resp: GetActiveApplicationTabResponse = {
          tabId: null,
          url: null,
          title: null,
          domain: null,
          isSupportedDomain: false,
        };
        sendResponse(resp);
      }
    })();
    return true;
  }

  // Open standalone dashboard tab from popup or elsewhere
  if (message.type === 'OPEN_DASHBOARD_TAB') {
    openOrFocusDashboard()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // Relay dynamic form mutation notices from content script to active popup / dashboard
  if (message.type === 'DYNAMIC_FORM_CHANGED') {
    chrome.runtime
      .sendMessage({
        type: 'TAB_FORM_MUTATED',
        tabId: sender.tab?.id,
        url: sender.tab?.url,
      })
      .catch(() => {
        // Suppress error if dashboard is not actively open
      });
    sendResponse({ received: true });
    return true;
  }

  return false;
});
