/**
 * Specialized handler for radio button groups.
 * Selects the matching option and dispatches change/input events safely.
 */
export function setRadioGroupValue(radios: HTMLInputElement[], targetValue: string | boolean): boolean {
  if (!radios || radios.length === 0) return false;

  const targetStr = String(targetValue).trim().toLowerCase();

  let targetRadio: HTMLInputElement | undefined;

  for (const radio of radios) {
    if (radio.disabled) continue;

    const val = radio.value.trim().toLowerCase();
    const label = (radio.closest('label')?.textContent || '').trim().toLowerCase();

    if (val === targetStr || label === targetStr) {
      targetRadio = radio;
      break;
    }

    // Handle boolean mappings (e.g. Yes/No, True/False)
    if (typeof targetValue === 'boolean') {
      if (targetValue && (val === 'yes' || val === 'true' || val === '1' || label.startsWith('yes'))) {
        targetRadio = radio;
        break;
      }
      if (!targetValue && (val === 'no' || val === 'false' || val === '0' || label.startsWith('no'))) {
        targetRadio = radio;
        break;
      }
    }
  }

  if (!targetRadio) {
    return false; // Never select a random option
  }

  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
  if (descriptor && descriptor.set) {
    descriptor.set.call(targetRadio, true);
  } else {
    targetRadio.checked = true;
  }

  targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
  targetRadio.dispatchEvent(new Event('change', { bubbles: true }));

  return targetRadio.checked === true;
}
