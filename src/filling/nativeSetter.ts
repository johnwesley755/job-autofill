/**
 * Sets values on native and React-controlled HTMLInputElement / HTMLTextAreaElement.
 * Dispatches proper synthetic events without bypassing application-level state trees.
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

  // Retrieve native property descriptor to bypass React 16/17/18/19 setter overrides
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, strValue);
  } else {
    element.value = strValue;
  }

  // Dispatch standard modern input events with bubbles: true
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

  // Verify that the element accepted and preserved the value
  return element.value === strValue;
}
