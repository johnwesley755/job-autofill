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
  confidenceScore: number;
  confidenceTier: 'high' | 'medium' | 'low';
  requiresReview: boolean;
  isEligibleForPreselection: boolean;
  reason: string;
  approved: boolean; // Must be explicitly approved by user
  hasConflictOrWarning: boolean;
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
    const isHighConfidence = score >= 0.90 && !field.isAmbiguous;
    // Evaluated for confidence tier
    void (score >= 0.70 && score < 0.90);

    let warningReason: string | undefined;
    let hasConflictOrWarning = false;

    if (field.isAmbiguous) {
      hasConflictOrWarning = true;
      warningReason = field.ambiguityReason || 'Multiple competing profile keys detected';
    } else if (hasExistingValue) {
      hasConflictOrWarning = true;
      warningReason = 'Field already contains text on the page. Overwrite requires approval.';
    }

    const requiresReview = !isHighConfidence || hasConflictOrWarning;
    const isEligibleForPreselection = isHighConfidence && !hasExistingValue && !hasConflictOrWarning;

    proposedFills.push({
      fieldId: field.id,
      label: field.label || field.name || 'Application Field',
      type: field.type,
      canonicalKey: field.mappedProfileKey,
      proposedValue: value as any,
      currentValue: field.currentValue,
      confidenceScore: score,
      confidenceTier: field.confidenceTier || 'low',
      requiresReview,
      isEligibleForPreselection,
      reason: `Matched ${field.mappedProfileKey} with ${(score * 100).toFixed(0)}% confidence`,
      approved: isEligibleForPreselection, // Only high confidence without existing values pre-select
      hasConflictOrWarning,
      warningReason,
    });
  }

  return proposedFills;
}
