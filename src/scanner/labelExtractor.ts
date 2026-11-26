/**
 * Extracts visible, ARIA, and surrounding text labels for an input element,
 * along with precise required-field asterisk detection.
 */

export interface LabelExtractionResult {
  label: string;
  hasRequiredIndicator: boolean;
}

export function extractFieldLabelDetails(element: Element): LabelExtractionResult {
  let rawText = '';
  let hasAsterisk = false;

  // 1. Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const textParts: string[] = [];
    labelledBy.split(/\s+/).forEach((id) => {
      const el = element.ownerDocument.getElementById(id);
      if (el && el.textContent) {
        if (checkNodeForRequiredIndicator(el)) hasAsterisk = true;
        textParts.push(el.textContent.trim());
      }
    });
    if (textParts.length > 0) rawText = textParts.join(' ');
  }

  // 2. Check aria-label
  if (!rawText) {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      rawText = ariaLabel.trim();
    }
  }

  // 3. Check for explicitly linked <label for="...">
  if (!rawText) {
    const id = element.getAttribute('id');
    if (id) {
      const explicitLabel = element.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (explicitLabel && explicitLabel.textContent) {
        if (checkNodeForRequiredIndicator(explicitLabel)) hasAsterisk = true;
        rawText = explicitLabel.textContent;
      }
    }
  }

  // 4. Check wrapping <label>
  if (!rawText) {
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent) {
      if (checkNodeForRequiredIndicator(parentLabel)) hasAsterisk = true;
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea, button').forEach((n) => n.remove());
      if (clone.textContent && clone.textContent.trim().length > 0) {
        rawText = clone.textContent;
      }
    }
  }

  // 5. Look for preceding sibling or parent container label/legend
  if (!rawText) {
    const fieldContainer = element.closest(
      '.form-group, .field, [class*="field"], [class*="form-item"], [data-field], li, .application-question, [data-automation-id*="formLabel"]'
    );
    if (fieldContainer) {
      const candidateLabel = fieldContainer.querySelector(
        'label, [class*="label"], legend, [data-automation-id*="Label"]'
      );
      if (candidateLabel && candidateLabel !== element && candidateLabel.textContent) {
        if (checkNodeForRequiredIndicator(candidateLabel)) hasAsterisk = true;
        rawText = candidateLabel.textContent;
      }
    }
  }

  // 6. Fallback to placeholder or title
  if (!rawText) {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim().length > 0) {
      rawText = placeholder.trim();
    } else {
      const title = element.getAttribute('title');
      if (title && title.trim().length > 0) {
        rawText = title.trim();
      }
    }
  }

  if (rawText.includes('*') || rawText.toLowerCase().includes('(required)') || rawText.toLowerCase().includes('required')) {
    hasAsterisk = true;
  }

  return {
    label: cleanLabelText(rawText),
    hasRequiredIndicator: hasAsterisk,
  };
}

export function extractFieldLabel(element: Element): string {
  return extractFieldLabelDetails(element).label;
}

function checkNodeForRequiredIndicator(node: Element): boolean {
  if (node.textContent && node.textContent.includes('*')) return true;
  if (node.querySelector('.asterisk, [class*="required"], [aria-hidden="true"]')?.textContent?.includes('*')) {
    return true;
  }
  if (node.getAttribute('aria-required') === 'true') return true;
  return false;
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
    const heading = curr.querySelector('h1, h2, h3, h4, legend, [role="heading"]');
    if (heading && heading.textContent && heading.textContent.trim().length > 0) {
      return cleanLabelText(heading.textContent);
    }
    curr = curr.parentElement;
  }
  return '';
}
