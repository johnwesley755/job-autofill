import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setNativeInputValue } from '../src/filling/nativeSetter';
import { setNativeSelectValue } from '../src/filling/selectHandler';
import { setRadioGroupValue } from '../src/filling/radioHandler';
import { setCheckboxValue } from '../src/filling/checkboxHandler';
import { scanRegistry } from '../src/scanner/elementRegistry';
import { executeFillInstructions } from '../src/filling/fillCoordinator';

describe('Autofill Engine Modules', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    scanRegistry.clear();
  });

  afterEach(() => {
    document.body.removeChild(container);
    scanRegistry.clear();
  });

  describe('nativeSetter on text inputs', () => {
    it('sets value and fires input and change events', () => {
      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      let inputFired = false;
      let changeFired = false;
      input.addEventListener('input', () => {
        inputFired = true;
      });
      input.addEventListener('change', () => {
        changeFired = true;
      });

      const success = setNativeInputValue(input, 'John Doe');
      expect(success).toBe(true);
      expect(input.value).toBe('John Doe');
      expect(inputFired).toBe(true);
      expect(changeFired).toBe(true);
    });

    it('rejects filling disabled or readonly inputs', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.disabled = true;
      container.appendChild(input);

      const success = setNativeInputValue(input, 'Testing');
      expect(success).toBe(false);
      expect(input.value).toBe('');
    });
  });

  describe('selectHandler', () => {
    it('selects option by exact match or normalized value', () => {
      const select = document.createElement('select');
      const opt1 = document.createElement('option');
      opt1.value = '';
      opt1.text = 'Select Country';
      const opt2 = document.createElement('option');
      opt2.value = 'IN';
      opt2.text = 'India';
      const opt3 = document.createElement('option');
      opt3.value = 'US';
      opt3.text = 'United States';

      select.appendChild(opt1);
      select.appendChild(opt2);
      select.appendChild(opt3);
      container.appendChild(select);

      let changeFired = false;
      select.addEventListener('change', () => {
        changeFired = true;
      });

      const success = setNativeSelectValue(select, 'India');
      expect(success).toBe(true);
      expect(select.value).toBe('IN');
      expect(changeFired).toBe(true);
    });
  });

  describe('radioHandler', () => {
    it('selects correct radio button in a group and handles boolean string values', () => {
      const form = document.createElement('form');
      const radioYes = document.createElement('input');
      radioYes.type = 'radio';
      radioYes.name = 'relocate';
      radioYes.value = 'yes';
      radioYes.id = 'relocate_yes';

      const radioNo = document.createElement('input');
      radioNo.type = 'radio';
      radioNo.name = 'relocate';
      radioNo.value = 'no';
      radioNo.id = 'relocate_no';

      form.appendChild(radioYes);
      form.appendChild(radioNo);
      container.appendChild(form);

      const success = setRadioGroupValue([radioYes, radioNo], true);
      expect(success).toBe(true);
      expect(radioYes.checked).toBe(true);
      expect(radioNo.checked).toBe(false);
    });
  });

  describe('checkboxHandler', () => {
    it('checks checkbox when proposed value is true', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      container.appendChild(checkbox);

      let changeFired = false;
      checkbox.addEventListener('change', () => {
        changeFired = true;
      });

      const success = setCheckboxValue([checkbox], true);
      expect(success).toBe(true);
      expect(checkbox.checked).toBe(true);
      expect(changeFired).toBe(true);
    });

    it('unchecks checkbox when proposed value is false and overwrite is granted', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      container.appendChild(checkbox);

      const success = setCheckboxValue([checkbox], false, true);
      expect(success).toBe(true);
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('fillCoordinator and scanRegistry integration', () => {
    it('executes instructions safely using session registry elements and respects approval', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'applicant_email';
      container.appendChild(input);

      const sessionId = scanRegistry.createSession();
      const fieldId = 'field_email_123';
      scanRegistry.register(fieldId, input, '');

      // Fill instruction unapproved -> should skip
      const unapprovedReport = await executeFillInstructions(sessionId, [
        {
          fieldId,
          proposedValue: 'unapproved@example.com',
          approved: false,
          overwriteExisting: false,
        },
      ]);

      expect(unapprovedReport.totalRequested).toBe(1);
      expect(unapprovedReport.filledCount).toBe(0);
      expect(unapprovedReport.skippedCount).toBe(1);
      expect(input.value).toBe('');

      // Fill instruction approved -> should fill
      const approvedReport = await executeFillInstructions(sessionId, [
        {
          fieldId,
          proposedValue: 'user@example.com',
          approved: true,
          overwriteExisting: false,
        },
      ]);

      expect(approvedReport.totalRequested).toBe(1);
      expect(approvedReport.filledCount).toBe(1);
      expect(approvedReport.failedCount).toBe(0);
      expect(input.value).toBe('user@example.com');
    });

    it('refuses to overwrite existing non-empty value if overwriteExisting is false', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'applicant_name';
      input.value = 'Existing Typed Name';
      container.appendChild(input);

      const sessionId = scanRegistry.createSession();
      const fieldId = 'field_name_456';
      scanRegistry.register(fieldId, input, 'Existing Typed Name');

      const report = await executeFillInstructions(sessionId, [
        {
          fieldId,
          proposedValue: 'New Name',
          approved: true,
          overwriteExisting: false,
        },
      ]);

      expect(report.filledCount).toBe(0);
      expect(report.skippedCount).toBe(1);
      expect(input.value).toBe('Existing Typed Name');
    });
  });
});
