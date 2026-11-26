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
   * 2. Running generic DOM scanning.
   * 3. Merging both result sets with DOM element identity deduplication (WeakMap).
   * 4. Preserving platform metadata and session registration.
   */
  public scan(): FormScanSummary {
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
        mergedFields.push(pf);
      }
    }

    // Step 2: Generic DOM scanning
    const rawElements = Array.from(
      this.document.querySelectorAll(
        'input, select, textarea, [role="combobox"], [aria-haspopup="listbox"]'
      )
    ) as HTMLElement[];

    const radioGroups = new Map<string, { elements: HTMLInputElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const checkboxGroups = new Map<string, { elements: HTMLInputElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const processedElements = new Set<HTMLElement>();

    // Pass 1: Identify and group radio buttons and multi-choice checkboxes
    rawElements.forEach((el, index) => {
      // If already registered by platform adapter, mark processed
      if (scanRegistry.hasElement(el)) {
        processedElements.add(el);
        return;
      }

      const tagName = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();

      if (tagName === 'input' && type === 'radio') {
        const radio = el as HTMLInputElement;
        const name = radio.name || `unnamed-radio-${index}`;
        const formKey = radio.form ? (radio.form.id || radio.form.getAttribute('name') || `form-${Array.from(this.document.forms).indexOf(radio.form)}`) : 'no-form';
        const groupKey = `${formKey}:::${name}`;

        if (!radioGroups.has(groupKey)) {
          const sectionContext = extractSectionContext(radio);
          const groupContainer = radio.closest('fieldset, .form-group, .field, [class*="radio-group"], .application-question');
          let groupLabel = '';
          let isRequired = radio.required || radio.getAttribute('aria-required') === 'true';

          if (groupContainer) {
            const legend = groupContainer.querySelector('legend, [class*="label"], [class*="question"]');
            if (legend && legend.textContent) {
              groupLabel = legend.textContent.replace(/[\n\r\t*]+/g, ' ').replace(/:+\s*$/, '').trim();
              if (legend.textContent.includes('*')) isRequired = true;
            }
          }
          if (!groupLabel) {
            groupLabel = extractFieldLabelDetails(radio).label;
          }

          radioGroups.set(groupKey, {
            elements: [],
            sectionContext,
            label: groupLabel,
            isRequired,
          });
        }

        const group = radioGroups.get(groupKey)!;
        group.elements.push(radio);
        if (radio.required) group.isRequired = true;
        processedElements.add(radio);
      } else if (tagName === 'input' && type === 'checkbox') {
        const container = el.closest('fieldset, [data-checkbox-group], [role="group"]');
        if (container) {
          const legend = container.querySelector('legend, [class*="label"], [class*="question"]');
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
            checkboxGroups.get(groupKey)!.elements.push(el as HTMLInputElement);
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
      const fieldId = `generic-radio-group-${radioIndex}-${firstRadio.name || 'unnamed'}`;
      let checkedValue = '';

      const options: FieldOption[] = group.elements.map((r, optIdx) => {
        const details = extractFieldLabelDetails(r);
        const optVal = r.value || details.label || `opt-${optIdx}`;
        if (r.checked) checkedValue = optVal;
        return {
          label: details.label || r.value || `Option ${optIdx + 1}`,
          value: optVal,
          disabled: r.disabled,
        };
      });

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        name: firstRadio.name,
        type: 'radio-group',
        label: group.label,
        isRequired: group.isRequired,
        isDisabled: group.elements.every((r) => r.disabled),
        isVisible: group.elements.some((r) => isElementVisible(r)),
        options,
        sectionContext: group.sectionContext,
        selector: `input[type="radio"][name="${CSS.escape(firstRadio.name)}"]`,
        currentValue: checkedValue,
        groupName: groupKey,
        formId: firstRadio.form?.id,
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
        const optVal = cb.value || details.label || `cb-${optIdx}`;
        if (cb.checked) checkedValues.push(optVal);
        return {
          label: details.label || cb.value || `Option ${optIdx + 1}`,
          value: optVal,
          disabled: cb.disabled,
        };
      });

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        type: 'checkbox-group',
        label: group.label,
        isRequired: group.isRequired,
        isDisabled: group.elements.every((cb) => cb.disabled),
        isVisible: group.elements.some((cb) => isElementVisible(cb)),
        options,
        sectionContext: group.sectionContext,
        selector: `fieldset input[type="checkbox"]`,
        currentValue: checkedValues,
        formId: firstBox.form?.id,
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

    // Pass 2: Process individual inputs, standalone checkboxes, selects, textareas, and comboboxes
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
        currentValue = (htmlEl as HTMLInputElement).checked;
      } else if (type === 'select') {
        currentValue = (htmlEl as HTMLSelectElement).value || '';
      } else if (tagName === 'input' || tagName === 'textarea') {
        currentValue = (htmlEl as HTMLInputElement).value || '';
      }

      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
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
