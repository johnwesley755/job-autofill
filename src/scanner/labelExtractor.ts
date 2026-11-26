/**
 * Extracts visible, ARIA, and surrounding text labels for an input element.
 */
export function extractFieldLabel(element: Element): string {
  // 1. Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const textParts: string[] = [];
    labelledBy.split(/\s+/).forEach((id) => {
      const el = element.ownerDocument.getElementById(id);
      if (el && el.textContent) {
        textParts.push(el.textContent.trim());
      }
    });
    if (textParts.length > 0) return textParts.join(' ');
  }

  // 2. Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return ariaLabel.trim();
  }

  // 3. Check for explicitly linked <label for="...">
  const id = element.getAttribute('id');
  if (id) {
    const explicitLabel = element.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (explicitLabel && explicitLabel.textContent) {
      return cleanLabelText(explicitLabel.textContent);
    }
  }

  // 4. Check wrapping <label>
  const parentLabel = element.closest('label');
  if (parentLabel && parentLabel.textContent) {
    // Clone node to strip input text inside it
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, button').forEach((n) => n.remove());
    if (clone.textContent && clone.textContent.trim().length > 0) {
      return cleanLabelText(clone.textContent);
    }
  }

  // 5. Look for preceding sibling or parent container label/legend
  const fieldContainer = element.closest('.form-group, .field, [class*="field"], [class*="form-item"], [data-field], li, .application-question');
  if (fieldContainer) {
    const candidateLabel = fieldContainer.querySelector('label, [class*="label"], legend');
    if (candidateLabel && candidateLabel !== element && candidateLabel.textContent) {
      return cleanLabelText(candidateLabel.textContent);
    }
  }

  // 6. Fallback to placeholder or title
  const placeholder = element.getAttribute('placeholder');
  if (placeholder && placeholder.trim().length > 0) {
    return placeholder.trim();
  }

  const title = element.getAttribute('title');
  if (title && title.trim().length > 0) {
    return title.trim();
  }

  return '';
}

/**
 * Remove required asterisk (*), trailing colons, and excess whitespace.
 */
function cleanLabelText(text: string): string {
  return text
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\*+/g, '')
    .replace(/:+\s*$/, '')
    .replace(/\(required\)|\(optional\)/gi, '')
    .trim();
}

/**
 * Extracts surrounding section header (e.g. "Education", "Personal Information", "Work Experience")
 */
export function extractSectionContext(element: Element): string {
  let curr = element.parentElement;
  while (curr && curr !== element.ownerDocument.body) {
    const heading = curr.querySelector('h1, h2, h3, h4, legend');
    if (heading && heading.textContent && heading.textContent.trim().length > 0) {
      return cleanLabelText(heading.textContent);
    }
    curr = curr.parentElement;
  }
  return '';
}
