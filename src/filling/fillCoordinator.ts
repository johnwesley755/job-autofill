import { scanRegistry } from '../scanner/elementRegistry';
import { isElementVisible } from '../scanner/classifier';
import { setNativeInputValue } from './nativeSetter';
import { setNativeSelectValue } from './selectHandler';
import { setRadioGroupValue } from './radioHandler';
import { setCheckboxValue } from './checkboxHandler';

export type FillFieldStatus =
  | 'filled'
  | 'skipped_existing_value'
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
 * Coordinates execution of approved field fills using the scan-session element registry.
 * Validates DOM node presence, visibility, disabled state, and verifies value after assignment.
 */
export function executeFillInstructions(
  sessionId: string,
  instructions: FillInstruction[]
): FillSessionReport {
  const results: FieldFillResult[] = [];
  let filledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

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

    // Safety: Check if current value changed since scan or contains non-empty content
    const currentVal =
      el instanceof HTMLInputElement && el.type === 'checkbox'
        ? el.checked
        : (el as HTMLInputElement).value || '';

    if (
      !instr.overwriteExisting &&
      typeof currentVal === 'string' &&
      currentVal.trim().length > 0 &&
      currentVal !== String(instr.proposedValue)
    ) {
      results.push({
        fieldId: instr.fieldId,
        status: 'skipped_existing_value',
        verifiedValue: currentVal,
        message: 'Field contains existing text and overwrite was not approved.',
      });
      skippedCount++;
      continue;
    }

    const tagName = el.tagName.toLowerCase();
    const inputType = (el.getAttribute('type') || '').toLowerCase();
    let success = false;
    let verifiedValue: string | boolean | string[] = '';

    try {
      if (reg.groupedElements && reg.groupedElements.length > 0) {
        if (inputType === 'radio') {
          success = setRadioGroupValue(reg.groupedElements as HTMLInputElement[], instr.proposedValue as any);
          const checked = reg.groupedElements.find((r) => (r as HTMLInputElement).checked);
          verifiedValue = checked ? (checked as HTMLInputElement).value : '';
        } else {
          success = setCheckboxValue(reg.groupedElements as HTMLInputElement[], instr.proposedValue as any);
          verifiedValue = reg.groupedElements
            .filter((c) => (c as HTMLInputElement).checked)
            .map((c) => (c as HTMLInputElement).value);
        }
      } else if (tagName === 'select') {
        success = setNativeSelectValue(el as HTMLSelectElement, String(instr.proposedValue));
        verifiedValue = (el as HTMLSelectElement).value;
      } else if (tagName === 'input' && inputType === 'checkbox') {
        success = setCheckboxValue([el as HTMLInputElement], instr.proposedValue as any);
        verifiedValue = (el as HTMLInputElement).checked;
      } else if (tagName === 'input' || tagName === 'textarea') {
        success = setNativeInputValue(el as HTMLInputElement | HTMLTextAreaElement, instr.proposedValue as any);
        verifiedValue = (el as HTMLInputElement | HTMLTextAreaElement).value;
      } else {
        results.push({
          fieldId: instr.fieldId,
          status: 'unsupported_control',
          message: `Custom or unsupported control type: <${tagName}>.`,
        });
        failedCount++;
        continue;
      }

      if (success) {
        results.push({
          fieldId: instr.fieldId,
          status: 'filled',
          verifiedValue,
          message: 'Field successfully populated and verified.',
        });
        filledCount++;
      } else {
        results.push({
          fieldId: instr.fieldId,
          status: 'failed',
          verifiedValue,
          message: 'Input setter was dispatched but DOM verification failed.',
        });
        failedCount++;
      }
    } catch (err: any) {
      results.push({
        fieldId: instr.fieldId,
        status: 'failed',
        message: err.message || 'Error occurred during native input fill.',
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
