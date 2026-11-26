import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible } from '../../scanner/classifier';

export class MicrosoftFormsAdapter implements FormAdapter {
  platformId = 'microsoft_forms';
  platformName = 'Microsoft Forms';
  version = '2.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('forms.office.com') ||
      url.includes('forms.microsoft.com') ||
      document.querySelector('[data-automation-id="questionItem"], [data-automation-id="form-page"]') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const questionItems = Array.from(
      document.querySelectorAll('[data-automation-id="questionItem"]')
    ) as HTMLElement[];

    let idx = 0;
    for (const item of questionItems) {
      if (!isElementVisible(item)) continue;

      const titleEl = item.querySelector('[data-automation-id="questionTitle"]');
      let questionText = titleEl?.textContent?.replace(/[\n\r\t]+/g, ' ').trim() || '';
      questionText = questionText.replace(/\s*\*\s*$/, '').trim();

      if (!questionText) continue;

      const isRequired = item.querySelector('[aria-required="true"], .required-star, [data-automation-id="requiredStar"]') !== null;
      idx++;

      // 1. Text input or textarea
      const textControl = item.querySelector('input[type="text"], textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (textControl && !scanRegistry.hasElement(textControl)) {
        const fieldId = `msf_text_${idx}`;
        scanRegistry.register(fieldId, textControl, textControl.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: textControl.name || `msf_${idx}`,
          type: textControl.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
          label: questionText,
          placeholder: textControl.placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: textControl.disabled,
          isReadOnly: textControl.readOnly,
          currentValue: textControl.value || '',
          selector: textControl.id ? `#${CSS.escape(textControl.id)}` : `[data-automation-id="questionItem"] input, textarea`,
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

      // 2. Choice / Radio buttons
      const radioInputs = Array.from(
        item.querySelectorAll('input[type="radio"], [role="radio"]')
      ) as HTMLElement[];
      if (radioInputs.length > 0 && !scanRegistry.hasElement(radioInputs[0])) {
        const fieldId = `msf_radio_${idx}`;
        let checkedVal = '';

        const options = radioInputs.map((r) => {
          const isChecked = (r as HTMLInputElement).checked || r.getAttribute('aria-checked') === 'true';
          const labelEl = r.closest('label') || r.parentElement;
          const val = (r as HTMLInputElement).value || labelEl?.textContent?.trim() || r.getAttribute('aria-label') || '';
          if (isChecked) checkedVal = val;
          return {
            label: val,
            value: val,
          };
        });

        scanRegistry.register(fieldId, radioInputs[0], checkedVal, radioInputs);

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `msf_radio_${idx}`,
          type: 'radio-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedVal,
          selector: `[data-automation-id="questionItem"] input[type="radio"]`,
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

      // 3. Multi-selection checkboxes
      const checkboxInputs = Array.from(
        item.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
      ) as HTMLElement[];
      if (checkboxInputs.length > 0 && !scanRegistry.hasElement(checkboxInputs[0])) {
        const fieldId = `msf_checkbox_${idx}`;
        const checkedValues: string[] = [];

        const options = checkboxInputs.map((cb) => {
          const isChecked = (cb as HTMLInputElement).checked || cb.getAttribute('aria-checked') === 'true';
          const labelEl = cb.closest('label') || cb.parentElement;
          const val = (cb as HTMLInputElement).value || labelEl?.textContent?.trim() || cb.getAttribute('aria-label') || '';
          if (isChecked) checkedValues.push(val);
          return {
            label: val,
            value: val,
          };
        });

        scanRegistry.register(fieldId, checkboxInputs[0], checkedValues, checkboxInputs);

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `msf_checkbox_${idx}`,
          type: 'checkbox-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedValues,
          selector: `[data-automation-id="questionItem"] input[type="checkbox"]`,
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

      // 4. Dropdown
      const dropdown = item.querySelector('[role="combobox"], select, [data-automation-id="dropdownSelect"]') as HTMLElement | null;
      if (dropdown && !scanRegistry.hasElement(dropdown)) {
        const fieldId = `msf_dropdown_${idx}`;
        scanRegistry.register(fieldId, dropdown, dropdown.textContent?.trim() || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `msf_dropdown_${idx}`,
          type: dropdown.tagName.toLowerCase() === 'select' ? 'select' : 'custom-select',
          label: questionText,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: dropdown.textContent?.trim() || '',
          selector: `[data-automation-id="questionItem"] [role="combobox"]`,
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

  async fillControl(
    field: DetectedField,
    value: string | boolean | string[],
    _element: HTMLElement,
    groupedElements?: HTMLElement[]
  ): Promise<boolean> {
    if (field.type === 'radio-group' && groupedElements && groupedElements.length > 0) {
      const targetStr = String(value).toLowerCase().trim();
      const match = groupedElements.find((r) => {
        const labelEl = r.closest('label') || r.parentElement;
        const val = (r as HTMLInputElement).value || labelEl?.textContent?.trim() || r.getAttribute('aria-label') || '';
        return val.toLowerCase().trim() === targetStr;
      });
      if (match) {
        match.click();
        match.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    if (field.type === 'checkbox-group' && groupedElements && groupedElements.length > 0) {
      const targets = Array.isArray(value) ? value.map((v) => String(v).toLowerCase().trim()) : [String(value).toLowerCase().trim()];
      let anyClicked = false;
      for (const cb of groupedElements) {
        const labelEl = cb.closest('label') || cb.parentElement;
        const val = (cb as HTMLInputElement).value || labelEl?.textContent?.trim() || cb.getAttribute('aria-label') || '';
        const isCurrent = (cb as HTMLInputElement).checked || cb.getAttribute('aria-checked') === 'true';
        const shouldBe = targets.includes(val.toLowerCase().trim());
        if (isCurrent !== shouldBe) {
          cb.click();
          anyClicked = true;
        }
      }
      return anyClicked;
    }

    return false;
  }
}
