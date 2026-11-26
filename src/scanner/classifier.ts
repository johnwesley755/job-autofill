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
 * Checks if an element and all its ancestor containers are visually displayed and interactive.
 * Handles zero-sized layout detection without failing on Happy DOM / mock test environments.
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (element.getAttribute('type') === 'hidden') return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  // Check inline styles and parent tree for explicit hidden rules
  let curr: HTMLElement | null = element;
  while (curr && curr !== element.ownerDocument.body && curr !== element.ownerDocument.documentElement) {
    if (curr.hidden || curr.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    // Check inline style first
    if (
      curr.style.display === 'none' ||
      curr.style.visibility === 'hidden' ||
      curr.style.opacity === '0' ||
      curr.style.visibility === 'collapse'
    ) {
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

  // In full browser with layout engine, inspect geometry
  if (typeof window !== 'undefined' && element.ownerDocument.defaultView) {
    if (element.isConnected === false) return false;

    // If element has offsetParent === null and is not fixed position, it is detached or hidden
    if (element.offsetParent === null && element.tagName.toLowerCase() !== 'body') {
      const style = element.ownerDocument.defaultView.getComputedStyle(element);
      if (style.position !== 'fixed') {
        const rect = element.getBoundingClientRect();
        if (rect && rect.width === 0 && rect.height === 0 && (rect.top !== 0 || rect.left !== 0)) {
          return false;
        }
      }
    } else if (typeof element.offsetParent === 'object' && element.offsetParent !== null) {
      // In a real browser with layout engine, offsetParent is an HTMLElement. Check for zero-sized elements.
      const rect = element.getBoundingClientRect();
      if (rect && rect.width === 0 && rect.height === 0) {
        return false;
      }
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
    if (val === '' && (txt.toLowerCase().includes('select') || txt.toLowerCase().includes('choose'))) {
      continue;
    }
    options.push({
      label: txt,
      value: val,
      disabled: opt.disabled,
    });
  }
  return options;
}
