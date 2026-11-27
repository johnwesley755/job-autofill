/**
 * ARIA Control Handlers
 * Dedicated handlers for custom ARIA controls:
 * - [role="radio"], [role="radiogroup"]
 * - [role="checkbox"], [role="group"]
 * 
 * Never casts HTMLDivElement/HTMLElement to HTMLInputElement.
 * Dispatches realistic mouse and keyboard interaction sequences.
 */

export function setAriaRadioValue(
  elements: HTMLElement[],
  targetValue: string | boolean
): { success: boolean; verifiedValue: string } {
  if (!elements || elements.length === 0) {
    return { success: false, verifiedValue: '' };
  }

  const targetStr = String(targetValue).trim().toLowerCase();
  let matchedElement: HTMLElement | undefined;

  for (const el of elements) {
    const isAriaDisabled = el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
    if (isAriaDisabled) continue;

    const dataVal = (el.getAttribute('data-value') || '').trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    const textContent = (el.textContent || '').trim().toLowerCase();

    // Check exact match
    if (dataVal === targetStr || ariaLabel === targetStr || textContent === targetStr) {
      matchedElement = el;
      break;
    }

    // Handle boolean mappings (e.g. Yes/No, True/False)
    if (typeof targetValue === 'boolean') {
      if (targetValue && ['yes', 'true', '1'].some((v) => dataVal === v || ariaLabel === v || textContent.startsWith(v))) {
        matchedElement = el;
        break;
      }
      if (!targetValue && ['no', 'false', '0'].some((v) => dataVal === v || ariaLabel === v || textContent.startsWith(v))) {
        matchedElement = el;
        break;
      }
    }
  }

  if (!matchedElement) {
    return { success: false, verifiedValue: '' };
  }

  // Realistic click sequence
  const clickable = matchedElement.querySelector('span, div, label') as HTMLElement || matchedElement;
  clickable.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
  clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  clickable.click();
  matchedElement.dispatchEvent(new Event('input', { bubbles: true }));
  matchedElement.dispatchEvent(new Event('change', { bubbles: true }));

  // Read post-interaction state
  const isChecked = matchedElement.getAttribute('aria-checked') === 'true';
  const val = matchedElement.getAttribute('data-value') || matchedElement.getAttribute('aria-label') || matchedElement.textContent?.trim() || '';

  return {
    success: isChecked || (matchedElement as any).checked === true,
    verifiedValue: val,
  };
}

export function setAriaCheckboxValue(
  elements: HTMLElement[],
  targetValue: boolean | string | string[],
  explicitOverwrite = false
): { success: boolean; verifiedValues: string[] } {
  if (!elements || elements.length === 0) {
    return { success: false, verifiedValues: [] };
  }

  const targets = Array.isArray(targetValue)
    ? targetValue.map((v) => String(v).trim().toLowerCase())
    : [String(targetValue).trim().toLowerCase()];

  const checkedValues: string[] = [];
  let anyInteracted = false;

  for (const el of elements) {
    const isAriaDisabled = el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
    if (isAriaDisabled) continue;

    const dataVal = (el.getAttribute('data-value') || '').trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    const textContent = (el.textContent || '').trim().toLowerCase();

    const isCurrentChecked = el.getAttribute('aria-checked') === 'true' || (el as any).checked === true;
    const shouldBeChecked = targets.some((t) => dataVal === t || ariaLabel === t || textContent === t);

    if (isCurrentChecked && !shouldBeChecked && !explicitOverwrite) {
      // Overwrite protection: don't uncheck without explicit overwrite
      if (isCurrentChecked) {
        checkedValues.push(el.getAttribute('data-value') || el.getAttribute('aria-label') || el.textContent?.trim() || '');
      }
      continue;
    }

    if (isCurrentChecked !== shouldBeChecked) {
      const clickable = el.querySelector('span, div, label') as HTMLElement || el;
      clickable.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
      clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      clickable.click();
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      anyInteracted = true;
    }

    if (el.getAttribute('aria-checked') === 'true' || (el as any).checked === true) {
      checkedValues.push(el.getAttribute('data-value') || el.getAttribute('aria-label') || el.textContent?.trim() || '');
    }
  }

  return {
    success: anyInteracted || checkedValues.length > 0,
    verifiedValues: checkedValues,
  };
}
