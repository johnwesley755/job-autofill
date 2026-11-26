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
   * Scans the document for interactive form controls, checking platform adapters
   * first, and falling back to universal DOM scanning.
   */
  public scan(): FormScanSummary {
    const sessionId = scanRegistry.createSession();
    this.revision++;

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const adapter = adapterRegistry.findAdapter(currentUrl, this.document);

    if (adapter) {
      const adapterFields = adapter.scanFields(this.document, sessionId);
      if (adapterFields.length > 0) {
        return {
          scanSessionId: sessionId,
          url: currentUrl,
          domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
          totalControls: adapterFields.length,
          fields: adapterFields,
          scannedAt: new Date().toISOString(),
          revision: this.revision,
        };
      }
    }

    const rawElements = Array.from(
      this.document.querySelectorAll(
        'input, select, textarea, [role="combobox"], [aria-haspopup="listbox"]'
      )
    ) as HTMLElement[];

    const detectedFields: DetectedField[] = [];
    const radioGroups = new Map<string, { elements: HTMLInputElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const checkboxGroups = new Map<string, { elements: HTMLInputElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const processedElements = new Set<HTMLElement>();

    // Pass 1: Identify and group radio buttons and multi-choice checkboxes
    rawElements.forEach((el, index) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();

      if (tagName === 'input' && type === 'radio') {
        const radio = el as HTMLInputElement;
        const name = radio.name || `unnamed-radio-${index}`;
        // Use form reference or closest form/container identity to prevent collisions between forms
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
        // Group checkboxes only when they share a fieldset or multi-select container with a common legend/question
        const container = el.closest('fieldset, [data-checkbox-group], [role="group"]');
        if (container) {
          const legend = container.querySelector('legend, [class*="label"], [class*="question"]');
          if (legend && legend.textContent) {
            // Track by exact DOM container element identity using an internal data attribute or WeakMap
            let containerId = container.getAttribute('data-autoapply-cbgroup');
            if (!containerId) {
              containerId = `cbgroup-${index}-${Math.random().toString(36).substring(2, 7)}`;
              container.setAttribute('data-autoapply-cbgroup', containerId);
            }
            const groupKey = `container:::${containerId}`;
            if (!checkboxGroups.has(groupKey)) {
              checkboxGroups.set(groupKey, {
                elements: [],
                sectionContext: extractSectionContext(el),
                label: legend.textContent.replace(/[\n\r\t*]+/g, ' ').replace(/:+\s*$/, '').trim(),
                isRequired: el.hasAttribute('required') || legend.textContent.includes('*'),
              });
            }
            checkboxGroups.get(groupKey)!.elements.push(el as HTMLInputElement);
            processedElements.add(el);
          }
        }
      }
    });

    // Add consolidated radio group representations
    let radioIndex = 0;
    radioGroups.forEach((group) => {
      const visible = group.elements.some((r) => isElementVisible(r));
      if (!visible) return;

      const firstRadio = group.elements[0];
      const name = firstRadio.name || undefined;
      const options: FieldOption[] = group.elements.map((r) => {
        const optLabel = extractFieldLabelDetails(r).label || r.value;
        return { label: optLabel, value: r.value, disabled: r.disabled };
      });

      const checkedRadio = group.elements.find((r) => r.checked);
      const currentValue = checkedRadio ? checkedRadio.value : '';

      const selector = name
        ? `input[type="radio"][name="${CSS.escape(name)}"]`
        : `input[type="radio"]`;

      const fieldId = `radio-group-${radioIndex}-${name || 'anon'}`;
      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        name,
        type: 'radio-group',
        label: group.label || name || 'Radio Option',
        isRequired: group.isRequired,
        isDisabled: group.elements.every((r) => r.disabled),
        isVisible: true,
        options,
        sectionContext: group.sectionContext,
        selector,
        currentValue,
        groupName: name,
        automationId: firstRadio.getAttribute('data-automation-id') || undefined,
        testId: firstRadio.getAttribute('data-testid') || undefined,
        formId: firstRadio.form?.id || undefined,
      };

      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      // Register into memory registry
      scanRegistry.register(fieldId, firstRadio, currentValue, group.elements);
      detectedFields.push(field);
      radioIndex++;
    });

    // Add consolidated checkbox group representations
    let checkboxIndex = 0;
    checkboxGroups.forEach((group) => {
      const visible = group.elements.some((c) => isElementVisible(c));
      if (!visible) return;

      const firstBox = group.elements[0];
      const options: FieldOption[] = group.elements.map((c) => {
        const optLabel = extractFieldLabelDetails(c).label || c.value;
        return { label: optLabel, value: c.value, disabled: c.disabled };
      });

      const checkedValues = group.elements.filter((c) => c.checked).map((c) => c.value);

      const fieldId = `checkbox-group-${checkboxIndex}`;
      const field: DetectedField = {
        id: fieldId,
        scanSessionId: sessionId,
        type: 'checkbox-group',
        label: group.label,
        isRequired: group.isRequired,
        isDisabled: group.elements.every((c) => c.disabled),
        isVisible: true,
        options,
        sectionContext: group.sectionContext,
        selector: `fieldset input[type="checkbox"]`,
        currentValue: checkedValues,
        automationId: firstBox.getAttribute('data-automation-id') || undefined,
        testId: firstBox.getAttribute('data-testid') || undefined,
        formId: firstBox.form?.id || undefined,
      };

      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      scanRegistry.register(fieldId, firstBox, checkedValues, group.elements);
      detectedFields.push(field);
      checkboxIndex++;
    });

    // Pass 2: Process individual inputs, standalone checkboxes, selects, textareas, and comboboxes
    rawElements.forEach((htmlEl, index) => {
      if (processedElements.has(htmlEl)) return;

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
      // Retrieve current DOM value safely
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
      detectedFields.push(field);
    });

    return {
      scanSessionId: sessionId,
      url: this.document.location ? this.document.location.href : '',
      domain: this.document.location ? this.document.location.hostname : '',
      totalControls: rawElements.length,
      fields: detectedFields,
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

    // Use tag name with section or form scoping to avoid global fragile nth-of-type
    const container = el.closest('form, fieldset, section, div[class*="section"]');
    if (container && container.id) {
      return `#${CSS.escape(container.id)} ${el.tagName.toLowerCase()}`;
    }

    return `${el.tagName.toLowerCase()}[data-field-idx="${index}"]`;
  }
}
