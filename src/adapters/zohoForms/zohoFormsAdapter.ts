import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible, extractSelectOptions } from '../../scanner/classifier';

export class ZohoFormsAdapter implements FormAdapter {
  platformId = 'zoho_forms';
  platformName = 'Zoho Forms';
  version = '2.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('forms.zoho.com') ||
      url.includes('forms.zohopublic.com') ||
      url.includes('forms.zohopublic.in') ||
      document.querySelector('form[action*="formPerma"], .zf-templateWidth, .zf-form-middle') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const formRows = Array.from(
      document.querySelectorAll('.zf-tempFrmWrapper, .zf-form-middle li, [elname="zf-templateWidth"] li')
    ) as HTMLElement[];

    let idx = 0;
    for (const row of formRows) {
      if (!isElementVisible(row)) continue;

      const labelEl = row.querySelector('.zf-labelName, label, .zf-flName');
      let questionText = labelEl?.textContent?.replace(/[\n\r\t]+/g, ' ').trim() || '';
      questionText = questionText.replace(/\s*\*\s*$/, '').trim();

      if (!questionText) continue;

      const isRequired = row.querySelector('.zf-important, em, [required]') !== null;
      idx++;

      // 1. Radio choices in Zoho Forms
      const radioInputs = Array.from(
        row.querySelectorAll('input[type="radio"]')
      ) as HTMLInputElement[];
      if (radioInputs.length > 0 && !scanRegistry.hasElement(radioInputs[0])) {
        const fieldId = `zf_radio_${idx}`;
        let checkedVal = '';
        const options = radioInputs.map((r) => {
          const isChecked = r.checked;
          const labelEl = r.closest('label') || r.parentElement;
          const val = r.value || labelEl?.textContent?.trim() || '';
          if (isChecked) checkedVal = val;
          return { label: val, value: val };
        });

        scanRegistry.register(fieldId, radioInputs[0], checkedVal, radioInputs);

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: radioInputs[0].name || `zf_radio_${idx}`,
          type: 'radio-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedVal,
          selector: `.zf-tempFrmWrapper input[type="radio"]`,
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

      // 2. Checkboxes in Zoho Forms
      const checkboxInputs = Array.from(
        row.querySelectorAll('input[type="checkbox"]')
      ) as HTMLInputElement[];
      if (checkboxInputs.length > 0 && !scanRegistry.hasElement(checkboxInputs[0])) {
        const fieldId = `zf_checkbox_${idx}`;
        const checkedValues: string[] = [];
        const options = checkboxInputs.map((cb) => {
          const isChecked = cb.checked;
          const labelEl = cb.closest('label') || cb.parentElement;
          const val = cb.value || labelEl?.textContent?.trim() || '';
          if (isChecked) checkedValues.push(val);
          return { label: val, value: val };
        });

        scanRegistry.register(fieldId, checkboxInputs[0], checkedValues, checkboxInputs);

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: checkboxInputs[0].name || `zf_cb_${idx}`,
          type: 'checkbox-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: checkedValues,
          selector: `.zf-tempFrmWrapper input[type="checkbox"]`,
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

      // 3. Select / Dropdown
      const selectEl = row.querySelector('select') as HTMLSelectElement | null;
      if (selectEl && !scanRegistry.hasElement(selectEl)) {
        const fieldId = `zf_select_${idx}`;
        scanRegistry.register(fieldId, selectEl, selectEl.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: selectEl.name || `zf_sel_${idx}`,
          type: 'select',
          label: questionText,
          options: extractSelectOptions(selectEl),
          isRequired,
          isVisible: true,
          isDisabled: selectEl.disabled,
          isReadOnly: false,
          currentValue: selectEl.value || '',
          selector: selectEl.id ? `#${CSS.escape(selectEl.id)}` : `.zf-tempFrmWrapper select`,
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

      // 4. Text / Email / Phone / Number / Date inputs & Textarea
      const inputEl = row.querySelector('input:not([type="hidden"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (inputEl && !scanRegistry.hasElement(inputEl)) {
        const fieldId = `zf_field_${idx}`;
        const tagName = inputEl.tagName.toLowerCase();
        const inputType = (inputEl.getAttribute('type') || '').toLowerCase();
        const type = tagName === 'textarea' ? 'textarea' : inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : inputType === 'date' ? 'date' : inputType === 'number' ? 'number' : 'text';

        scanRegistry.register(fieldId, inputEl, inputEl.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: inputEl.name || `zf_${idx}`,
          type,
          label: questionText,
          placeholder: (inputEl as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: inputEl.disabled,
          isReadOnly: (inputEl as HTMLInputElement).readOnly || false,
          currentValue: inputEl.value || '',
          selector: inputEl.id ? `#${CSS.escape(inputEl.id)}` : `.zf-tempFrmWrapper input, textarea`,
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
}
