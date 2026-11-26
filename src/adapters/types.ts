import { DetectedField } from '../scanner/types';

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
   * Returns normalized DetectedField array.
   */
  scanFields(document: Document, sessionId: string): DetectedField[];

  /**
   * Optional platform-specific fill handler.
   * If returns false or undefined, standard filler applies.
   */
  fillControl?(field: DetectedField, value: string | boolean | string[]): boolean | Promise<boolean>;
}
