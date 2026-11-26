import { DetectedField } from '../scanner/types';
import { CANONICAL_FIELD_DICTIONARY, FieldDefinition } from './dictionary';

export interface MatchResult {
  canonicalKey?: string;
  confidenceScore: number;
  confidenceTier: 'high' | 'medium' | 'low';
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

export function matchFieldToProfile(field: DetectedField): MatchResult {
  // Password fields must NEVER be matched to candidate profile data
  if (field.type === 'password') {
    return {
      confidenceScore: 0,
      confidenceTier: 'low',
      isAmbiguous: false,
    };
  }

  const rawName = (field.name || '').toLowerCase();
  const normalizedName = rawName.replace(/[-_\[\]]/g, '');
  const rawId = (field.elementId || '').toLowerCase();
  const normalizedId = rawId.replace(/[-_]/g, '');
  const rawAutomationId = (field.automationId || '').toLowerCase();
  const normalizedLabel = (field.label || '').toLowerCase();
  const normalizedPlaceholder = (field.placeholder || '').toLowerCase();
  const autocomplete = (field.autocomplete || '').toLowerCase().trim();
  const section = (field.sectionContext || '').toLowerCase();

  let bestMatch: FieldDefinition | null = null;
  let highestScore = 0;
  const competingMatches: Array<{ key: string; score: number; def: FieldDefinition }> = [];

  for (const def of CANONICAL_FIELD_DICTIONARY) {
    let score = 0;

    // Hard negative keywords check (immediate disqualification)
    const hasNegative = def.negativeKeywords.some(
      (neg) =>
        normalizedLabel.includes(neg) ||
        rawName.includes(neg) ||
        rawId.includes(neg) ||
        normalizedPlaceholder.includes(neg)
    );

    if (hasNegative) {
      continue;
    }

    // 1. Standard HTML5 Autocomplete match (Highest signal)
    if (autocomplete && def.autocompletes && def.autocompletes.length > 0) {
      if (def.autocompletes.includes(autocomplete)) {
        score += 0.95;
      }
    }

    // 2. Exact attribute match (name, id, or data-automation-id)
    if (def.exactNames.some((ex) => rawName === ex || normalizedName === ex.replace(/[-_\[\]]/g, ''))) {
      score += 0.85;
    } else if (def.exactIds.some((ex) => rawId === ex || normalizedId === ex.replace(/[-_]/g, ''))) {
      score += 0.85;
    } else if (def.exactNames.some((ex) => rawAutomationId.includes(ex))) {
      score += 0.80;
    }

    // 3. Exact or high-signal label match
    if (def.labelKeywords.some((kw) => normalizedLabel === kw)) {
      score += 0.90;
    } else if (def.labelKeywords.some((kw) => normalizedLabel.includes(kw))) {
      score += 0.75;
    }

    // 4. Placeholder match
    if (def.placeholderKeywords.some((kw) => normalizedPlaceholder.includes(kw))) {
      score += 0.40;
    }

    // 5. Input Type Compatibility checks
    // Reject incompatible types immediately (e.g., date cannot map to text names, number cannot map to email)
    if (field.type === 'date' && !def.canonicalKey.includes('dob') && !def.canonicalKey.includes('Date') && !def.canonicalKey.includes('Year')) {
      continue;
    }
    if (field.type === 'email' && def.canonicalKey !== 'personal.email') {
      continue;
    }
    if (field.type === 'tel' && def.canonicalKey !== 'personal.phone') {
      continue;
    }

    // Add compatibility bonus
    if (def.canonicalKey === 'personal.email' && field.type === 'email') {
      score += 0.20;
    } else if (def.canonicalKey === 'personal.phone' && field.type === 'tel') {
      score += 0.20;
    } else if (def.canonicalKey === 'personal.dob' && field.type === 'date') {
      score += 0.25;
    } else if (
      (def.canonicalKey.includes('Ctc') || def.canonicalKey.includes('noticePeriod') || def.canonicalKey.includes('Year')) &&
      field.type === 'number'
    ) {
      score += 0.15;
    }

    // 6. Section Context Alignment bonus
    if (section.length > 0) {
      if (def.category === 'education' && (section.includes('education') || section.includes('academic') || section.includes('college') || section.includes('school'))) {
        score += 0.15;
      } else if (def.category === 'experience' && (section.includes('experience') || section.includes('employment') || section.includes('work') || section.includes('history'))) {
        score += 0.15;
      }
    }

    const finalScore = Math.min(score, 1.0);

    // Keep candidate matches that reached reasonable threshold
    if (finalScore >= 0.35) {
      competingMatches.push({ key: def.canonicalKey, score: finalScore, def });
    }

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = def;
    }
  }

  // Detect contradictory or ambiguous competing matches
  if (competingMatches.length > 1) {
    competingMatches.sort((a, b) => b.score - a.score);
    const topDiff = competingMatches[0].score - competingMatches[1].score;

    // Hard conflict between mutually exclusive fields:
    const topKey = competingMatches[0].key;
    const secondKey = competingMatches[1].key;

    // Both matched mutually exclusive categories with close scores
    const isConflict =
      (topDiff <= 0.20 &&
        ((topKey.includes('currentCtc') && secondKey.includes('expectedCtc')) ||
          (topKey.includes('expectedCtc') && secondKey.includes('currentCtc')) ||
          (topKey.includes('cgpa') && secondKey.includes('percentage')) ||
          (topKey.includes('percentage') && secondKey.includes('cgpa')) ||
          (topKey.includes('internship') && secondKey.includes('company')) ||
          (topKey.includes('company') && secondKey.includes('internship'))));

    if (isConflict || topDiff <= 0.18) {
      return {
        canonicalKey: competingMatches[0].key,
        confidenceScore: competingMatches[0].score,
        confidenceTier: 'medium', // Require manual review
        isAmbiguous: true,
        ambiguityReason: `Ambiguous / conflicting match between ${topKey} and ${secondKey}`,
      };
    }
  }

  // Strictly enforce confidence thresholds:
  // >= 0.90 -> High (eligible for preselection)
  // 0.70 - 0.89 -> Medium (requires manual review)
  // < 0.70 -> Low (unmatched)
  if (!bestMatch || highestScore < 0.70) {
    return {
      confidenceScore: highestScore,
      confidenceTier: 'low',
      isAmbiguous: false,
    };
  }

  const confidenceTier: 'high' | 'medium' = highestScore >= 0.90 ? 'high' : 'medium';

  return {
    canonicalKey: bestMatch.canonicalKey,
    confidenceScore: Math.round(highestScore * 100) / 100,
    confidenceTier,
    isAmbiguous: false,
  };
}
