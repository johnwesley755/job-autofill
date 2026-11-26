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
  | 'unknown';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface FieldOption {
  label: string;
  value: string;
}

export interface DetectedField {
  id: string;
  elementId?: string;
  name?: string;
  type: InputClassification;
  label: string;
  placeholder?: string;
  ariaLabel?: string;
  autocomplete?: string;
  isRequired: boolean;
  isDisabled: boolean;
  isVisible: boolean;
  options?: FieldOption[];
  sectionContext?: string;
  selector: string;
  confidenceScore?: number;
  confidenceTier?: ConfidenceTier;
  mappedProfileKey?: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface FormScanSummary {
  url: string;
  domain: string;
  totalControls: number;
  fields: DetectedField[];
  scannedAt: string;
}
