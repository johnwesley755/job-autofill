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
  frameId?: number;
}

export interface PersistentScanTargetContext {
  tabId: number;
  url: string;
  frameUrl?: string;
  isIframe?: boolean;
  pathname?: string;
  origin?: string;
  title?: string;
  domain: string;
  platformId: string;
  scanSessionId: string;
  frameSessions?: Record<number, string>;
  revision: number;
  timestamp: string;
  frameId?: number;
}

export interface FrameScanContext {
  frameId: number;
  scanSessionId: string;
  url: string;
  platformId: string;
  fieldCount: number;
}

export interface MasterScanContext {
  tabId: number;
  url: string;
  domain: string;
  platformId: string;
  scannedAt: string;
  frames: FrameScanContext[];
}

export interface ScanDiagnostics {
  scannedFrames: number;
  totalControlsFound: number;
  detectedFieldsCount: number;
  inaccessibleFramesCount: number;
  platformIdentified: string;
  durationMs?: number;
}

export interface FillDiagnostics {
  totalRequested: number;
  filledCount: number;
  skippedCount: number;
  failedCount: number;
  breakdownByStatus: Record<string, number>;
  unverifiedFieldIds: string[];
}

export interface DiscoveredFrameInfo {
  frameId: number;
  url: string;
  error?: string;
}

export type MessageType =
  | 'PING_CONTENT'
  | 'PING_BACKGROUND'
  | 'GET_ACTIVE_APPLICATION_TAB'
  | 'OPEN_DASHBOARD_TAB'
  | 'DISCOVER_FRAMES'
  | 'SCAN_FRAME_SUMMARY'
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

export interface DiscoverFramesRequest {
  type: 'DISCOVER_FRAMES';
  tabId: number;
}

export interface DiscoverFramesResponse {
  tabId: number;
  frames: DiscoveredFrameInfo[];
  inaccessibleFramesCount: number;
}

export interface GetActiveApplicationTabRequest {
  type: 'GET_ACTIVE_APPLICATION_TAB';
}

export interface GetActiveApplicationTabResponse {
  tabId: number | null;
  url: string | null;
  title: string | null;
  domain: string | null;
  isSupportedDomain: boolean;
  contentScriptReady?: boolean;
}

export interface ScanFormSummaryRequest {
  type: 'SCAN_FORM_SUMMARY';
  frameId?: number;
}

export type ScanFormSummaryResponse = FormScanSummary;

export interface FillApprovedFieldsRequest {
  type: 'FILL_APPROVED_FIELDS';
  sessionId: string;
  instructions: ValidatedFillInstruction[];
  targetContext: PersistentScanTargetContext;
  frameId?: number;
}

export interface FillApprovedFieldsResponse {
  success: boolean;
  report?: FillSessionReport;
  error?: string;
}

export interface DynamicFormChangedNotice {
  type: 'DYNAMIC_FORM_CHANGED';
  url?: string;
  frameId?: number;
}

export interface TabFormMutatedBroadcast {
  type: 'TAB_FORM_MUTATED';
  tabId?: number;
  url?: string;
  frameId?: number;
}

export type AutoApplyMessage =
  | PingContentRequest
  | DiscoverFramesRequest
  | GetActiveApplicationTabRequest
  | ScanFormSummaryRequest
  | FillApprovedFieldsRequest
  | DynamicFormChangedNotice
  | TabFormMutatedBroadcast
  | { type: 'OPEN_DASHBOARD_TAB' };
