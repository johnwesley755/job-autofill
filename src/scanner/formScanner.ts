import { DetectedField, FormScanSummary, FieldOption } from './types';
import { classifyInputElement, isElementVisible, extractSelectOptions } from './classifier';
import { extractFieldLabelDetails, extractSectionContext } from './labelExtractor';
import { matchFieldToProfile } from '../intelligence/matcher';

export class UniversalFormScanner {
  private document: Document;

  constructor(doc: Document = window.document) {
    this.document = doc;
  }

  /**
   * Scans the document for interactive form controls, grouping radio/checkbox options
   * and constructing robust, stable selectors.
   */
  public scan(): FormScanSummary {
    const rawElements = Array.from(
      this.document.querySelectorAll(
        'input, select, textarea, [role="combobox"], [aria-haspopup="listbox"]'
      )
    ) as HTMLElement[];

    const detectedFields: DetectedField[] = [];
    // Tracking grouped inputs (radios by form/name and checkboxes by fieldset/group)
    const radioGroups = new Map<string, { elements: HTMLInputElement[]; sectionContext: string; label: string; isRequired: boolean }>();
    const processedElements = new Set<HTMLElement>();

    // Pass 1: Identify and group radio buttons by form context and name
    rawElements.forEach((el) => {
      if (el.tagName.toLowerCase() === 'input' && (el.getAttribute('type') || '').toLowerCase() === 'radio') {
        const radio = el as HTMLInputElement;
        const name = radio.name || 'unnamed-radio';
        const formId = radio.form?.id || radio.closest('form')?.getAttribute('name') || 'root';
        const groupKey = `${formId}:::${name}`;

        if (!radioGroups.has(groupKey)) {
          const sectionContext = extractSectionContext(radio);
          // Label for radio group often comes from legend or parent question header
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
        return { label: optLabel, value: r.value };
      });

      const selector = name
        ? `input[type="radio"][name="${CSS.escape(name)}"]`
        : `input[type="radio"]:nth-of-type(${radioIndex + 1})`;

      const field: DetectedField = {
        id: `radio-group-${radioIndex}-${name || 'anon'}-${Date.now()}`,
        name,
        type: 'radio-group',
        label: group.label || name || 'Radio Option',
        isRequired: group.isRequired,
        isDisabled: group.elements.every((r) => r.disabled),
        isVisible: true,
        options,
        sectionContext: group.sectionContext,
        selector,
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

      detectedFields.push(field);
      radioIndex++;
    });

    // Pass 2: Process individual inputs, checkboxes, selects, textareas, and comboboxes
    rawElements.forEach((htmlEl, index) => {
      if (processedElements.has(htmlEl)) return;

      const type = classifyInputElement(htmlEl);
      // Ignore unknown, non-interactive, and password fields (passwords must never be auto-filled from candidate profiles)
      if (type === 'unknown' || type === 'password') return;

      const visible = isElementVisible(htmlEl);
      if (!visible) return;

      const isDisabled =
        htmlEl.hasAttribute('disabled') ||
        htmlEl.getAttribute('aria-disabled') === 'true' ||
        (htmlEl as HTMLInputElement).disabled;

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

      // Generate reliable, stable selector
      const selector = this.computeStableSelector(htmlEl, index);

      const field: DetectedField = {
        id: `field-${index}-${elementId || name || 'input'}-${Date.now()}`,
        elementId,
        name,
        type,
        label: labelDetails.label,
        placeholder,
        ariaLabel,
        autocomplete,
        isRequired,
        isDisabled,
        isVisible: true,
        sectionContext,
        selector,
        automationId,
        testId,
        formId,
      };

      if (type === 'select') {
        field.options = extractSelectOptions(htmlEl as HTMLSelectElement);
      }

      // Match field semantically
      const match = matchFieldToProfile(field);
      field.mappedProfileKey = match.canonicalKey;
      field.confidenceScore = match.confidenceScore;
      field.confidenceTier = match.confidenceTier;
      field.isAmbiguous = match.isAmbiguous;
      field.ambiguityReason = match.ambiguityReason;

      detectedFields.push(field);
    });

    return {
      url: this.document.location ? this.document.location.href : '',
      domain: this.document.location ? this.document.location.hostname : '',
      totalControls: rawElements.length,
      fields: detectedFields,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a stable selector avoiding fragile nth-of-type where unique attributes exist.
   */
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

    return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
  }
}
