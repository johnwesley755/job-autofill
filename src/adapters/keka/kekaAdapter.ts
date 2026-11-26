import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';

export class KekaAdapter implements FormAdapter {
  platformId = 'keka';
  platformName = 'Keka HR';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('keka.com') ||
      document.querySelector('[data-automation-id*="keka"], .keka-form, app-candidate-application') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const formGroups = document.querySelectorAll('.form-group, .form-item, [class*="form-group"]');

    let idx = 0;
    formGroups.forEach((group) => {
      idx++;
      const labelEl = group.querySelector('label, [class*="label"]');
      const labelText = labelEl?.textContent?.replace(/\s*\*\s*$/, '').trim() || '';

      if (!labelText) return;

      const isRequired = group.querySelector('.text-danger, .asterisk, [required]') !== null;

      const control = group.querySelector('input:not([type="hidden"]), select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (control) {
        const fieldId = `keka_field_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, control, control.value || '');

        const field: DetectedField = {
          id: fieldId,
          name: control.name || `keka_${idx}`,
          type: control.tagName.toLowerCase() === 'select' ? 'select' : control.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
          label: labelText,
          placeholder: (control as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: control.disabled,
          isReadOnly: (control as HTMLInputElement).readOnly || false,
          currentValue: control.value || '',
          selector: `.form-group:nth-of-type(${idx}) input, select, textarea`,
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
