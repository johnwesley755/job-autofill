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
  const competingMatches: Array<{ key: string; score: number }> = [];

  for (const def of CANONICAL_FIELD_DICTIONARY) {
    let score = 0;

    // Check negative keywords (immediate disqualification)
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
      score += 0.65;
    }

    // 4. Placeholder match
    if (def.placeholderKeywords.some((kw) => normalizedPlaceholder.includes(kw))) {
      score += 0.40;
    }

    // 5. Input Type Compatibility check / bonus
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

    // Cap max score to 1.0
    const finalScore = Math.min(score, 1.0);

    if (finalScore >= 0.5) {
      competingMatches.push({ key: def.canonicalKey, score: finalScore });
    }

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = def;
    }
  }

  // Check for ambiguous competition between similar fields
  if (competingMatches.length > 1) {
    competingMatches.sort((a, b) => b.score - a.score);
    // If top 2 competing matches are within 0.15 margin, mark ambiguous and downgrade to medium
    if (competingMatches[0].score - competingMatches[1].score <= 0.15) {
      return {
        canonicalKey: competingMatches[0].key,
        confidenceScore: competingMatches[0].score,
        confidenceTier: 'medium',
        isAmbiguous: true,
        ambiguityReason: `Ambiguous between ${competingMatches[0].key} and ${competingMatches[1].key}`,
      };
    }
  }

  if (!bestMatch || highestScore < 0.5) {
    return {
      confidenceScore: highestScore,
      confidenceTier: 'low',
      isAmbiguous: false,
    };
  }

  const confidenceTier = highestScore >= 0.75 ? 'high' : 'medium';

  return {
    canonicalKey: bestMatch.canonicalKey,
    confidenceScore: Math.round(highestScore * 100) / 100,
    confidenceTier,
    isAmbiguous: false,
  };
}
