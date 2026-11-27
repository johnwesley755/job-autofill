/**
 * Generic handler for custom comboboxes, ARIA dropdowns, listboxes, and custom select controls.
 * Supports ARIA combobox pattern, expanding options, finding matched items, and clicking options.
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
      : container.querySelector('[role="combobox"], [aria-haspopup="listbox"], button') as HTMLElement || container;

  // Step 1: Open the dropdown
  comboboxTrigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  comboboxTrigger.click();

  // Brief pause for option list to render/animate into DOM
  await new Promise((r) => setTimeout(r, 60));

  // Step 2: Search for options in the popup, within container, or document root
  const popupId = comboboxTrigger.getAttribute('aria-controls') || comboboxTrigger.getAttribute('aria-owns');
  let optionContainer: HTMLElement | Document = document;
  if (popupId) {
    const controlled = document.getElementById(popupId);
    if (controlled) optionContainer = controlled;
  }

  const options = Array.from(
    optionContainer.querySelectorAll('[role="option"], .select2-results__option, .ng-option, [data-value]')
  ) as HTMLElement[];

  let matchedOption = options.find((opt) => {
    const val = (opt.getAttribute('data-value') || opt.textContent || '').trim().toLowerCase();
    return val === normalizedTarget;
  });

  if (!matchedOption) {
    matchedOption = options.find((opt) => {
      const val = (opt.getAttribute('data-value') || opt.textContent || '').trim().toLowerCase();
      return val.includes(normalizedTarget) || normalizedTarget.includes(val);
    });
  }

  if (matchedOption) {
    matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    matchedOption.click();
    matchedOption.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}
