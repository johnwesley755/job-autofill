/**
 * Sets values on native and React-controlled HTMLInputElement / HTMLTextAreaElement.
 * Dispatches proper synthetic events (focus, key events, beforeinput, input, change, blur)
 * matching modern browser user interactions and framework state listeners (React, Angular, Vue).
 */
export function setNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string | number
): boolean {
  if (element.disabled || element.readOnly) {
    return false;
  }

  const strValue = String(value);
  const isInput = element.tagName.toLowerCase() === 'input';
  const prototype = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;

  // Step 1: Realistic focus sequence
  element.focus();
  element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

  // Step 2: Realistic keyboard & pre-input events
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: false }));
  element.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: false }));

  // Step 3: Retrieve native property descriptor to bypass React 16/17/18/19 setter overrides
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, strValue);
  } else {
    element.value = strValue;
  }

  // Step 4: Dispatch standard modern input events with bubbles: true
  element.dispatchEvent(new Event('beforeinput', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: false }));

  // Step 5: Realistic blur sequence
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

  // Verify that the element accepted and preserved the value
  return element.value === strValue;
}
