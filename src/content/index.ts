/**
 * AutoApply Content Script
 * Modular Scanner and Autofill Engine coordinator.
 */

import { UniversalFormScanner } from '../scanner/formScanner';
import { executeFillInstructions, FillInstruction } from '../filling/fillCoordinator';
import { FillApprovedFieldsRequest, FillApprovedFieldsResponse } from '../messaging/protocol';

console.log('[AutoApply] Universal Form Scanner and Autofill script loaded on:', window.location.href);

const scanner = new UniversalFormScanner(document);

// Listen for messages from Popup or Dashboard
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'PING_CONTENT') {
    sendResponse({
      status: 'READY',
      url: window.location.href,
      title: document.title,
      isIframe: window !== window.top,
    });
    return true;
  }

  if (request.type === 'SCAN_FORM_SUMMARY') {
    const summary = scanner.scan();
    sendResponse(summary);
    return true;
  }

  // Unified contract for fill execution
  if (request.type === 'FILL_APPROVED_FIELDS') {
    const req = request as FillApprovedFieldsRequest;
    const { sessionId, instructions } = req;

    if (!sessionId) {
      const errRes: FillApprovedFieldsResponse = {
        success: false,
        error: 'Missing scan session ID.',
      };
      sendResponse(errRes);
      return true;
    }

    if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
      const errRes: FillApprovedFieldsResponse = {
        success: false,
        error: 'No fill instructions received.',
      };
      sendResponse(errRes);
      return true;
    }

    // Convert and enforce that every instruction is strictly approved
    const fillInstructions: FillInstruction[] = instructions.map((i) => ({
      fieldId: i.fieldId,
      proposedValue: i.proposedValue,
      approved: Boolean(i.approved),
      overwriteExisting: Boolean(i.overwriteExisting),
      isAmbiguous: Boolean(i.isAmbiguous),
      scanTimeValue: i.scanTimeValue,
    }));

    try {
      const report = executeFillInstructions(sessionId, fillInstructions);
      const successRes: FillApprovedFieldsResponse = {
        success: true,
        report,
      };
      sendResponse(successRes);
    } catch (err: any) {
      sendResponse({
        success: false,
        error: err.message || 'Execution failed in content script.',
      });
    }
    return true;
  }

  return false;
});

// Setup debounced dynamic mutation observer detecting control additions, removals, attribute and label changes
let mutationTimeout: any = null;

const observer = new MutationObserver((mutations) => {
  let hasRelevantChange = false;

  for (const m of mutations) {
    if (m.type === 'childList') {
      if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
        for (const node of Array.from(m.addedNodes).concat(Array.from(m.removedNodes))) {
          if (node instanceof HTMLElement) {
            if (
              node.matches?.('input, select, textarea, form, [role="combobox"], [role="radiogroup"], label, legend') ||
              node.querySelector?.('input, select, textarea, [role="combobox"], [role="radiogroup"], label, legend')
            ) {
              hasRelevantChange = true;
              break;
            }
          }
        }
      }
    } else if (m.type === 'attributes') {
      const target = m.target as HTMLElement;
      const attr = m.attributeName || '';
      if (
        attr === 'disabled' ||
        attr === 'readonly' ||
        attr === 'required' ||
        attr.startsWith('aria-') ||
        attr === 'hidden' ||
        attr === 'style'
      ) {
        if (target.matches?.('input, select, textarea, [role="combobox"], [role="radiogroup"], label, legend')) {
          hasRelevantChange = true;
          break;
        }
      }
    } else if (m.type === 'characterData') {
      const parent = (m.target as Node).parentElement;
      if (parent && (parent.tagName === 'LABEL' || parent.tagName === 'LEGEND' || parent.closest('label, legend'))) {
        hasRelevantChange = true;
        break;
      }
    }
    if (hasRelevantChange) break;
  }

  if (hasRelevantChange) {
    if (mutationTimeout) clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'DYNAMIC_FORM_CHANGED' }).catch(() => {
        // Suppress errors when popup/dashboard is closed
      });
    }, 400);
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'readonly', 'required', 'aria-disabled', 'aria-required', 'aria-hidden', 'hidden', 'style'],
  characterData: true,
});
