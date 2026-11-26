import { DetectedField } from '../scanner/types';
import { CandidateProfile } from '../types/profile';
import { resolveProfileValue, ResolveOptions } from './profileResolver';

export interface ProposedFieldFill {
  fieldId: string;
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
  reason: string;
  approved: boolean; // Must be explicitly approved by user
  hasConflictOrWarning: boolean;
  isAmbiguous: boolean;
  isOverwrite: boolean; // Distinct decision from normal fill
  warningReason?: string;
}

/**
 * Maps detected fields into proposed fill plans based on candidate profile.
 * Evaluates safety, non-empty existing values, and type compatibility.
 */
export function createProposedFieldFills(
  fields: DetectedField[],
  profile: CandidateProfile,
  options?: ResolveOptions
): ProposedFieldFill[] {
  const proposedFills: ProposedFieldFill[] = [];

  for (const field of fields) {
    if (!field.mappedProfileKey || field.confidenceTier === 'low') {
      continue;
    }

    // Passwords must NEVER be filled
    if (field.type === 'password') {
      continue;
    }

    // Hidden or disabled controls cannot be filled
    if (!field.isVisible || field.isDisabled || field.isReadOnly) {
      continue;
    }

    const value = resolveProfileValue(field.mappedProfileKey, profile, options);
    if (value === undefined || value === null || value === '') {
      continue; // Missing candidate profile data: never fabricate
    }

    // Assess existing non-empty value protection
    let hasExistingValue = false;
    if (typeof field.currentValue === 'string' && field.currentValue.trim().length > 0) {
      hasExistingValue = true;
    } else if (typeof field.currentValue === 'boolean' && field.currentValue === true) {
      hasExistingValue = true;
    } else if (Array.isArray(field.currentValue) && field.currentValue.length > 0) {
      hasExistingValue = true;
    }

    const score = field.confidenceScore || 0;
    const isAmbiguous = Boolean(field.isAmbiguous);
    const isHighConfidence = score >= 0.90 && !isAmbiguous;
    // Evaluated for confidence tier
    void (score >= 0.70 && score < 0.90);

    let warningReason: string | undefined;
    let hasConflictOrWarning = false;

    if (isAmbiguous) {
      hasConflictOrWarning = true;
      warningReason = field.ambiguityReason || 'Multiple competing profile keys detected. Manual review required.';
    } else if (hasExistingValue) {
      hasConflictOrWarning = true;
      warningReason = 'Field already contains data. Explicit overwrite decision required.';
    }

    const requiresReview = !isHighConfidence || hasConflictOrWarning;
    // Ambiguous fields or fields with existing values are NEVER eligible for preselection
    const isEligibleForPreselection = isHighConfidence && !hasExistingValue && !isAmbiguous;

    proposedFills.push({
      fieldId: field.id,
      label: field.label || field.name || 'Application Field',
      type: field.type,
      canonicalKey: field.mappedProfileKey,
      proposedValue: value as any,
      currentValue: field.currentValue,
      scanTimeValue: field.currentValue,
      confidenceScore: score,
      confidenceTier: field.confidenceTier || 'low',
      requiresReview,
      isEligibleForPreselection,
      reason: `Mapped via canonical dictionary to ${field.mappedProfileKey} (Score: ${(score * 100).toFixed(0)}%)`,
      approved: false, // Default all fields to unchecked for safety
      hasConflictOrWarning,
      isAmbiguous,
      isOverwrite: false,
      warningReason,
    });
  }

  return proposedFills;
}
