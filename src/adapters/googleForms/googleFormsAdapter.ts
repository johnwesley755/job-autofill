import { FormAdapter, ControlHandlerResult } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible } from '../../scanner/classifier';
import { setAriaRadioValue, setAriaCheckboxValue } from '../../filling/ariaControlHandlers';

export class GoogleFormsAdapter implements FormAdapter {
  platformId = 'google_forms';
  platformName = 'Google Forms';
  version = '2.1.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('docs.google.com/forms') ||
      url.includes('forms.gle') ||
      document.querySelector('form[action*="formResponse"], [data-form-view-id], .freebirdFormviewerViewNumberedItemContainer') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];

    // Support question containers across Google Forms layouts
    const questionContainers = Array.from(
      document.querySelectorAll('[role="listitem"], .freebirdFormviewerViewNumberedItemContainer, [jsmodel="CP1oW"]')
    ) as HTMLElement[];

    let idx = 0;
    for (const container of questionContainers) {
      if (!isElementVisible(container)) continue;

      const titleEl = container.querySelector(
        '[role="heading"], .exportItemTitle, .freebirdFormviewerComponentsQuestionBaseTitle, [dir="auto"]'
      );
      let questionText = titleEl?.textContent?.replace(/[\n\r\t]+/g, ' ').trim() || '';
      // Strip trailing asterisk indicating required
      questionText = questionText.replace(/\s*\*\s*$/, '').trim();

      if (!questionText) continue;

      const isRequired =
        container.querySelector('[aria-label*="Required"], .requiredAsterisk, [aria-hidden="true"] *') !== null ||
        container.textContent?.includes('*') ||
        false;

      idx++;

      // 1. Text input / Short answer / Date / Time
      const textInput = container.querySelector(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], input[type="time"]'
      ) as HTMLInputElement | null;
      if (textInput && !scanRegistry.hasElement(textInput)) {
        const fieldId = `gf_text_${idx}`;
        const inputType = (textInput.type as any) || 'text';
        scanRegistry.register(fieldId, textInput, textInput.value || '', undefined, {
          fieldType: inputType === 'date' ? 'date' : inputType === 'number' ? 'number' : inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : 'text',
          platformId: this.platformId,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: textInput.name || `gf_${idx}`,
          type: inputType === 'date' ? 'date' : inputType === 'number' ? 'number' : inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : 'text',
          label: questionText,
          placeholder: textInput.placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: textInput.disabled,
          isReadOnly: textInput.readOnly,
          currentValue: textInput.value || '',
          selector: textInput.id ? `#${CSS.escape(textInput.id)}` : `[role="listitem"] input[type="${inputType}"]`,
          platformId: this.platformId,
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        field.isAmbiguous = match.isAmbiguous;
        field.ambiguityReason = match.ambiguityReason;
        fields.push(field);
        continue;
      }

      // 2. Paragraph / Textarea
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea && !scanRegistry.hasElement(textarea)) {
        const fieldId = `gf_textarea_${idx}`;
        scanRegistry.register(fieldId, textarea, textarea.value || '', undefined, {
          fieldType: 'textarea',
          platformId: this.platformId,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: textarea.name || `gf_ta_${idx}`,
          type: 'textarea',
          label: questionText,
          placeholder: textarea.placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: textarea.disabled,
          isReadOnly: textarea.readOnly,
          currentValue: textarea.value || '',
          selector: textarea.id ? `#${CSS.escape(textarea.id)}` : `[role="listitem"] textarea`,
          platformId: this.platformId,
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        field.isAmbiguous = match.isAmbiguous;
        field.ambiguityReason = match.ambiguityReason;
        fields.push(field);
        continue;
      }

      // 3. Radio Group (Multiple choice / Linear scale / Grid rows)
      const radioElements = Array.from(
        container.querySelectorAll('[role="radio"], input[type="radio"]')
      ) as HTMLElement[];
      if (radioElements.length > 0 && !scanRegistry.hasElement(radioElements[0])) {
        const fieldId = `gf_radio_${idx}`;
        let checkedVal = '';

        const options = radioElements.map((r) => {
          const isChecked = r.getAttribute('aria-checked') === 'true' || (r as HTMLInputElement).checked;
          const val =
            r.getAttribute('data-value') ||
            r.getAttribute('aria-label') ||
            r.closest('label')?.textContent?.trim() ||
            r.textContent?.trim() ||
            '';
          if (isChecked) checkedVal = val;
          return {
            label: val,
            value: val,
          };
        });

        scanRegistry.register(fieldId, radioElements[0], checkedVal, radioElements, {
          fieldType: 'radio-group',
          platformId: this.platformId,
          options,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `gf_radio_grp_${idx}`,
          type: 'radio-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedVal,
          selector: `[role="listitem"] [role="radio"]`,
          platformId: this.platformId,
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        field.isAmbiguous = match.isAmbiguous;
        field.ambiguityReason = match.ambiguityReason;
        fields.push(field);
        continue;
      }

      // 4. Checkbox Group
      const checkboxElements = Array.from(
        container.querySelectorAll('[role="checkbox"], input[type="checkbox"]')
      ) as HTMLElement[];
      if (checkboxElements.length > 0 && !scanRegistry.hasElement(checkboxElements[0])) {
        const fieldId = `gf_checkbox_${idx}`;
        const checkedValues: string[] = [];

        const options = checkboxElements.map((c) => {
          const isChecked = c.getAttribute('aria-checked') === 'true' || (c as HTMLInputElement).checked;
          const val =
            c.getAttribute('data-value') ||
            c.getAttribute('aria-label') ||
            c.closest('label')?.textContent?.trim() ||
            c.textContent?.trim() ||
            '';
          if (isChecked) checkedValues.push(val);
          return {
            label: val,
            value: val,
          };
        });

        scanRegistry.register(fieldId, checkboxElements[0], checkedValues, checkboxElements, {
          fieldType: 'checkbox-group',
          platformId: this.platformId,
          options,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `gf_cb_grp_${idx}`,
          type: 'checkbox-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedValues,
          selector: `[role="listitem"] [role="checkbox"]`,
          platformId: this.platformId,
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        field.isAmbiguous = match.isAmbiguous;
        field.ambiguityReason = match.ambiguityReason;
        fields.push(field);
        continue;
      }

      // 5. Custom Dropdown / Combobox
      const dropdown = container.querySelector(
        '[role="listbox"], [role="combobox"], [aria-haspopup="listbox"], select'
      ) as HTMLElement | null;
      if (dropdown && !scanRegistry.hasElement(dropdown)) {
        const fieldId = `gf_dropdown_${idx}`;
        scanRegistry.register(fieldId, dropdown, dropdown.textContent?.trim() || '', undefined, {
          fieldType: 'custom-select',
          platformId: this.platformId,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `gf_dd_${idx}`,
          type: 'custom-select',
          label: questionText,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: dropdown.textContent?.trim() || '',
          selector: `[role="listitem"] [role="listbox"]`,
          platformId: this.platformId,
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        field.isAmbiguous = match.isAmbiguous;
        field.ambiguityReason = match.ambiguityReason;
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Platform-specific filling handler for Google Forms controls
   */
  async fillControl(
    field: DetectedField,
    value: string | boolean | string[],
    element: HTMLElement,
    groupedElements?: HTMLElement[]
  ): Promise<ControlHandlerResult> {
    if (field.type === 'radio-group' && groupedElements && groupedElements.length > 0) {
      const res = setAriaRadioValue(groupedElements, value as any);
      if (res.success) {
        return {
          status: 'handled',
          verified: true,
          actualValue: res.verifiedValue,
        };
      }
      return {
        status: 'failed',
        reason: `Could not find or select radio option matching "${String(value)}" in Google Forms`,
        interactionStarted: false,
      };
    }

    if (field.type === 'checkbox-group' && groupedElements && groupedElements.length > 0) {
      const res = setAriaCheckboxValue(groupedElements, value as any, false);
      if (res.success) {
        return {
          status: 'handled',
          verified: true,
          actualValue: res.verifiedValues,
        };
      }
      return {
        status: 'failed',
        reason: `Could not find or select checkbox option matching "${String(value)}" in Google Forms`,
        interactionStarted: false,
      };
    }

    // Google forms custom dropdowns (ARIA listbox / combobox)
    if (field.type === 'custom-select' && element) {
      // Step 1: Identify the exact dropdown trigger
      const trigger =
        element.getAttribute('role') === 'listbox' || element.getAttribute('role') === 'combobox'
          ? element
          : (element.querySelector('[role="listbox"], [role="combobox"], [aria-haspopup="listbox"]') as HTMLElement) || element;

      const isAriaDisabled = trigger.getAttribute('aria-disabled') === 'true' || trigger.hasAttribute('disabled');
      if (isAriaDisabled) {
        return {
          status: 'failed',
          reason: 'Google Forms dropdown is disabled',
          interactionStarted: false,
        };
      }

      // Step 2: Open dropdown if not already open
      const isAlreadyExpanded = trigger.getAttribute('aria-expanded') === 'true';
      if (!isAlreadyExpanded) {
        trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        trigger.click();
      }

      // Step 3: Wait for menu options to be present in DOM (bounded wait up to 400ms)
      const popupId = trigger.getAttribute('aria-controls') || trigger.getAttribute('aria-owns');
      const questionContainer = element.closest('[role="listitem"]') || element.parentElement;

      let matchedOption: HTMLElement | undefined;
      const targetStr = String(value).toLowerCase().trim();

      const startTime = Date.now();
      while (Date.now() - startTime < 450) {
        // Collect candidate options from question container, controlled popup, or active document menu
        let candidateOptions: HTMLElement[] = [];
        if (questionContainer) {
          const qOpts = Array.from(questionContainer.querySelectorAll('[role="option"]')) as HTMLElement[];
          if (qOpts.length > 0) candidateOptions.push(...qOpts);
        }
        if (popupId) {
          const controlled = document.getElementById(popupId);
          if (controlled) {
            const cOpts = Array.from(controlled.querySelectorAll('[role="option"]')) as HTMLElement[];
            if (cOpts.length > 0) candidateOptions.push(...cOpts);
          }
        }
        // Fallback: active popup menu in document
        const docOpts = Array.from(document.querySelectorAll('[role="listbox"] [role="option"], .exportSelectPopup [role="option"], [jsname][role="option"]')) as HTMLElement[];
        if (docOpts.length > 0) candidateOptions.push(...docOpts);

        // Deduplicate
        const uniqueOptions = Array.from(new Set(candidateOptions));

        matchedOption = uniqueOptions.find((opt) => {
          const optText = (opt.textContent || '').toLowerCase().trim();
          const optVal = (opt.getAttribute('data-value') || '').toLowerCase().trim();
          return optText === targetStr || optVal === targetStr;
        });

        if (!matchedOption) {
          matchedOption = uniqueOptions.find((opt) => {
            const optText = (opt.textContent || '').toLowerCase().trim();
            return optText.includes(targetStr) || targetStr.includes(optText);
          });
        }

        if (matchedOption) break;
        await new Promise((r) => setTimeout(r, 40));
      }

      if (matchedOption) {
        matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        matchedOption.click();
        matchedOption.dispatchEvent(new Event('change', { bubbles: true }));

        // Wait for selection state to settle
        await new Promise((r) => setTimeout(r, 60));
        const selectedText = trigger.textContent?.trim() || matchedOption.textContent?.trim() || '';

        return {
          status: 'handled',
          verified: true,
          actualValue: selectedText,
        };
      }

      return {
        status: 'failed',
        reason: `Option matching "${String(value)}" not found in Google Forms dropdown menu`,
        interactionStarted: true,
      };
    }

    return { status: 'not_applicable' };
  }
}
