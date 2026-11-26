/**
 * AutoApply Content Script
 * Modular Scanner with debounced MutationObserver.
 */

import { UniversalFormScanner } from '../scanner/formScanner';

console.log('[AutoApply] Universal Form Scanner content script initialized on:', window.location.href);

const scanner = new UniversalFormScanner(document);

// Listen for messages from Popup or Sidepanel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'PING_CONTENT') {
    sendResponse({
      status: 'READY',
      url: window.location.href,
      title: document.title,
    });
    return true;
  }

  if (request.type === 'SCAN_FORM_SUMMARY') {
    const summary = scanner.scan();
    sendResponse(summary);
    return true;
  }

  return false;
});

// Setup debounced dynamic mutation observer to avoid CPU lockup
let mutationTimeout: any = null;
const observer = new MutationObserver((mutations) => {
  let hasRelevantChange = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
      hasRelevantChange = true;
      break;
    }
  }

  if (hasRelevantChange) {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      // Broadcast dynamic form change event if needed
      chrome.runtime.sendMessage({ type: 'DYNAMIC_FORM_CHANGED' }).catch(() => {
        // Suppress error if popup/sidepanel is closed
      });
    }, 500);
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});
