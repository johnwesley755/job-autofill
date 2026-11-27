import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible, extractSelectOptions } from '../../scanner/classifier';

export class ZohoRecruitAdapter implements FormAdapter {
  platformId = 'zoho_recruit';
  platformName = 'Zoho Recruit';
  version = '2.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('recruit.zoho.com') ||
      url.includes('recruit.zoho.in') ||
      url.includes('zohorecruit.com') ||
      document.querySelector('[data-zcqa="apply_job_form"], form[name="recruit_form"], .zr-application-form') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const fieldRows = Array.from(
      document.querySelectorAll('.form-field, .zr-field-row, [data-field-type], .crm-form-group')
    ) as HTMLElement[];

    let idx = 0;
    for (const row of fieldRows) {
      if (!isElementVisible(row)) continue;

      const labelEl = row.querySelector('label, .field-label, [data-label], .crm-label');
      let labelText = labelEl?.textContent?.replace(/[\n\r\t]+/g, ' ').trim() || '';
      labelText = labelText.replace(/\s*\*\s*$/, '').trim();

      if (!labelText) continue;

      const isRequired = row.querySelector('.required, [required], [aria-required="true"], .mandatory') !== null;
      idx++;

      // 1. Select
      const selectEl = row.querySelector('select') as HTMLSelectElement | null;
      if (selectEl && !scanRegistry.hasElement(selectEl)) {
        const fieldId = `zr_select_${idx}`;
        scanRegistry.register(fieldId, selectEl, selectEl.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: selectEl.name || `zr_sel_${idx}`,
          type: 'select',
          label: labelText,
          options: extractSelectOptions(selectEl),
          isRequired,
          isVisible: true,
          isDisabled: selectEl.disabled,
          isReadOnly: false,
          currentValue: selectEl.value || '',
          selector: selectEl.id ? `#${CSS.escape(selectEl.id)}` : `.zr-field-row select`,
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

      // 2. Text / Textarea
      const input = row.querySelector('input:not([type="hidden"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (input && !scanRegistry.hasElement(input)) {
        const fieldId = `zr_field_${idx}`;
        const tagName = input.tagName.toLowerCase();
        const inputType = (input.getAttribute('type') || '').toLowerCase();
        const type = tagName === 'textarea' ? 'textarea' : inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : 'text';

        scanRegistry.register(fieldId, input, input.value || '', undefined, {
          fieldType: type,
          platformId: this.platformId,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: input.name || `zr_${idx}`,
          type,
          label: labelText,
          placeholder: (input as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: input.disabled,
          isReadOnly: (input as HTMLInputElement).readOnly || false,
          currentValue: input.value || '',
          selector: input.id ? `#${CSS.escape(input.id)}` : `.zr-field-row input, textarea`,
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
