import { CandidateProfile, EducationRecord, ExperienceRecord } from '../types/profile';

export interface ResolveOptions {
  selectedEducationId?: string;
  selectedExperienceId?: string;
}

/**
 * Resolves canonical profile keys into values from a candidate profile.
 * Never fabricates values; returns undefined for unconfigured facts.
 * Strictly separates CGPA vs percentage, internship vs full-time, and current vs expected CTC.
 */
export function resolveProfileValue(
  canonicalKey: string,
  profile: CandidateProfile,
  options?: ResolveOptions
): string | number | boolean | string[] | undefined {
  if (!canonicalKey || !profile) return undefined;

  switch (canonicalKey) {
    // --- Personal ---
    case 'personal.firstName':
      return profile.personal.firstName || undefined;
    case 'personal.middleName':
      return profile.personal.middleName || undefined;
    case 'personal.lastName':
      return profile.personal.lastName || undefined;
    case 'personal.fullName':
      return (
        profile.personal.fullName ||
        `${profile.personal.firstName || ''} ${profile.personal.lastName || ''}`.trim() ||
        undefined
      );
    case 'personal.email':
      return profile.personal.email || undefined;
    case 'personal.phone':
      return profile.personal.phone || undefined;
    case 'personal.phoneCountryCode':
      return profile.personal.phoneCountryCode || undefined;
    case 'personal.dob':
      return profile.personal.dob || undefined;
    case 'personal.gender':
      return profile.personal.gender || undefined;
    case 'personal.nationality':
      return profile.personal.nationality || undefined;

    // --- Location ---
    case 'location.addressLine1':
      return profile.location.addressLine1 || undefined;
    case 'location.addressLine2':
      return profile.location.addressLine2 || undefined;
    case 'location.city':
      return profile.location.city || undefined;
    case 'location.state':
      return profile.location.state || undefined;
    case 'location.country':
      return profile.location.country || undefined;
    case 'location.postalCode':
      return profile.location.postalCode || undefined;

    // --- Education ---
    case 'education.institution':
    case 'education.degree':
    case 'education.fieldOfStudy':
    case 'education.graduationYear':
    case 'education.startYear':
    case 'education.cgpa':
    case 'education.percentage':
    case 'education.backlogsCount': {
      const edu = resolveSelectedEducation(profile.education, options?.selectedEducationId);
      if (!edu) return undefined;

      if (canonicalKey === 'education.institution') return edu.institution || undefined;
      if (canonicalKey === 'education.degree') return edu.degree || undefined;
      if (canonicalKey === 'education.fieldOfStudy') return edu.fieldOfStudy || undefined;
      if (canonicalKey === 'education.graduationYear') return edu.graduationYear || undefined;
      if (canonicalKey === 'education.startYear') return edu.startYear || undefined;
      if (canonicalKey === 'education.backlogsCount') return edu.backlogsCount ?? undefined;

      // Strictly guard CGPA vs Percentage:
      if (canonicalKey === 'education.cgpa') {
        return edu.scoreType === 'cgpa' ? edu.score : undefined;
      }
      if (canonicalKey === 'education.percentage') {
        return edu.scoreType === 'percentage' ? edu.score : undefined;
      }
      return undefined;
    }

    // --- Experience ---
    case 'experience.company':
    case 'experience.jobTitle': {
      // Full-time experience only
      const exp = resolveSelectedExperience(profile.experience, options?.selectedExperienceId, 'full-time');
      if (!exp) return undefined;
      if (canonicalKey === 'experience.company') return exp.company || undefined;
      if (canonicalKey === 'experience.jobTitle') return exp.jobTitle || undefined;
      return undefined;
    }
    case 'experience.internship': {
      // Internship experience only
      const intern = resolveSelectedExperience(profile.experience, options?.selectedExperienceId, 'internship');
      if (!intern) return undefined;
      return intern.company || undefined;
    }

    // --- Preferences ---
    case 'preferences.totalExperienceYears':
      return profile.preferences.isFresher ? 0 : profile.preferences.totalExperienceYears ?? undefined;
    case 'preferences.currentCtcLpa':
      return profile.preferences.currentCtcLpa ?? undefined;
    case 'preferences.expectedCtcLpa':
      return profile.preferences.expectedCtcLpa ?? undefined;
    case 'preferences.noticePeriodDays':
      return profile.preferences.noticePeriodDays ?? undefined;
    case 'preferences.immediateJoiner':
      return profile.preferences.immediateJoiner;
    case 'preferences.preferredCities':
      return profile.preferences.preferredCities.length > 0 ? profile.preferences.preferredCities : undefined;
    case 'preferences.workMode':
      return profile.preferences.workMode || undefined;
    case 'preferences.workAuthorization':
      return profile.preferences.workAuthorization || undefined;
    case 'preferences.willingToRelocate':
      return profile.preferences.willingToRelocate;

    // --- Links ---
    case 'links.linkedin':
      return profile.links.linkedin || undefined;
    case 'links.github':
      return profile.links.github || undefined;
    case 'links.portfolio':
      return profile.links.portfolio || undefined;

    default:
      return undefined;
  }
}

function resolveSelectedEducation(records: EducationRecord[], selectedId?: string): EducationRecord | undefined {
  if (!records || records.length === 0) return undefined;
  if (selectedId) {
    const found = records.find((r) => r.id === selectedId);
    if (found) return found;
  }
  // Default to highest graduation year if not specified
  return records.slice().sort((a, b) => (b.graduationYear || 0) - (a.graduationYear || 0))[0];
}

function resolveSelectedExperience(
  records: ExperienceRecord[],
  selectedId?: string,
  preferredType?: 'full-time' | 'internship'
): ExperienceRecord | undefined {
  if (!records || records.length === 0) return undefined;
  if (selectedId) {
    const found = records.find((r) => r.id === selectedId);
    if (found) return found;
  }
  const filtered = preferredType ? records.filter((r) => r.type === preferredType) : records;
  if (filtered.length === 0) return undefined;
  // Default to current employer or latest
  return filtered.find((r) => r.isCurrent) || filtered[0];
}
