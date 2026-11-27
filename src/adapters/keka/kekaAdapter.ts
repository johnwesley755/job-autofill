import { FormAdapter } from '../types';
import { DetectedField } from '../../scanner/types';
import { scanRegistry } from '../../scanner/elementRegistry';
import { matchFieldToProfile } from '../../intelligence/matcher';
import { isElementVisible, extractSelectOptions } from '../../scanner/classifier';

export class KekaAdapter implements FormAdapter {
  platformId = 'keka';
  platformName = 'Keka HR';
  version = '2.0.0';

  canHandle(url: string, document: Document): boolean {
    return (
      url.includes('keka.com') ||
      document.querySelector('[data-automation-id*="keka"], .keka-form, app-candidate-application, .keka-apply-container') !== null
    );
  }

  scanFields(document: Document, sessionId: string): DetectedField[] {
    const fields: DetectedField[] = [];
    const formGroups = Array.from(
      document.querySelectorAll('.form-group, .form-item, [class*="form-group"], .k-form-field')
    ) as HTMLElement[];

    let idx = 0;
    for (const group of formGroups) {
      if (!isElementVisible(group)) continue;

      const labelEl = group.querySelector('label, [class*="label"], .control-label');
      let labelText = labelEl?.textContent?.replace(/[\n\r\t]+/g, ' ').trim() || '';
      labelText = labelText.replace(/\s*\*\s*$/, '').trim();

      if (!labelText) continue;

      const isRequired = group.querySelector('.text-danger, .asterisk, [required], .mandatory') !== null;
      idx++;

      // 1. Select / Custom React Select
      const select = group.querySelector('select') as HTMLSelectElement | null;
      if (select && !scanRegistry.hasElement(select)) {
        const fieldId = `keka_select_${idx}`;
        scanRegistry.register(fieldId, select, select.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: select.name || `keka_sel_${idx}`,
          type: 'select',
          label: labelText,
          options: extractSelectOptions(select),
          isRequired,
          isVisible: true,
          isDisabled: select.disabled,
          isReadOnly: false,
          currentValue: select.value || '',
          selector: select.id ? `#${CSS.escape(select.id)}` : `.form-group select`,
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

      // 2. Custom Dropdown / Autocomplete container (React/Angular)
      const customSelect = group.querySelector('[role="combobox"], .ng-select, .select2-container') as HTMLElement | null;
      if (customSelect && !scanRegistry.hasElement(customSelect)) {
        const fieldId = `keka_cselect_${idx}`;
        scanRegistry.register(fieldId, customSelect, customSelect.textContent?.trim() || '', undefined, {
          fieldType: 'custom-select',
          platformId: this.platformId,
        });

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: `keka_csel_${idx}`,
          type: 'custom-select',
          label: labelText,
          isRequired,
          isVisible: true,
          isDisabled: false,
          isReadOnly: false,
          currentValue: customSelect.textContent?.trim() || '',
          selector: `.form-group [role="combobox"]`,
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

      // 3. Text / Textarea
      const control = group.querySelector('input:not([type="hidden"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (control && !scanRegistry.hasElement(control)) {
        const fieldId = `keka_field_${idx}`;
        const tagName = control.tagName.toLowerCase();
        const inputType = (control.getAttribute('type') || '').toLowerCase();
        const type = tagName === 'textarea' ? 'textarea' : inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : inputType === 'date' ? 'date' : 'text';

        scanRegistry.register(fieldId, control, control.value || '');

        const field: DetectedField = {
          id: fieldId,
          scanSessionId: sessionId,
          name: control.name || `keka_${idx}`,
          type,
          label: labelText,
          placeholder: (control as HTMLInputElement).placeholder || '',
          isRequired,
          isVisible: true,
          isDisabled: control.disabled,
          isReadOnly: (control as HTMLInputElement).readOnly || false,
          currentValue: control.value || '',
          selector: control.id ? `#${CSS.escape(control.id)}` : `.form-group input, textarea`,
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
