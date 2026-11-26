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
      case 'password':
        return 'password';
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
        // Do not blindly treat unknown types as text; if it's not a recognized input, return unknown
        return 'unknown';
    }
  }

  // Detect custom ARIA dropdown comboboxes & Workday / Ashby custom selects
  if (
    element.getAttribute('role') === 'combobox' ||
    element.getAttribute('aria-haspopup') === 'listbox' ||
    element.getAttribute('data-automation-id')?.toLowerCase().includes('select') ||
    element.classList.contains('select2-selection') ||
    element.classList.contains('chosen-single')
  ) {
    return 'custom-select';
  }

  return 'unknown';
}

/**
 * Checks if an element and all its ancestor containers are visually displayed.
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (element.getAttribute('type') === 'hidden') return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  // Check element and all ancestors for visibility
  let curr: HTMLElement | null = element;
  while (curr && curr !== element.ownerDocument.body) {
    if (curr.hidden || curr.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    if (typeof window !== 'undefined' && curr.ownerDocument.defaultView) {
      const style = curr.ownerDocument.defaultView.getComputedStyle(curr);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        style.visibility === 'collapse'
      ) {
        return false;
      }
    }
    curr = curr.parentElement;
  }

  // Check bounding rect if available in full browser layout
  if (typeof window !== 'undefined' && element.ownerDocument.defaultView) {
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
