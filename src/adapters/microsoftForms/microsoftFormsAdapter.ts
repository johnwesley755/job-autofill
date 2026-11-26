import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';

export class MicrosoftFormsAdapter implements FormAdapter {
  platformId = 'microsoft_forms';
  platformName = 'Microsoft Forms';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('forms.office.com') ||
      url.includes('forms.microsoft.com') ||
      document.querySelector('[data-automation-id="questionItem"]') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const questionItems = document.querySelectorAll('[data-automation-id="questionItem"]');

    let idx = 0;
    questionItems.forEach((item) => {
      idx++;
      const titleEl = item.querySelector('[data-automation-id="questionTitle"]');
      const questionText = titleEl?.textContent?.replace(/\s*\*\s*$/, '').trim() || '';

      if (!questionText) return;

      const isRequired = item.querySelector('[aria-required="true"], .required-star') !== null;

      // Text input / textarea
      const textControl = item.querySelector('input[type="text"], textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (textControl) {
        const fieldId = `msf_text_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, textControl, textControl.value || '');

        const field: DetectedField = {
          id: fieldId,
          name: textControl.name || `msf_${idx}`,
          type: textControl.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
          label: questionText,
          placeholder: textControl.placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: textControl.disabled,
          isReadOnly: textControl.readOnly,
          currentValue: textControl.value || '',
          selector: `[data-automation-id="questionItem"]:nth-of-type(${idx}) input, textarea`,
          scanSessionId: sessionId,
          confidenceScore: 0,
          confidenceTier: 'low',
        };

        const match = matchFieldToProfile(field);
        field.mappedProfileKey = match.canonicalKey;
        field.confidenceScore = match.confidenceScore;
        field.confidenceTier = match.confidenceTier;
        fields.push(field);
        return;
      }

      // Choice / Radio
      const radioInputs = item.querySelectorAll('input[type="radio"], [role="radio"]');
      if (radioInputs.length > 0) {
        const fieldId = `msf_radio_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, radioInputs[0] as HTMLElement, '', Array.from(radioInputs) as HTMLElement[]);

        const options = Array.from(radioInputs).map((r) => {
          const labelEl = r.closest('label') || r.parentElement;
          return {
            value: (r as HTMLInputElement).value || labelEl?.textContent?.trim() || '',
            label: labelEl?.textContent?.trim() || '',
          };
        });

        const field: DetectedField = {
          id: fieldId,
          name: `msf_radio_${idx}`,
          type: 'radio-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          selector: `[data-automation-id="questionItem"]:nth-of-type(${idx}) input[type="radio"]`,
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
