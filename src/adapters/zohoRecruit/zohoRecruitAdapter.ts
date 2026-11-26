import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';

export class ZohoRecruitAdapter implements FormAdapter {
  platformId = 'zoho_recruit';
  platformName = 'Zoho Recruit';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('recruit.zoho.com') ||
      url.includes('recruit.zoho.in') ||
      url.includes('zohorecruit.com') ||
      document.querySelector('[data-zcqa="apply_job_form"], form[name="recruit_form"]') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const fieldRows = document.querySelectorAll('.form-field, .zr-field-row, [data-field-type]');

    let idx = 0;
    fieldRows.forEach((row) => {
      idx++;
      const labelEl = row.querySelector('label, .field-label, [data-label]');
      const labelText = labelEl?.textContent?.replace(/\s*\*\s*$/, '').trim() || '';

      if (!labelText) return;

      const isRequired = row.querySelector('.required, [required], [aria-required="true"]') !== null;

      const input = row.querySelector('input:not([type="hidden"]), select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (input) {
        const fieldId = `zr_field_${idx}_${Date.now()}`;
        scanRegistry.register(fieldId, input, input.value || '');

        const field: DetectedField = {
          id: fieldId,
          name: input.name || `zr_${idx}`,
          type: input.tagName.toLowerCase() === 'select' ? 'select' : input.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
          label: labelText,
          placeholder: (input as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: input.disabled,
          isReadOnly: (input as HTMLInputElement).readOnly || false,
          currentValue: input.value || '',
          selector: `.form-field:nth-of-type(${idx}) input, select, textarea`,
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
