/**
 * Specialized handler for checkbox elements and checkbox multi-select groups.
 */
export function setCheckboxValue(
  checkboxes: HTMLInputElement[],
  targetValue: boolean | string | string[],
  explicitOverwrite = false
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

    if (box.checked === shouldCheck) {
      return true; // Already in desired state
    }

    // If box was already checked and we're asked to uncheck without explicit overwrite approval
    if (box.checked && !shouldCheck && !explicitOverwrite) {
      // In standalone checkbox, unchecking an already-checked box without explicit overwrite is prohibited;
      // return false if overwrite not granted.
      // But if box is already unchecked, it's already in desired state (success).
      return false;
    }

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

  for (const box of checkboxes) {
    if (box.disabled) continue;

    const val = box.value.trim().toLowerCase();
    let label = (box.closest('label')?.textContent || '').trim().toLowerCase();
    if (!label && box.id) {
      const explicitLabel = box.ownerDocument.querySelector(`label[for="${CSS.escape(box.id)}"]`);
      if (explicitLabel) {
        label = (explicitLabel.textContent || '').trim().toLowerCase();
      }
    }

    // Deterministic match only (avoid ambiguous partial substring matches)
    const shouldBeChecked = targets.some((t) => val === t || label === t);
    
    if (shouldBeChecked && !box.checked) {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
      if (descriptor && descriptor.set) {
        descriptor.set.call(box, true);
      } else {
        box.checked = true;
      }
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (!shouldBeChecked && box.checked && explicitOverwrite) {
      // Only uncheck existing selection if explicit overwrite was approved
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
      if (descriptor && descriptor.set) {
        descriptor.set.call(box, false);
      } else {
        box.checked = false;
      }
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Verify final selection state: all enabled target boxes must now be checked
  const allTargetsSatisfied = checkboxes.every((box) => {
    if (box.disabled) return true;
    const val = box.value.trim().toLowerCase();
    const label = (box.closest('label')?.textContent || '').trim().toLowerCase();
    const isTarget = targets.some((t) => val === t || label === t);
    return isTarget ? box.checked : true;
  });

  return allTargetsSatisfied;
}
