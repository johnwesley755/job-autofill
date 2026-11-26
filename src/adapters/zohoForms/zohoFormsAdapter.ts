import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';

export class ZohoFormsAdapter implements FormAdapter {
  platformId = 'zoho_forms';
  platformName = 'Zoho Forms';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('forms.zoho.com') ||
      url.includes('forms.zohopublic.com') ||
      url.includes('forms.zohopublic.in') ||
      document.querySelector('form[action*="formPerma"], .zf-templateWidth') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const formRows = document.querySelectorAll('.zf-tempFrmWrapper, .zf-form-middle li, [elname="zf-templateWidth"] li');

    let idx = 0;
    formRows.forEach((row) => {
      idx++;
      const labelEl = row.querySelector('.zf-labelName, label');
      const questionText = labelEl?.textContent?.replace(/\s*\*\s*$/, '').trim() || '';

      if (!questionText) return;

      const isRequired = row.querySelector('.zf-important, em') !== null;

      const inputEl = row.querySelector('input:not([type="hidden"]), select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (inputEl) {
        const fieldId = `zf_field_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, inputEl, inputEl.value || '');

        const field: DetectedField = {
          id: fieldId,
          name: inputEl.name || `zf_${idx}`,
          type: inputEl.tagName.toLowerCase() === 'select' ? 'select' : inputEl.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
          label: questionText,
          placeholder: (inputEl as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: inputEl.disabled,
          isReadOnly: (inputEl as HTMLInputElement).readOnly || false,
          currentValue: inputEl.value || '',
          selector: `.zf-tempFrmWrapper:nth-of-type(${idx}) input, select, textarea`,
          scanSessionId: sessionId,
          confidenceScore: 0,
          confidenceTier: 'low',
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        fields.push(field);
      }
    });

    return fields;
  }
}
