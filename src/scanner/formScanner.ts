import { DetectedField, FormScanSummary, FieldOption } from './types';
import { classifyInputElement, isElementVisible, extractSelectOptions } from './classifier';
import { extractFieldLabelDetails, extractSectionContext } from './labelExtractor';
import { matchFieldToProfile } from '../intelligence/matcher';
import { scanRegistry } from './elementRegistry';
import { adapterRegistry } from '../adapters/adapterRegistry';

export class UniversalFormScanner {
  private document: Document;
  private revision: number = 1;

  constructor(doc: Document = window.document) {
    this.document = doc;
  }

  /**
   * Scans the document for interactive form controls by:
   * 1. Running platform-specific scanning if an adapter matches.
   * 2. Running generic DOM scanning covering native inputs, ARIA textbox/radiogroup/listbox, and contenteditable.
   * 3. Merging both result sets with DOM element identity deduplication (WeakMap).
   * 4. Preserving platform metadata and session registration.
   */
  public scan(frameId: number = 0): FormScanSummary {
    const sessionId = scanRegistry.createSession();
    this.revision++;

    const currentUrl = typeof window !== 'undefined' && window.location ? window.location.href : '';
    const adapter = adapterRegistry.findAdapter(currentUrl, this.document);

    const mergedFields: DetectedField[] = [];

    // Step 1: Platform-specific scan if matching adapter exists
    if (adapter) {
      const platformFields = adapter.scanFields(this.document, sessionId);
      for (const pf of platformFields) {
        pf.platformId = adapter.platformId;
        pf.frameId = frameId;
        mergedFields.push(pf);
      }
    }

    // Step 2: Generic DOM scanning
    const rawElements = Array.from(
      this.document.querySelectorAll(
        'input, select, textarea, [role="textbox"], [role="combobox"], [role="listbox"], [role="radio"], [role="checkbox"], [contenteditable="true"], [contenteditable=""]'
      )
    ) as HTMLElement[];

    const radioGroups = new Map<string, { elements: HTMLElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const checkboxGroups = new Map<string, { elements: HTMLElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const processedElements = new Set<HTMLElement>();

    // Pass 1: Identify and group radio buttons and multi-choice checkboxes (native & ARIA)
    rawElements.forEach((el, index) => {
      // If already registered by platform adapter, mark processed
      if (scanRegistry.hasElement(el)) {
        processedElements.add(el);
        return;
      }

      const tagName = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const role = el.getAttribute('role') || '';

      if ((tagName === 'input' && type === 'radio') || role === 'radio') {
        const name = (el as HTMLInputElement).name || el.getAttribute('name') || `unnamed-radio-${index}`;
        const form = (el as HTMLInputElement).form || el.closest('form');
        const formKey = form ? (form.id || form.getAttribute('name') || `form-${Array.from(this.document.forms).indexOf(form)}`) : 'no-form';
        const groupContainer = el.closest('fieldset, .form-group, .field, [class*="radio-group"], [role="radiogroup"], .application-question');
        const containerKey = groupContainer ? (groupContainer.id || `grp-${Array.from(this.document.querySelectorAll('[role="radiogroup"], fieldset')).indexOf(groupContainer)}`) : '';
        const groupKey = `${formKey}:::${containerKey || name}`;

        if (!radioGroups.has(groupKey)) {
          const sectionContext = extractSectionContext(el);
          let groupLabel = '';
          let isRequired = (el as HTMLInputElement).required || el.getAttribute('aria-required') === 'true';

          if (groupContainer) {
            const legend = groupContainer.querySelector('legend, [class*="label"], [class*="question"], [role="heading"]');
            if (legend && legend.textContent) {
              groupLabel = legend.textContent.replace(/[\n\r\t*]+/g, ' ').replace(/:+\s*$/, '').trim();
              if (legend.textContent.includes('*')) isRequired = true;
            }
          }
          if (!groupLabel) {
            groupLabel = extractFieldLabelDetails(el).label;
          }

          radioGroups.set(groupKey, {
            elements: [],
            sectionContext,
            label: groupLabel,
            isRequired,
          });
        }

        const group = radioGroups.get(groupKey)!;
        group.elements.push(el);
        if ((el as HTMLInputElement).required) group.isRequired = true;
        processedElements.add(el);
      } else if ((tagName === 'input' && type === 'checkbox') || role === 'checkbox') {
        const container = el.closest('fieldset, [data-checkbox-group], [role="group"]');
        if (container) {
          const legend = container.querySelector('legend, [class*="label"], [class*="question"], [role="heading"]');
          if (legend && legend.textContent) {
            const groupKey = container.id || `cb-grp-${index}`;
            if (!checkboxGroups.has(groupKey)) {
              let isRequired = (el as HTMLInputElement).required || el.getAttribute('aria-required') === 'true';
              let groupLabel = legend.textContent.replace(/[\n\r\t*]+/g, ' ').replace(/:+\s*$/, '').trim();
              if (legend.textContent.includes('*')) isRequired = true;

              checkboxGroups.set(groupKey, {
                elements: [],
                sectionContext: extractSectionContext(el),
                label: groupLabel,
                isRequired,
              });
            }
            checkboxGroups.get(groupKey)!.elements.push(el);
            processedElements.add(el);
          }
        }
      }
    });

    // Register generic radio groups
    let radioIndex = 0;
    radioGroups.forEach((group, groupKey) => {
      if (group.elements.length === 0) return;
      if (group.elements.some((el) => scanRegistry.hasElement(el))) return;

      const firstRadio = group.elements[0];
      const fieldId = `generic-radio-group-${radioIndex}-${(firstRadio as HTMLInputElement).name || 'unnamed'}`;
      let checkedValue = '';

      const options: FieldOption[] = group.elements.map((r, optIdx) => {
        const details = extractFieldLabelDetails(r);
        const isChecked = (r as HTMLInputElement).checked || r.getAttribute('aria-checked') === 'true';
        const optVal = (r as HTMLInputElement).value || r.getAttribute('data-value') || details.label || `opt-${optIdx}`;
        if (isChecked) checkedValue = optVal;
        return {
          label: details.label || optVal || `Option ${optIdx + 1}`,
          value: optVal,
          disabled: (r as HTMLInputElement).disabled || r.getAttribute('aria-disabled') === 'true',
        };
      });

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        frameId,
        name: (firstRadio as HTMLInputElement).name || undefined,
        type: 'radio-group',
        label: group.label,
        isRequired: group.isRequired,
        isDisabled: group.elements.every((r) => (r as HTMLInputElement).disabled || r.getAttribute('aria-disabled') === 'true'),
        isVisible: group.elements.some((r) => isElementVisible(r)),
        options,
        sectionContext: group.sectionContext,
        selector: `[role="radiogroup"] [role="radio"], input[type="radio"]`,
        currentValue: checkedValue,
        groupName: groupKey,
      };

      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      scanRegistry.register(fieldId, firstRadio, checkedValue, group.elements);
      mergedFields.push(field);
      radioIndex++;
    });

    // Register generic checkbox groups
    let checkboxIndex = 0;
    checkboxGroups.forEach((group) => {
      if (group.elements.length === 0) return;
      if (group.elements.some((el) => scanRegistry.hasElement(el))) return;

      const firstBox = group.elements[0];
      const fieldId = `generic-checkbox-group-${checkboxIndex}`;
      const checkedValues: string[] = [];

      const options: FieldOption[] = group.elements.map((cb, optIdx) => {
        const details = extractFieldLabelDetails(cb);
        const isChecked = (cb as HTMLInputElement).checked || cb.getAttribute('aria-checked') === 'true';
        const optVal = (cb as HTMLInputElement).value || cb.getAttribute('data-value') || details.label || `cb-${optIdx}`;
        if (isChecked) checkedValues.push(optVal);
        return {
          label: details.label || optVal || `Option ${optIdx + 1}`,
          value: optVal,
          disabled: (cb as HTMLInputElement).disabled || cb.getAttribute('aria-disabled') === 'true',
        };
      });

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        frameId,
        type: 'checkbox-group',
        label: group.label,
        isRequired: group.isRequired,
        isDisabled: group.elements.every((cb) => (cb as HTMLInputElement).disabled || cb.getAttribute('aria-disabled') === 'true'),
        isVisible: group.elements.some((cb) => isElementVisible(cb)),
        options,
        sectionContext: group.sectionContext,
        selector: `fieldset input[type="checkbox"], [role="group"] [role="checkbox"]`,
        currentValue: checkedValues,
      };

      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      scanRegistry.register(fieldId, firstBox, checkedValues, group.elements);
      mergedFields.push(field);
      checkboxIndex++;
    });

    // Pass 2: Process individual inputs, textareas, selects, ARIA textboxes, and comboboxes
    rawElements.forEach((htmlEl, index) => {
      if (processedElements.has(htmlEl) || scanRegistry.hasElement(htmlEl)) return;

      const type = classifyInputElement(htmlEl);
      if (type === 'unknown' || type === 'password') return;

      const visible = isElementVisible(htmlEl);
      if (!visible) return;

      const isDisabled =
        htmlEl.hasAttribute('disabled') ||
        htmlEl.getAttribute('aria-disabled') === 'true' ||
        (htmlEl as HTMLInputElement).disabled;

      const isReadOnly = htmlEl.hasAttribute('readonly') || (htmlEl as HTMLInputElement).readOnly;

      const labelDetails = extractFieldLabelDetails(htmlEl);
      const sectionContext = extractSectionContext(htmlEl);
      const isRequired =
        htmlEl.hasAttribute('required') ||
        htmlEl.getAttribute('aria-required') === 'true' ||
        labelDetails.hasRequiredIndicator;

      const placeholder = htmlEl.getAttribute('placeholder') || undefined;
      const ariaLabel = htmlEl.getAttribute('aria-label') || undefined;
      const autocomplete = htmlEl.getAttribute('autocomplete') || undefined;
      const name = htmlEl.getAttribute('name') || undefined;
      const elementId = htmlEl.id || undefined;
      const automationId = htmlEl.getAttribute('data-automation-id') || undefined;
      const testId = htmlEl.getAttribute('data-testid') || undefined;
      const formId = (htmlEl as HTMLInputElement).form?.id || htmlEl.closest('form')?.id || undefined;

      const selector = this.computeStableSelector(htmlEl, index);
      const fieldId = `field-${index}-${elementId || name || 'ctrl'}`;

      const tagName = htmlEl.tagName.toLowerCase();
      let currentValue: string | boolean = '';
      if (type === 'checkbox-group') {
        currentValue = (htmlEl as HTMLInputElement).checked || htmlEl.getAttribute('aria-checked') === 'true';
      } else if (type === 'select') {
        currentValue = (htmlEl as HTMLSelectElement).value || '';
      } else if (tagName === 'input' || tagName === 'textarea') {
        currentValue = (htmlEl as HTMLInputElement).value || '';
      } else if (htmlEl.isContentEditable) {
        currentValue = htmlEl.innerText?.trim() || htmlEl.textContent?.trim() || '';
      } else {
        currentValue = htmlEl.textContent?.trim() || '';
      }

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        frameId,
        elementId,
        name,
        type,
        label: labelDetails.label,
        placeholder,
        ariaLabel,
        autocomplete,
        isRequired,
        isDisabled,
        isReadOnly,
        isVisible: true,
        sectionContext,
        selector,
        currentValue,
        automationId,
        testId,
        formId,
      };

      if (type === 'select') {
        field.options = extractSelectOptions(htmlEl as HTMLSelectElement);
      }

      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      scanRegistry.register(fieldId, htmlEl, currentValue);
      mergedFields.push(field);
    });

