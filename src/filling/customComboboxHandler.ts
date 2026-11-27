/**
 * Generic handler for custom comboboxes, ARIA dropdowns, listboxes, and custom select controls.
 * Supports ARIA combobox pattern, expanding options, finding matched items, and clicking options.
 * Incorporates bounded option waiting and keyboard interaction fallback.
 */

export async function setCustomComboboxValue(
  container: HTMLElement,
  targetValue: string | number | boolean
): Promise<boolean> {
  if (container.getAttribute('aria-disabled') === 'true' || container.hasAttribute('disabled')) {
    return false;
  }

  const normalizedTarget = String(targetValue).trim().toLowerCase();

  // If container is an input inside a combobox or has combobox role
  const comboboxTrigger =
    container.getAttribute('role') === 'combobox'
      ? container
      : (container.querySelector('[role="combobox"], [aria-haspopup="listbox"], button') as HTMLElement) || container;

  // Step 1: Open the dropdown only if not already open
  const isExpanded = comboboxTrigger.getAttribute('aria-expanded') === 'true';
  if (!isExpanded) {
    comboboxTrigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    comboboxTrigger.click();
  }

  // Step 2: Bounded wait for options list to render into DOM (up to 400ms)
  const popupId = comboboxTrigger.getAttribute('aria-controls') || comboboxTrigger.getAttribute('aria-owns');
  let matchedOption: HTMLElement | undefined;

  const startTime = Date.now();
  while (Date.now() - startTime < 400) {
    let optionContainer: HTMLElement | Document = document;
    if (popupId) {
      const controlled = document.getElementById(popupId);
      if (controlled) optionContainer = controlled;
    }

    const options = Array.from(
      optionContainer.querySelectorAll(
        '[role="option"], .select2-results__option, .ng-option, [data-value], .dropdown-item'
      )
    ) as HTMLElement[];

    // 1. Exact match first
    matchedOption = options.find((opt) => {
      const val = (opt.getAttribute('data-value') || opt.textContent || '').trim().toLowerCase();
      return val === normalizedTarget;
    });

    // 2. Normalized prefix / bounded match only if high confidence
    if (!matchedOption) {
      matchedOption = options.find((opt) => {
        const val = (opt.getAttribute('data-value') || opt.textContent || '').trim().toLowerCase();
        return val.startsWith(normalizedTarget) || normalizedTarget.startsWith(val);
      });
    }

    if (matchedOption) break;
    await new Promise((r) => setTimeout(r, 40));
  }

  // Step 3: Select the option
  if (matchedOption) {
    matchedOption.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
    matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    matchedOption.click();
    matchedOption.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Step 4: Keyboard fallback (ArrowDown + Enter) for native/accessible comboboxes
  comboboxTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
  comboboxTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));

  return false;
}
