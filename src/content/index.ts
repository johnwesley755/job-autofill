/**
 * AutoApply Content Script
 * Modular Scanner and Autofill Engine coordinator.
 */

import { UniversalFormScanner } from '../scanner/formScanner';
import { executeFillInstructions, FillInstruction } from '../filling/fillCoordinator';

console.log('[AutoApply] Universal Form Scanner and Autofill script loaded on:', window.location.href);

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

  if (request.type === 'EXECUTE_FILL') {
    const { sessionId, instructions } = request as {
      sessionId: string;
      instructions: FillInstruction[];
    };
    const report = executeFillInstructions(sessionId, instructions || []);
    sendResponse(report);
    return true;
  }

  return false;
});

// Setup debounced dynamic mutation observer to avoid CPU lockup
let mutationTimeout: any = null;
let lastControlCount = document.querySelectorAll('input, select, textarea').length;

const observer = new MutationObserver((mutations) => {
  let hasRelevantChange = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement) {
          if (
            node.matches?.('input, select, textarea, form, [role="combobox"]') ||
            node.querySelector?.('input, select, textarea, [role="combobox"]')
          ) {
            hasRelevantChange = true;
            break;
          }
        }
      }
      if (hasRelevantChange) break;
    }
  }

  if (hasRelevantChange) {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      const currentControlCount = document.querySelectorAll('input, select, textarea').length;
      if (currentControlCount !== lastControlCount) {
        lastControlCount = currentControlCount;
        chrome.runtime.sendMessage({ type: 'DYNAMIC_FORM_CHANGED' }).catch(() => {
          // Suppress error if popup/sidepanel is closed
        });
      }
    }, 600);
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});
