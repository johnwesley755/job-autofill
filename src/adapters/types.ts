import { DetectedField } from '../scanner/types';

export type ControlHandlerResult =
  | {
      status: 'handled';
      verified: boolean;
      actualValue?: string | boolean | string[];
    }
  | {
      status: 'not_applicable';
    }
  | {
      status: 'failed';
      reason: string;
      interactionStarted: boolean;
    };

export interface FormAdapter {
  platformId: string;
  platformName: string;
  version: string;

  /**
   * Evaluates if this adapter can handle the current page/document
   */
  canHandle(url: string, document: Document): boolean;

  /**
   * Scans custom questions or enhanced fields specific to this platform.
   * Returns normalized DetectedField array and registers DOM elements in scanRegistry.
   */
  scanFields(document: Document, sessionId: string): DetectedField[];

  /**
   * Optional platform-specific fill handler.
   * Handles custom widgets (custom select, radio, dropdowns, react-select, etc.).
   * Returns structured ControlHandlerResult or legacy boolean.
   */
  fillControl?(
    field: DetectedField,
    value: string | boolean | string[],
    element: HTMLElement,
    groupedElements?: HTMLElement[]
  ): ControlHandlerResult | boolean | Promise<ControlHandlerResult | boolean>;
}
