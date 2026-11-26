import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible } from '../../scanner/classifier';

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
        scanRegistry.register(fieldId, textInput, textInput.value || '');

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
        scanRegistry.register(fieldId, textarea, textarea.value || '');

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

        scanRegistry.register(fieldId, radioElements[0], checkedVal, radioElements);

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

        scanRegistry.register(fieldId, checkboxElements[0], checkedValues, checkboxElements);

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
        scanRegistry.register(fieldId, dropdown, dropdown.textContent?.trim() || '');

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
  ): Promise<boolean> {
    if (field.type === 'radio-group' && groupedElements && groupedElements.length > 0) {
      const targetStr = String(value).toLowerCase().trim();
      const match = groupedElements.find((r) => {
        const val =
          r.getAttribute('data-value') ||
          r.getAttribute('aria-label') ||
          r.closest('label')?.textContent?.trim() ||
          r.textContent?.trim() ||
          '';
        return val.toLowerCase().trim() === targetStr;
      });

      if (match) {
        match.click();
        match.setAttribute('aria-checked', 'true');
        match.dispatchEvent(new Event('input', { bubbles: true }));
        match.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    if (field.type === 'checkbox-group' && groupedElements && groupedElements.length > 0) {
      const targetVals = Array.isArray(value) ? value.map((v) => String(v).toLowerCase().trim()) : [String(value).toLowerCase().trim()];
      let anyClicked = false;
      for (const cb of groupedElements) {
        const val =
          cb.getAttribute('data-value') ||
          cb.getAttribute('aria-label') ||
          cb.closest('label')?.textContent?.trim() ||
          cb.textContent?.trim() ||
          '';
        const isCurrentChecked = cb.getAttribute('aria-checked') === 'true' || (cb as HTMLInputElement).checked;
        const shouldBeChecked = targetVals.includes(val.toLowerCase().trim());
        if (isCurrentChecked !== shouldBeChecked) {
          cb.click();
          cb.setAttribute('aria-checked', shouldBeChecked ? 'true' : 'false');
          anyClicked = true;
        }
      }
      return anyClicked;
    }

    // Google forms custom dropdowns scoped specifically to this question container
    if (field.type === 'custom-select' && element) {
      element.click();
      await new Promise((r) => setTimeout(r, 60));
      // Look for options inside container or active popup menu
      const questionContainer = element.closest('[role="listitem"]') || element.parentElement;
      const scopedOptions = Array.from(
        (questionContainer?.querySelectorAll('[role="option"]') || document.querySelectorAll('[role="option"]'))
      ) as HTMLElement[];

      const targetStr = String(value).toLowerCase().trim();
      const matchOption = scopedOptions.find((opt) => opt.textContent?.toLowerCase().trim() === targetStr);
      if (matchOption) {
        matchOption.click();
        element.setAttribute('data-value', String(value));
        return true;
      }
      return false;
    }

    return false;
  }
}
