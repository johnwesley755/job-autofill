/**
 * In-memory registry keeping exact DOM references per scan session in the content script.
 * Resolves fields without relying solely on fragile selectors or re-querying DOM.
 */

export interface RegisteredElement {
  fieldId: string;
  scanSessionId: string;
  element: HTMLElement;
  groupedElements?: HTMLElement[]; // For radio-group or checkbox-group
  originalValue: string | boolean | string[];
}

class ScanSessionElementRegistry {
  private currentSessionId: string = '';
  private registry = new Map<string, RegisteredElement>();

  public createSession(): string {
    this.currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.registry.clear();
    return this.currentSessionId;
  }

  public getSessionId(): string {
    return this.currentSessionId;
  }

  public register(
    fieldId: string,
    element: HTMLElement,
    originalValue: string | boolean | string[] = '',
    groupedElements?: HTMLElement[]
  ): void {
    this.registry.set(fieldId, {
      fieldId,
      scanSessionId: this.currentSessionId,
      element,
      groupedElements,
      originalValue,
    });
  }

  public resolve(fieldId: string, sessionId?: string): RegisteredElement | undefined {
    if (sessionId && sessionId !== this.currentSessionId) {
      console.warn(`[AutoApply Registry] Session mismatch. Expected: ${this.currentSessionId}, Requested: ${sessionId}`);
      // Try resolving anyway if still present in memory
    }
    return this.registry.get(fieldId);
  }

  public clear(): void {
    this.registry.clear();
    this.currentSessionId = '';
  }

  public size(): number {
    return this.registry.size;
  }
}

export const scanRegistry = new ScanSessionElementRegistry();
