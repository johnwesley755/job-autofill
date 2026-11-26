import { InputClassification, FieldOption } from './types';

/**
 * Classifies a DOM element into a supported standard input category.
 */
export function classifyInputElement(element: Element): InputClassification {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'textarea') {
    return 'textarea';
  }

  if (tagName === 'select') {
    return 'select';
  }

  if (tagName === 'input') {
    const inputType = (element.getAttribute('type') || 'text').toLowerCase();

    switch (inputType) {
      case 'email':
        return 'email';
      case 'tel':
      case 'phone':
        return 'tel';
      case 'number':
        return 'number';
      case 'date':
      case 'datetime-local':
        return 'date';
      case 'file':
        return 'file';
      case 'radio':
        return 'radio-group';
      case 'checkbox':
        return 'checkbox-group';
      case 'text':
      case 'search':
      case 'url':
        return 'text';
      case 'hidden':
      case 'submit':
      case 'button':
      case 'reset':
      case 'image':
        return 'unknown';
      default:
        return 'text';
    }
  }

  // Detect custom ARIA dropdown comboboxes
  if (
    element.getAttribute('role') === 'combobox' ||
    element.getAttribute('aria-haspopup') === 'listbox'
  ) {
    return 'custom-select';
  }

  return 'unknown';
}

/**
 * Checks if an element is visually displayed.
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (element.getAttribute('type') === 'hidden') return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  // In standard browser environment with layout engine:
  if (typeof window !== 'undefined' && element.ownerDocument.defaultView) {
    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    // Only check bounding client rect if layout is rendered (real browser)
    const rect = element.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return true;
    }
  }

  return true;
}

/**
 * Extracts options from native select elements.
 */
export function extractSelectOptions(element: HTMLSelectElement): FieldOption[] {
  const options: FieldOption[] = [];
  for (let i = 0; i < element.options.length; i++) {
    const opt = element.options[i];
    const val = opt.value?.trim() || '';
    const txt = opt.text?.trim() || '';
    // Skip empty dummy placeholding options like "Select an option..."
    if (val === '' && (txt.toLowerCase().includes('select') || txt.toLowerCase().includes('choose'))) {
      continue;
    }
    options.push({ label: txt, value: val });
  }
  return options;
}
