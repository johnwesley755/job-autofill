/**
 * AutoApply Content Script
 * Observes pages, listens for scan requests, and extracts form context safely.
 */

console.log('[AutoApply] Content script loaded on:', window.location.href);

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
    const inputs = document.querySelectorAll('input, select, textarea');
    sendResponse({
      totalFields: inputs.length,
      url: window.location.href,
      domain: window.location.hostname,
    });
    return true;
  }

  return false;
});
