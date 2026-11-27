import { scanRegistry } from '../scanner/elementRegistry';
import { isElementVisible } from '../scanner/classifier';
import { setNativeInputValue } from './nativeSetter';
import { setNativeSelectValue } from './selectHandler';
import { setRadioGroupValue } from './radioHandler';
import { setCheckboxValue } from './checkboxHandler';
import { setAriaRadioValue, setAriaCheckboxValue } from './ariaControlHandlers';
import { setCustomComboboxValue } from './customComboboxHandler';
import { adapterRegistry } from '../adapters/adapterRegistry';
import { DetectedField } from '../scanner/types';

export type FillFieldStatus =
  | 'filled'
  | 'skipped_existing_value'
  | 'skipped_value_changed'
  | 'skipped_ambiguous'
  | 'skipped_missing_value'
  | 'needs_review'
  | 'failed'
  | 'element_not_found'
  | 'rejected_by_site'
  | 'unsupported_control';

export interface FillInstruction {
  fieldId: string;
  proposedValue: string | boolean | string[];
  approved: boolean;
  overwriteExisting?: boolean;
  isAmbiguous?: boolean;
  scanTimeValue?: string | boolean | string[];
}

export interface FieldFillResult {
  fieldId: string;
  status: FillFieldStatus;
  verifiedValue?: string | boolean | string[];
  message: string;
}

export interface FillSessionReport {
  sessionId: string;
  timestamp: string;
  totalRequested: number;
  filledCount: number;
  skippedCount: number;
  failedCount: number;
  results: FieldFillResult[];
}

/**
 * Reads live DOM value from native or custom control.
 */
export function readLiveDomValue(
  el: HTMLElement,
  groupedElements?: HTMLElement[]
): string | boolean | string[] {
  const inputType = (el.getAttribute('type') || '').toLowerCase();
  const role = el.getAttribute('role') || '';

  if (groupedElements && groupedElements.length > 0) {
    if (inputType === 'radio' || role === 'radio') {
      const checked = groupedElements.find(
        (r) => (r as HTMLInputElement).checked || r.getAttribute('aria-checked') === 'true'
      );
      return checked
        ? (checked as HTMLInputElement).value ||
            checked.getAttribute('data-value') ||
            checked.getAttribute('aria-label') ||
            checked.textContent?.trim() ||
            ''
        : '';
    } else {
      return groupedElements
        .filter((c) => (c as HTMLInputElement).checked || c.getAttribute('aria-checked') === 'true')
        .map(
          (c) =>
            (c as HTMLInputElement).value ||
            c.getAttribute('data-value') ||
            c.getAttribute('aria-label') ||
            c.textContent?.trim() ||
            ''
        )
        .sort();
    }
  }

  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    return el.checked;
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value || '';
  }

  if (el.isContentEditable) {
    return el.innerText?.trim() || el.textContent?.trim() || '';
  }

  // Custom ARIA listbox or combobox: inspect selected option or text content
  if (role === 'combobox' || role === 'listbox') {
    const selectedOption = el.querySelector('[aria-selected="true"], [role="option"][aria-selected="true"]');
    if (selectedOption) {
      return selectedOption.getAttribute('data-value') || selectedOption.textContent?.trim() || '';
    }
    return el.getAttribute('data-value') || el.textContent?.trim() || '';
  }

  return el.textContent?.trim() || '';
}

/**
 * Compares two values for semantic equality in forms.
 */
export function areFormValuesEqual(
  actual: string | boolean | string[],
  expected: string | boolean | string[]
): boolean {
  if (Array.isArray(expected)) {
    const actArr = Array.isArray(actual)
      ? actual.map((v) => String(v).toLowerCase().trim()).sort()
      : [String(actual).toLowerCase().trim()];
    const expArr = expected.map((v) => String(v).toLowerCase().trim()).sort();
    return JSON.stringify(actArr) === JSON.stringify(expArr);
  }

  if (typeof expected === 'boolean') {
    if (typeof actual === 'boolean') return actual === expected;
    const strAct = String(actual).toLowerCase().trim();
    if (expected && ['true', 'yes', 'on', '1'].includes(strAct)) return true;
    if (!expected && ['false', 'no', 'off', '0', ''].includes(strAct)) return true;
    return false;
  }

  const actStr = String(actual ?? '').toLowerCase().trim();
  const expStr = String(expected ?? '').toLowerCase().trim();
  return actStr === expStr;
}

/**
 * Coordinates execution of approved field fills using the scan-session element registry.
 * Validates DOM node presence, visibility, disabled state, adapter custom control filling,
 * waits for platform state to settle, and strictly verifies DOM value against expected value.
 */
