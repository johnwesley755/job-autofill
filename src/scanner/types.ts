export type InputClassification =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'select'
  | 'custom-select'
  | 'textarea'
  | 'radio-group'
  | 'checkbox-group'
  | 'file'
  | 'password'
  | 'unknown';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface FieldOption {
  label: string;
  value: string;
  elementId?: string;
  disabled?: boolean;
}

export interface DetectedField {
  id: string; // Globally unique session-specific field identifier
  scanSessionId?: string;
  elementId?: string;
  name?: string;
  type: InputClassification;
  label: string;
  placeholder?: string;
  ariaLabel?: string;
  autocomplete?: string;
  isRequired: boolean;
  isDisabled: boolean;
  isReadOnly?: boolean;
  isVisible: boolean;
  options?: FieldOption[];
  sectionContext?: string;
  selector: string;
  currentValue?: string | boolean | string[];
  confidenceScore?: number;
  confidenceTier?: ConfidenceTier;
  mappedProfileKey?: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  automationId?: string;
  testId?: string;
  formId?: string;
  groupName?: string;
  frameId?: number;
  platformId?: string;
}

export interface FormScanSummary {
  scanSessionId: string;
  url: string;
  domain: string;
  platformId?: string;
  frameId?: number;
  totalControls: number;
  fields: DetectedField[];
  scannedAt: string;
  revision: number;
}
