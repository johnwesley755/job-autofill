import { scanRegistry } from '../scanner/elementRegistry';
import { isElementVisible } from '../scanner/classifier';
import { setNativeInputValue } from './nativeSetter';
import { setNativeSelectValue } from './selectHandler';
import { setRadioGroupValue } from './radioHandler';
import { setCheckboxValue } from './checkboxHandler';

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

    // Safety: Retrieve current live DOM value (handling array for checkbox groups)
    let currentVal: string | boolean | string[] = '';
    const tagName = el.tagName.toLowerCase();
    const inputType = (el.getAttribute('type') || '').toLowerCase();

    if (reg.groupedElements && reg.groupedElements.length > 0) {
      if (inputType === 'radio') {
        const checked = reg.groupedElements.find((r) => (r as HTMLInputElement).checked);
        currentVal = checked ? (checked as HTMLInputElement).value : '';
      } else {
        currentVal = reg.groupedElements
          .filter((c) => (c as HTMLInputElement).checked)
          .map((c) => (c as HTMLInputElement).value)
          .sort();
      }
    } else if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      currentVal = el.checked;
    } else {
      currentVal = (el as HTMLInputElement).value || '';
    }

    // Check if the value changed between scan time and fill execution
    let valueChanged = false;
    if (instr.scanTimeValue !== undefined) {
      if (Array.isArray(instr.scanTimeValue)) {
        const scanArr = instr.scanTimeValue.slice().sort();
        const currArr = Array.isArray(currentVal) ? currentVal : [String(currentVal)];
        if (JSON.stringify(scanArr) !== JSON.stringify(currArr)) {
          valueChanged = true;
        }
      } else if (currentVal !== instr.scanTimeValue && currentVal !== instr.proposedValue) {
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
      hasExisting = currentVal.trim().length > 0 && currentVal !== String(instr.proposedValue);
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

    let success = false;
    let verifiedValue: string | boolean | string[] = '';

    try {
      if (reg.groupedElements && reg.groupedElements.length > 0) {
        if (inputType === 'radio') {
          success = setRadioGroupValue(reg.groupedElements as HTMLInputElement[], instr.proposedValue as any);
          const checked = reg.groupedElements.find((r) => (r as HTMLInputElement).checked);
          verifiedValue = checked ? (checked as HTMLInputElement).value : '';
        } else {
          success = setCheckboxValue(
            reg.groupedElements as HTMLInputElement[],
            instr.proposedValue as any,
            Boolean(instr.overwriteExisting)
          );
          verifiedValue = reg.groupedElements
            .filter((c) => (c as HTMLInputElement).checked)
            .map((c) => (c as HTMLInputElement).value);
        }
      } else if (tagName === 'select') {
        success = setNativeSelectValue(el as HTMLSelectElement, String(instr.proposedValue));
        verifiedValue = (el as HTMLSelectElement).value;
      } else if (tagName === 'input' && inputType === 'checkbox') {
        success = setCheckboxValue(
          [el as HTMLInputElement],
          instr.proposedValue as any,
          Boolean(instr.overwriteExisting)
        );
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
