/**
 * In-memory registry keeping exact DOM references per scan session in the content script.
 * Resolves fields without relying solely on fragile selectors or re-querying DOM.
 * Uses WeakMap for fast, identity-based DOM element tracking.
 */

import { FieldOption, InputClassification } from './types';

export interface RegisteredElement {
  fieldId: string;
  scanSessionId: string;
  element: HTMLElement;
  groupedElements?: HTMLElement[]; // For radio-group or checkbox-group
  originalValue: string | boolean | string[];
  fieldType?: InputClassification | string;
  platformId?: string;
  frameId?: number;
  options?: FieldOption[];
}

class ScanSessionElementRegistry {
  private currentSessionId: string = '';
  private registry = new Map<string, RegisteredElement>();
  private elementToFieldId = new WeakMap<HTMLElement, string>();

  public createSession(): string {
    this.currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.registry.clear();
    this.elementToFieldId = new WeakMap<HTMLElement, string>();
    return this.currentSessionId;
  }

  public getSessionId(): string {
    return this.currentSessionId;
  }

  public register(
    fieldId: string,
    element: HTMLElement,
    originalValue: string | boolean | string[] = '',
    groupedElements?: HTMLElement[],
    metadata?: {
      fieldType?: InputClassification | string;
      platformId?: string;
      frameId?: number;
      options?: FieldOption[];
    }
  ): void {
    this.registry.set(fieldId, {
      fieldId,
      scanSessionId: this.currentSessionId,
      element,
      groupedElements,
      originalValue,
      fieldType: metadata?.fieldType,
      platformId: metadata?.platformId,
      frameId: metadata?.frameId,
      options: metadata?.options,
    });
    this.elementToFieldId.set(element, fieldId);
    if (groupedElements && Array.isArray(groupedElements)) {
      for (const gEl of groupedElements) {
        this.elementToFieldId.set(gEl, fieldId);
      }
    }
  }

  public getFieldIdForElement(element: HTMLElement): string | undefined {
    return this.elementToFieldId.get(element);
  }

  public hasElement(element: HTMLElement): boolean {
    return this.elementToFieldId.has(element);
  }

  public resolve(fieldId: string, sessionId?: string): RegisteredElement | undefined {
    if (!sessionId || sessionId !== this.currentSessionId) {
      console.warn(
        `[AutoApply Registry] Session rejected. Current: "${this.currentSessionId}", Requested: "${sessionId || 'none'}"`
      );
      return undefined;
    }
    const reg = this.registry.get(fieldId);
    if (!reg || reg.scanSessionId !== sessionId) {
      return undefined;
    }
    return reg;
  }

  public clear(): void {
    this.registry.clear();
    this.currentSessionId = '';
    this.elementToFieldId = new WeakMap<HTMLElement, string>();
  }

  public size(): number {
    return this.registry.size;
  }
}

export const scanRegistry = new ScanSessionElementRegistry();
