import { DetectedField } from '../scanner/types';
import { CandidateProfile } from '../types/profile';
import { resolveProfileValue, ResolveOptions } from './profileResolver';

export type FieldFillReadiness =
  | 'ready'
  | 'needs_manual_mapping'
  | 'missing_profile_value'
  | 'ambiguous_mapping'
  | 'unsupported_control'
  | 'existing_value_protected'
  | 'disabled_or_readonly';

export interface ProposedFieldFill {
  fieldId: string;
  compositeIdentity?: string; // tabId + frameId + sessionId + fieldId
  label: string;
  type: string;
  canonicalKey: string;
  proposedValue: string | boolean | string[];
  currentValue?: string | boolean | string[];
  scanTimeValue?: string | boolean | string[]; // Value recorded at scan time
  confidenceScore: number;
  confidenceTier: 'high' | 'medium' | 'low';
  requiresReview: boolean;
  isEligibleForPreselection: boolean;
  readinessState: FieldFillReadiness;
  hasProfileValue: boolean;
  reason: string;
  approved: boolean; // Must be explicitly approved by user
  hasConflictOrWarning: boolean;
  isAmbiguous: boolean;
  ambiguityReason?: string;
  isOverwrite: boolean; // Distinct decision from normal fill
  frameId?: number;
  scanSessionId?: string;
  warningReason?: string;
}

/**
 * Maps detected fields into proposed fill plans based on candidate profile.
 * Retains every detected field with an explicit readiness state.
 * Evaluates safety, non-empty existing values, and type compatibility.
 */
export function createProposedFieldFills(
  fields: DetectedField[],
  profile: CandidateProfile,
  options?: ResolveOptions
): ProposedFieldFill[] {
  const proposedFills: ProposedFieldFill[] = [];

  for (const field of fields) {
    // Passwords must NEVER be mapped or filled
    if (field.type === 'password') {
      continue;
    }

    const score = field.confidenceScore || 0;
    const isAmbiguous = Boolean(field.isAmbiguous);
    const hasCanonicalKey = Boolean(field.mappedProfileKey);
    const value = hasCanonicalKey ? resolveProfileValue(field.mappedProfileKey!, profile, options) : undefined;
    const hasProfileValue = value !== undefined && value !== null && value !== '';

    // Check disabled / readonly / invisible
    const isDisabledOrReadonly = !field.isVisible || field.isDisabled || Boolean(field.isReadOnly);

    // Assess existing non-empty value protection
    let hasExistingValue = false;
    if (typeof field.currentValue === 'string' && field.currentValue.trim().length > 0) {
      hasExistingValue = true;
    } else if (typeof field.currentValue === 'boolean' && field.currentValue === true) {
      hasExistingValue = true;
    } else if (Array.isArray(field.currentValue) && field.currentValue.length > 0) {
      hasExistingValue = true;
    }

    // Determine readiness state
    let readinessState: FieldFillReadiness = 'ready';
    let warningReason: string | undefined;
    let hasConflictOrWarning = false;

    if (isDisabledOrReadonly) {
      readinessState = 'disabled_or_readonly';
      hasConflictOrWarning = true;
      warningReason = 'Control is hidden, disabled, or read-only.';
    } else if (field.type === 'unknown' || field.type === 'file') {
      readinessState = 'unsupported_control';
      hasConflictOrWarning = true;
      warningReason = `Control type <${field.type}> requires manual user action.`;
    } else if (!hasCanonicalKey) {
      readinessState = 'needs_manual_mapping';
      hasConflictOrWarning = true;
      warningReason = 'No matching profile key found. Manual mapping required.';
    } else if (isAmbiguous) {
      readinessState = 'ambiguous_mapping';
      hasConflictOrWarning = true;
      warningReason = field.ambiguityReason || 'Multiple competing profile keys detected. Manual review required.';
    } else if (!hasProfileValue) {
      readinessState = 'missing_profile_value';
      hasConflictOrWarning = true;
      warningReason = `Candidate profile has no data for "${field.mappedProfileKey}".`;
    } else if (hasExistingValue) {
      readinessState = 'existing_value_protected';
      hasConflictOrWarning = true;
      warningReason = 'Field already contains data. Explicit overwrite decision required.';
    }

    const isHighConfidence = score >= 0.90 && !isAmbiguous && hasProfileValue && !hasExistingValue;
    const isEligibleForPreselection =
      hasProfileValue &&
      !isDisabledOrReadonly &&
      !isAmbiguous &&
      !hasExistingValue &&
      readinessState === 'ready';

    const requiresReview = !isHighConfidence || hasConflictOrWarning;

    proposedFills.push({
      fieldId: field.id,
      compositeIdentity: `${field.frameId || 0}:::${field.scanSessionId || 'none'}:::${field.id}`,
      label: field.label || field.name || 'Application Field',
      type: field.type,
      canonicalKey: field.mappedProfileKey || '',
      proposedValue: (value ?? '') as any,
      currentValue: field.currentValue,
      scanTimeValue: field.currentValue,
      confidenceScore: score,
      confidenceTier: field.confidenceTier || 'low',
      requiresReview,
      isEligibleForPreselection,
      readinessState,
      hasProfileValue,
      reason: hasCanonicalKey
        ? `Mapped to ${field.mappedProfileKey} (Score: ${(score * 100).toFixed(0)}%)`
        : 'Unmapped field detected on page',
      approved: isEligibleForPreselection, // Pre-select high-confidence, non-ambiguous fields with available values
      hasConflictOrWarning,
      isAmbiguous,
      isOverwrite: false,
      frameId: field.frameId,
      scanSessionId: field.scanSessionId,
      warningReason,
    });
  }

  return proposedFills;
}
