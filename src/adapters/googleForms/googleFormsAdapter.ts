import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';

export class GoogleFormsAdapter implements FormAdapter {
  platformId = 'google_forms';
  platformName = 'Google Forms';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('docs.google.com/forms') ||
      url.includes('forms.gle') ||
      document.querySelector('form[action*="formResponse"], [data-form-view-id]') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];

    const questionContainers = document.querySelectorAll(
      '[role="listitem"], .freebirdFormviewerViewNumberedItemContainer, jsmodel'
    );

    let idx = 0;
    questionContainers.forEach((container) => {
      const titleEl = container.querySelector('[role="heading"], .exportItemTitle, .freebirdFormviewerComponentsQuestionBaseTitle');
      const questionText = titleEl?.textContent?.replace(/\s*\*\s*$/, '').trim() || '';

      if (!questionText) return;

      const isRequired = container.querySelector('[aria-label*="Required"], .requiredAsterisk, [aria-hidden="true"] *') !== null ||
        container.textContent?.includes('*') || false;

      // 1. Text input / textarea
      const textInput = container.querySelector('input[type="text"], input[type="email"], input[type="tel"], textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (textInput) {
        idx++;
        const fieldId = `gf_input_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, textInput, textInput.value || '');

        const field: DetectedField = {
          id: fieldId,
          name: textInput.name || `gf_${idx}`,
          type: textInput.tagName.toLowerCase() === 'textarea' ? 'textarea' : (textInput.type as any) || 'text',
          label: questionText,
          placeholder: textInput.placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: textInput.disabled,
          isReadOnly: textInput.readOnly,
          currentValue: textInput.value || '',
          selector: `[role="listitem"]:nth-of-type(${idx}) input, textarea`,
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

      // 2. Radio group
      const radioGroup = container.querySelectorAll('[role="radio"]');
      if (radioGroup.length > 0) {
        idx++;
        const fieldId = `gf_radio_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, radioGroup[0] as HTMLElement, '', Array.from(radioGroup) as HTMLElement[]);

        const options = Array.from(radioGroup).map((r) => ({
          value: r.getAttribute('data-value') || r.getAttribute('aria-label') || r.textContent?.trim() || '',
          label: r.getAttribute('aria-label') || r.textContent?.trim() || '',
        }));

        const field: DetectedField = {
          id: fieldId,
          name: `gf_radio_${idx}`,
          type: 'radio-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          selector: `[role="listitem"]:nth-of-type(${idx}) [role="radio"]`,
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

      // 3. Checkbox group
      const checkboxGroup = container.querySelectorAll('[role="checkbox"]');
      if (checkboxGroup.length > 0) {
        idx++;
        const fieldId = `gf_cb_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, checkboxGroup[0] as HTMLElement, '', Array.from(checkboxGroup) as HTMLElement[]);

        const options = Array.from(checkboxGroup).map((c) => ({
          value: c.getAttribute('data-value') || c.getAttribute('aria-label') || c.textContent?.trim() || '',
          label: c.getAttribute('aria-label') || c.textContent?.trim() || '',
        }));

        const field: DetectedField = {
          id: fieldId,
          name: `gf_cb_${idx}`,
          type: 'checkbox-group',
          label: questionText,
          options,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          selector: `[role="listitem"]:nth-of-type(${idx}) [role="checkbox"]`,
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
