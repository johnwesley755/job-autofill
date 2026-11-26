/**
 * Specialized handler for checkbox elements and checkbox multi-select groups.
 */
export function setCheckboxValue(
  checkboxes: HTMLInputElement[],
  targetValue: boolean | string | string[]
): boolean {
  if (!checkboxes || checkboxes.length === 0) return false;

  // Single standalone checkbox
  if (checkboxes.length === 1) {
    const box = checkboxes[0];
    if (box.disabled) return false;

    const shouldCheck =
      typeof targetValue === 'boolean'
        ? targetValue
        : ['true', 'yes', '1'].includes(String(targetValue).toLowerCase().trim());

    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
    if (descriptor && descriptor.set) {
      descriptor.set.call(box, shouldCheck);
    } else {
      box.checked = shouldCheck;
    }

    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
    return box.checked === shouldCheck;
  }

  // Multi-select checkbox group
  const targets = Array.isArray(targetValue)
    ? targetValue.map((v) => String(v).trim().toLowerCase())
    : [String(targetValue).trim().toLowerCase()];

  let changedAny = false;

  for (const box of checkboxes) {
    if (box.disabled) continue;

    const val = box.value.trim().toLowerCase();
    const label = (box.closest('label')?.textContent || '').trim().toLowerCase();

    const matches = targets.some((t) => val === t || label === t || label.includes(t));
    if (matches && !box.checked) {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
      if (descriptor && descriptor.set) {
        descriptor.set.call(box, true);
      } else {
        box.checked = true;
      }
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
      changedAny = true;
    }
  }

  return changedAny;
}
