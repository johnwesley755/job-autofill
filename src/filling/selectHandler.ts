/**
 * Specialized handler for native <select> elements.
 * Normalizes case, ignores placeholder options, and dispatches change events.
 */
export function setNativeSelectValue(selectElement: HTMLSelectElement, targetValue: string): boolean {
  if (selectElement.disabled) {
    return false;
  }

  const normalizedTarget = targetValue.trim().toLowerCase();
  let matchedIndex = -1;

  for (let i = 0; i < selectElement.options.length; i++) {
    const opt = selectElement.options[i];
    if (opt.disabled) continue;

    const optVal = opt.value.trim().toLowerCase();
    const optTxt = opt.text.trim().toLowerCase();

    // Skip empty / placeholder options
    if (optVal === '' && (optTxt.includes('select') || optTxt.includes('choose'))) {
      continue;
    }

    if (optVal === normalizedTarget || optTxt === normalizedTarget) {
      matchedIndex = i;
      break;
    }
  }

  // If no exact match found, only consider high-confidence clean prefix or bounded match
  if (matchedIndex === -1) {
    for (let i = 0; i < selectElement.options.length; i++) {
      const opt = selectElement.options[i];
      if (opt.disabled) continue;
      const optVal = opt.value.trim().toLowerCase();
      const optTxt = opt.text.trim().toLowerCase();
      if (optVal === '' && (optTxt.includes('select') || optTxt.includes('choose'))) continue;

      if (optTxt.startsWith(normalizedTarget) || normalizedTarget.startsWith(optTxt)) {
        matchedIndex = i;
        break;
      }
    }
  }

  if (matchedIndex === -1) {
    return false; // Leave unmatched options untouched
  }

  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'selectedIndex');
  if (descriptor && descriptor.set) {
    descriptor.set.call(selectElement, matchedIndex);
  } else {
    selectElement.selectedIndex = matchedIndex;
  }

  selectElement.dispatchEvent(new Event('input', { bubbles: true }));
  selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  selectElement.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

  return selectElement.selectedIndex === matchedIndex;
}
