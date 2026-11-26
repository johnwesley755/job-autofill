/**
 * AutoApply Background Service Worker (Manifest V3)
 * Handles external active application tab tracking, dashboard launch, frame discovery, and message relaying.
 */

import { GetActiveApplicationTabResponse, DiscoverFramesResponse, DiscoveredFrameInfo } from '../messaging/protocol';

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
  } catch {
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

  // Phase 1: Frame Discovery
  if (message.type === 'DISCOVER_FRAMES') {
    const targetTabId = message.tabId;
    if (!targetTabId) {
      sendResponse({ tabId: 0, frames: [], inaccessibleFramesCount: 0 });
      return true;
    }

    (async () => {
      try {
        const frameDetails = await chrome.webNavigation.getAllFrames({ tabId: targetTabId });
        const frames: DiscoveredFrameInfo[] = [];
        let inaccessibleCount = 0;

        if (frameDetails && Array.isArray(frameDetails)) {
          for (const f of frameDetails) {
            if (!isExtensionOrBrowserInternalUrl(f.url)) {
              frames.push({
                frameId: f.frameId,
                url: f.url,
                error: f.errorOccurred ? 'Navigation error in frame' : undefined,
              });
            }
          }
        }
        const resp: DiscoverFramesResponse = {
          tabId: targetTabId,
          frames,
          inaccessibleFramesCount: inaccessibleCount,
        };
        sendResponse(resp);
      } catch (err: any) {
        // webNavigation might not have permissions or tab not ready; fallback to frame 0
        sendResponse({
          tabId: targetTabId,
          frames: [{ frameId: 0, url: '' }],
          inaccessibleFramesCount: 0,
        });
      }
    })();
    return true;
  }

  // Phase 2: Secure Application Tab Tracking (Strict - NO ARBITRARY FALLBACK)
  if (message.type === 'GET_ACTIVE_APPLICATION_TAB') {
    (async () => {
      // 1. Check persisted tracked external tab
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

      // 2. Query only currently active non-extension tab in the last focused window
      const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const externalActive = activeTabs.find((t) => t.url && !isExtensionOrBrowserInternalUrl(t.url));

      if (externalActive && externalActive.id && externalActive.url) {
        await persistTrackedTab(externalActive.id, externalActive.url, externalActive.title);
        const domain = new URL(externalActive.url).hostname;
        const resp: GetActiveApplicationTabResponse = {
          tabId: externalActive.id,
          url: externalActive.url,
          title: externalActive.title ?? null,
          domain,
          isSupportedDomain: isSupportedApplicationDomain(externalActive.url),
        };
        sendResponse(resp);
        return;
      }

      // If no valid external application tab is found, return empty (explicit user selection required)
      const emptyResp: GetActiveApplicationTabResponse = {
        tabId: null,
        url: null,
        title: null,
        domain: null,
        isSupportedDomain: false,
      };
      sendResponse(emptyResp);
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
        frameId: sender.frameId,
      })
      .catch(() => {
        // Suppress error if dashboard is not actively open
      });
    sendResponse({ received: true });
    return true;
  }

  return false;
});