    return {
      scanSessionId: sessionId,
      frameId,
      url: currentUrl,
      domain: typeof window !== 'undefined' && window.location ? window.location.hostname : '',
      platformId: adapter?.platformId,
      totalControls: mergedFields.length,
      fields: mergedFields,
      scannedAt: new Date().toISOString(),
      revision: this.revision,
    };
  }

  private computeStableSelector(el: HTMLElement, index: number): string {
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    const autoId = el.getAttribute('data-automation-id');
    if (autoId) {
      return `[data-automation-id="${CSS.escape(autoId)}"]`;
    }

    const testId = el.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }

    const name = el.getAttribute('name');
    if (name) {
      const form = (el as HTMLInputElement).form || el.closest('form');
      if (form && form.id) {
        return `#${CSS.escape(form.id)} [name="${CSS.escape(name)}"]`;
      }
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }

    const autocomplete = el.getAttribute('autocomplete');
    if (autocomplete && autocomplete !== 'off') {
      return `${el.tagName.toLowerCase()}[autocomplete="${CSS.escape(autocomplete)}"]`;
    }

    const container = el.closest('form, fieldset, section, div[class*="section"]');
    if (container && container.id) {
      return `#${CSS.escape(container.id)} ${el.tagName.toLowerCase()}`;
    }

    return `${el.tagName.toLowerCase()}[data-field-idx="${index}"]`;
  }
}
