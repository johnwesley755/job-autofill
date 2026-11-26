/**
 * AutoApply Shared Messaging Protocol
 * Strongly-typed contracts for Content Script, Service Worker, Popup, and Dashboard.
 */

import { FormScanSummary } from '../scanner/types';
import { FillSessionReport } from '../filling/fillCoordinator';

export interface ValidatedFillInstruction {
  fieldId: string;
  canonicalKey: string;
  proposedValue: string | boolean | string[];
  scanTimeValue?: string | boolean | string[];
  approved: boolean; // MUST be explicitly true
  overwriteExisting: boolean;
  isAmbiguous: boolean;
  scanSessionId?: string;
}

export type MessageType =
  | 'PING_CONTENT'
  | 'PING_BACKGROUND'
  | 'GET_ACTIVE_APPLICATION_TAB'
  | 'OPEN_DASHBOARD_TAB'
  | 'SCAN_FORM_SUMMARY'
  | 'FILL_APPROVED_FIELDS'
  | 'DYNAMIC_FORM_CHANGED'
  | 'TAB_FORM_MUTATED';

// Payload Types
export interface PingContentRequest {
  type: 'PING_CONTENT';
}

export interface PingContentResponse {
  status: 'READY';
  url: string;
  title: string;
  isIframe?: boolean;
}

export interface GetActiveApplicationTabRequest {
  type: 'GET_ACTIVE_APPLICATION_TAB';
}

export interface GetActiveApplicationTabResponse {
  tabId: number | null;
  url: string | null;
  title: string | null;
  isSupportedDomain: boolean;
  contentScriptReady?: boolean;
}

export interface ScanFormSummaryRequest {
  type: 'SCAN_FORM_SUMMARY';
}

export type ScanFormSummaryResponse = FormScanSummary;

export interface FillApprovedFieldsRequest {
  type: 'FILL_APPROVED_FIELDS';
  sessionId: string;
  instructions: ValidatedFillInstruction[];
}

export interface FillApprovedFieldsResponse {
  success: boolean;
  report?: FillSessionReport;
  error?: string;
}

export interface DynamicFormChangedNotice {
  type: 'DYNAMIC_FORM_CHANGED';
}

export interface TabFormMutatedBroadcast {
  type: 'TAB_FORM_MUTATED';
  tabId?: number;
  url?: string;
}

export type AutoApplyMessage =
  | PingContentRequest
  | GetActiveApplicationTabRequest
  | ScanFormSummaryRequest
  | FillApprovedFieldsRequest
  | DynamicFormChangedNotice
  | TabFormMutatedBroadcast
  | { type: 'OPEN_DASHBOARD_TAB' };