export async function executeFillInstructions(
  sessionId: string,
  instructions: FillInstruction[]
): Promise<FillSessionReport> {
  const results: FieldFillResult[] = [];
  let filledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const currentUrl = typeof window !== 'undefined' && window.location ? window.location.href : '';
  const adapter = adapterRegistry.findAdapter(currentUrl, document);

  for (const instr of instructions) {
    if (!instr.approved) {
      results.push({
        fieldId: instr.fieldId,
        status: 'needs_review',
        message: 'Fill skipped because user did not approve this field.',
      });
      skippedCount++;
      continue;
    }

    if (instr.proposedValue === undefined || instr.proposedValue === null || instr.proposedValue === '') {
      results.push({
        fieldId: instr.fieldId,
        status: 'skipped_missing_value',
        message: 'No candidate profile data available for this field.',
      });
      skippedCount++;
      continue;
    }

    const reg = scanRegistry.resolve(instr.fieldId, sessionId);
    if (!reg || !reg.element || !document.contains(reg.element)) {
      results.push({
        fieldId: instr.fieldId,
        status: 'element_not_found',
        message: 'Element is no longer attached to the document or scan session expired.',
      });
      failedCount++;
      continue;
    }

    const el = reg.element;

    // Safety: Verify current visibility and disabled/readonly status
    if (!isElementVisible(el)) {
      results.push({
        fieldId: instr.fieldId,
        status: 'failed',
        message: 'Element is currently hidden or occluded in the DOM.',
      });
      failedCount++;
      continue;
    }

    const isDisabled = el.hasAttribute('disabled') || (el as HTMLInputElement).disabled;
    const isReadOnly = el.hasAttribute('readonly') || (el as HTMLInputElement).readOnly;
    if (isDisabled || isReadOnly) {
      results.push({
        fieldId: instr.fieldId,
        status: 'failed',
        message: 'Cannot fill disabled or read-only input.',
      });
      failedCount++;
      continue;
    }

    // Ambiguous mappings must never be filled even if overwrite was toggled
    if (instr.isAmbiguous) {
      results.push({
        fieldId: instr.fieldId,
        status: 'skipped_ambiguous',
        message: 'Field mapping is ambiguous; automatic fill prohibited.',
      });
      skippedCount++;
      continue;
    }

    // Safety: Retrieve current live DOM value
    const currentVal = readLiveDomValue(el, reg.groupedElements);

    // Check if the value changed between scan time and fill execution
    let valueChanged = false;
    if (instr.scanTimeValue !== undefined) {
      if (!areFormValuesEqual(currentVal, instr.scanTimeValue) && !areFormValuesEqual(currentVal, instr.proposedValue)) {
        valueChanged = true;
      }
    }

    if (valueChanged) {
      results.push({
        fieldId: instr.fieldId,
        status: 'skipped_value_changed',
        verifiedValue: currentVal,
        message: 'Field value changed on page after scanning. Re-scan required.',
      });
      skippedCount++;
      continue;
    }

    // Existing non-empty value protection
    let hasExisting = false;
    if (Array.isArray(currentVal)) {
      hasExisting = currentVal.length > 0;
    } else if (typeof currentVal === 'string') {
      hasExisting = currentVal.trim().length > 0 && !areFormValuesEqual(currentVal, instr.proposedValue);
    } else if (typeof currentVal === 'boolean') {
      hasExisting = currentVal === true && instr.proposedValue === false;
    }

    if (!instr.overwriteExisting && hasExisting) {
      results.push({
        fieldId: instr.fieldId,
        status: 'skipped_existing_value',
        verifiedValue: currentVal,
        message: 'Field contains existing selection/text and overwrite was not approved.',
      });
      skippedCount++;
      continue;
    }

    const tagName = el.tagName.toLowerCase();
    const inputType = (el.getAttribute('type') || '').toLowerCase();
    const role = el.getAttribute('role') || '';

    try {
      let adapterHandled = false;
      let interactionStarted = false;

      // 1. Try Platform Adapter custom control fill if available
      if (adapter && adapter.fillControl) {
        const syntheticField: DetectedField = {
          id: instr.fieldId,
          type:
            (reg.fieldType as any) ||
            (reg.groupedElements && reg.groupedElements.length > 0
              ? inputType === 'radio' || role === 'radio'
                ? 'radio-group'
                : 'checkbox-group'
              : role === 'combobox' || role === 'listbox'
              ? 'custom-select'
              : (inputType as any) || 'text'),
          label: '',
          isRequired: false,
          isDisabled: false,
          isVisible: true,
          options: reg.options,
          selector: '',
          platformId: reg.platformId,
        };

        const adapterRes = await adapter.fillControl(
          syntheticField,
          instr.proposedValue,
          el,
          reg.groupedElements
        );

        if (typeof adapterRes === 'object' && adapterRes !== null) {
          if (adapterRes.status === 'handled') {
            adapterHandled = true;
          } else if (adapterRes.status === 'failed') {
            interactionStarted = adapterRes.interactionStarted;
            if (interactionStarted) {
              // Control was already opened or modified by adapter; do not trigger blind fallback clicks!
              results.push({
                fieldId: instr.fieldId,
                status: 'rejected_by_site',
                message: adapterRes.reason,
              });
              failedCount++;
              continue;
            }
          }
        } else if (typeof adapterRes === 'boolean') {
          adapterHandled = adapterRes;
        }
      }

      // 2. Standard native & ARIA control fill fallback if not handled by adapter
      if (!adapterHandled && !interactionStarted) {
        const isAriaRadioGroup = reg.groupedElements && reg.groupedElements.length > 0 && (role === 'radio' || reg.groupedElements[0]?.getAttribute('role') === 'radio');
        const isAriaCheckboxGroup = reg.groupedElements && reg.groupedElements.length > 0 && (role === 'checkbox' || reg.groupedElements[0]?.getAttribute('role') === 'checkbox');

        if (isAriaRadioGroup && reg.groupedElements) {
          const res = setAriaRadioValue(reg.groupedElements, instr.proposedValue as any);
          if (!res.success) {
            results.push({
              fieldId: instr.fieldId,
              status: 'rejected_by_site',
              message: `Could not match or select ARIA radio option for "${String(instr.proposedValue)}".`,
            });
            failedCount++;
            continue;
          }
        } else if (isAriaCheckboxGroup && reg.groupedElements) {
          const res = setAriaCheckboxValue(reg.groupedElements, instr.proposedValue as any, Boolean(instr.overwriteExisting));
          if (!res.success) {
            results.push({
              fieldId: instr.fieldId,
              status: 'rejected_by_site',
              message: `Could not match or select ARIA checkbox option for "${String(instr.proposedValue)}".`,
            });
            failedCount++;
            continue;
          }
        } else if (reg.groupedElements && reg.groupedElements.length > 0) {
          if (inputType === 'radio') {
            setRadioGroupValue(reg.groupedElements as HTMLInputElement[], instr.proposedValue as any);
          } else {
            setCheckboxValue(
              reg.groupedElements as HTMLInputElement[],
              instr.proposedValue as any,
              Boolean(instr.overwriteExisting)
            );
          }
        } else if (tagName === 'select') {
          setNativeSelectValue(el as HTMLSelectElement, String(instr.proposedValue));
        } else if (
          role === 'combobox' ||
          role === 'listbox' ||
          reg.fieldType === 'custom-select' ||
          el.getAttribute('aria-haspopup') === 'listbox'
        ) {
          const comboHandled = await setCustomComboboxValue(el, instr.proposedValue as any);
          if (!comboHandled) {
            results.push({
              fieldId: instr.fieldId,
              status: 'rejected_by_site',
              message: `Could not select value "${String(instr.proposedValue)}" in custom combobox.`,
            });
            failedCount++;
            continue;
          }
        } else if (tagName === 'input' && inputType === 'checkbox') {
          setCheckboxValue(
            [el as HTMLInputElement],
            instr.proposedValue as any,
            Boolean(instr.overwriteExisting)
          );
        } else if (tagName === 'input' || tagName === 'textarea') {
          setNativeInputValue(el as HTMLInputElement | HTMLTextAreaElement, instr.proposedValue as any);
        } else if (el.isContentEditable) {
          el.innerText = String(instr.proposedValue);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          results.push({
            fieldId: instr.fieldId,
            status: 'unsupported_control',
            message: `Custom or unsupported control type: <${tagName} role="${role}">.`,
          });
          failedCount++;
          continue;
        }
      }

      // Step 3: Wait for platform state to settle
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Step 4 & 5: Read actual live DOM state and compare against proposed expected value
      const livePostValue = readLiveDomValue(el, reg.groupedElements);
      const isVerified = areFormValuesEqual(livePostValue, instr.proposedValue);

      if (isVerified) {
        results.push({
          fieldId: instr.fieldId,
          status: 'filled',
          verifiedValue: livePostValue,
          message: 'Field successfully populated and verified in DOM.',
        });
        filledCount++;
      } else {
        results.push({
          fieldId: instr.fieldId,
          status: 'rejected_by_site',
          verifiedValue: livePostValue,
          message: `Interaction dispatched, but site refused value. Expected: "${String(instr.proposedValue)}", Live DOM: "${String(livePostValue)}"`,
        });
        failedCount++;
      }
    } catch (err: any) {
      results.push({
        fieldId: instr.fieldId,
        status: 'failed',
        message: err.message || 'Error occurred during input fill execution.',
      });
      failedCount++;
    }
  }

  return {
    sessionId,
    timestamp: new Date().toISOString(),
    totalRequested: instructions.length,
    filledCount,
    skippedCount,
    failedCount,
    results,
  };
}
