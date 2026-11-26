import { DetectedField, FormScanSummary } from './types';
import { classifyInputElement, isElementVisible, extractSelectOptions } from './classifier';
import { extractFieldLabel, extractSectionContext } from './labelExtractor';
import { matchFieldToProfile } from '../intelligence/matcher';

export class UniversalFormScanner {
  private document: Document;

  constructor(doc: Document = window.document) {
    this.document = doc;
  }

  /**
   * Scans the document for interactive form controls, ignoring hidden/irrelevant nodes.
   */
  public scan(): FormScanSummary {
    const rawElements = this.document.querySelectorAll(
      'input, select, textarea, [role="combobox"], [aria-haspopup="listbox"]'
    );

    const detectedFields: DetectedField[] = [];

    rawElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const type = classifyInputElement(htmlEl);

      // Skip non-interactive or internal buttons
      if (type === 'unknown') return;

      const visible = isElementVisible(htmlEl);
      if (!visible) return;

      const isDisabled =
        htmlEl.hasAttribute('disabled') ||
        htmlEl.getAttribute('aria-disabled') === 'true' ||
        (htmlEl as HTMLInputElement).disabled;

      // Extract label and context
      const label = extractFieldLabel(htmlEl);
      const sectionContext = extractSectionContext(htmlEl);
      const isRequired =
        htmlEl.hasAttribute('required') ||
        htmlEl.getAttribute('aria-required') === 'true' ||
        label.includes('*');

      const placeholder = htmlEl.getAttribute('placeholder') || undefined;
      const ariaLabel = htmlEl.getAttribute('aria-label') || undefined;
      const autocomplete = htmlEl.getAttribute('autocomplete') || undefined;
      const name = htmlEl.getAttribute('name') || undefined;
      const elementId = htmlEl.id || undefined;

      // Generate selector
      const selector = this.computeSelector(htmlEl, index);

      const field: DetectedField = {
        id: `field-${index}-${Date.now()}`,
        elementId,
        name,
        type,
        label,
        placeholder,
        ariaLabel,
        autocomplete,
        isRequired,
        isDisabled,
        isVisible: true,
        sectionContext,
        selector,
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

  private computeSelector(el: HTMLElement, index: number): string {
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }
    const name = el.getAttribute('name');
    if (name) {
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }
    return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
  }
}
