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
  const normalizedName = (field.name || '').toLowerCase().replace(/[-_]/g, '');
  const rawName = (field.name || '').toLowerCase();
  const normalizedLabel = (field.label || '').toLowerCase();
  const normalizedPlaceholder = (field.placeholder || '').toLowerCase();
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
        normalizedName.includes(neg) ||
        normalizedPlaceholder.includes(neg)
    );

    if (hasNegative) {
      continue;
    }

    // 1. Exact attribute match (name or id)
    if (def.exactNames.some((ex) => rawName === ex || normalizedName === ex.replace(/[-_]/g, ''))) {
      score += 0.85;
    }

    // 2. Exact or high-signal label match
    if (def.labelKeywords.some((kw) => normalizedLabel === kw)) {
      score += 0.90;
    } else if (def.labelKeywords.some((kw) => normalizedLabel.includes(kw))) {
      score += 0.65;
    }

    // 3. Placeholder match
    if (def.placeholderKeywords.some((kw) => normalizedPlaceholder.includes(kw))) {
      score += 0.40;
    }

    // 4. Section Context Alignment bonus
    if (section.length > 0) {
      if (def.category === 'education' && (section.includes('education') || section.includes('academic') || section.includes('college'))) {
        score += 0.15;
      } else if (def.category === 'experience' && (section.includes('experience') || section.includes('employment') || section.includes('work'))) {
        score += 0.15;
      }
    }

    // Cap max score
    const finalScore = Math.min(score, 1.0);

    if (finalScore >= 0.3) {
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
    // If top 2 are within 0.25 margin, mark ambiguous
    if (competingMatches[0].score - competingMatches[1].score <= 0.25) {
      return {
        canonicalKey: competingMatches[0].key,
        confidenceScore: competingMatches[0].score,
        confidenceTier: 'medium', // Downgrade to medium for review
        isAmbiguous: true,
        ambiguityReason: `Ambiguous between ${competingMatches[0].key} and ${competingMatches[1].key}`,
      };
    }
  }

  if (!bestMatch || highestScore < 0.4) {
    return {
      confidenceScore: highestScore,
      confidenceTier: 'low',
      isAmbiguous: false,
    };
  }

  const confidenceTier = highestScore >= 0.75 ? 'high' : highestScore >= 0.5 ? 'medium' : 'low';

  return {
    canonicalKey: bestMatch.canonicalKey,
    confidenceScore: Math.round(highestScore * 100) / 100,
    confidenceTier,
    isAmbiguous: false,
  };
}
