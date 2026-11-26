/**
 * AutoApply Content Script
 * Modular Scanner and Autofill Engine coordinator with frame awareness,
 * session target locking validation, and dynamic mutation observing.
 */

import { UniversalFormScanner } from '../scanner/formScanner';
import { executeFillInstructions, FillInstruction } from '../filling/fillCoordinator';
import { FillApprovedFieldsRequest, FillApprovedFieldsResponse } from '../messaging/protocol';

console.log('[AutoApply] Universal Form Scanner and Autofill script loaded on:', window.location.href);

const scanner = new UniversalFormScanner(document);
const isIframe = window !== window.top;

// Listen for messages from Background, Popup, or Dashboard
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'PING_CONTENT') {
    sendResponse({
      status: 'READY',
      url: window.location.href,
      title: document.title,
      isIframe,
    });
    return true;
  }

  if (request.type === 'SCAN_FORM_SUMMARY') {
    const summary = scanner.scan();
    summary.url = window.location.href;
    sendResponse(summary);
    return true;
  }

  // Unified contract for fill execution with target context validation
  if (request.type === 'FILL_APPROVED_FIELDS') {
    const req = request as FillApprovedFieldsRequest;
    const { sessionId, instructions, targetContext } = req;

    if (!sessionId) {
      const errRes: FillApprovedFieldsResponse = {
        success: false,
        error: 'Missing scan session ID.',
      };
      sendResponse(errRes);
      return true;
    }

    // Phase 2: Validate Target Context Locking
    if (targetContext) {
      if (targetContext.scanSessionId && targetContext.scanSessionId !== sessionId) {
        sendResponse({
          success: false,
          error: `Mismatched scan session ID in target lock. Expected: ${targetContext.scanSessionId}, Got: ${sessionId}`,
        });
        return true;
      }

      // Check URL consistency
      try {
        const currentOrigin = new URL(window.location.href).origin;
        const targetOrigin = new URL(targetContext.url).origin;
        if (currentOrigin !== targetOrigin) {
          sendResponse({
            success: false,
            error: `Target URL origin mismatch. Current: ${currentOrigin}, Target: ${targetOrigin}`,
          });
          return true;
        }
      } catch {
        // Ignore parsing errors for relative URLs
      }
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

    (async () => {
      try {
        const report = await executeFillInstructions(sessionId, fillInstructions);
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
    })();
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
              node.matches?.('input, select, textarea, form, [role="combobox"], [role="radiogroup"], [role="listbox"], label, legend') ||
              node.querySelector?.('input, select, textarea, [role="combobox"], [role="radiogroup"], [role="listbox"], label, legend')
            ) {
              hasRelevantChange = true;
              break;
            }
          }
        }
      }
    } else if (m.type === 'attributes') {
      const target = m.target as HTMLElement;
      if (
        target.matches?.('input, select, textarea, [role="combobox"], [role="radio"], [role="checkbox"]') &&
        ['value', 'checked', 'disabled', 'readonly', 'aria-checked', 'aria-expanded'].includes(m.attributeName || '')
      ) {
        hasRelevantChange = true;
      }
    }

    if (hasRelevantChange) break;
  }

  if (hasRelevantChange) {
    if (mutationTimeout) clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      chrome.runtime
        .sendMessage({
          type: 'DYNAMIC_FORM_CHANGED',
          url: window.location.href,
        })
        .catch(() => {
          // Dashboard or popup may not be active; suppress harmless error
        });
    }, 500);
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'readonly', 'aria-checked', 'aria-expanded', 'class'],
});
