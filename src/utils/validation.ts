import { CandidateProfile, EducationRecord, ExperienceRecord } from '../types/profile';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ProfileCompleteness {
  percentage: number;
  completedFieldsCount: number;
  totalKeyFieldsCount: number;
  issues: ValidationIssue[];
  missingCrucialFields: string[];
}

export function validateProfile(profile: CandidateProfile): ProfileCompleteness {
  const issues: ValidationIssue[] = [];
  const missingCrucialFields: string[] = [];

  let completed = 0;
  const keyFields = [
    { label: 'First Name', value: profile.personal.firstName, crucial: true },
    { label: 'Last Name', value: profile.personal.lastName, crucial: true },
    { label: 'Email', value: profile.personal.email, crucial: true },
    { label: 'Phone', value: profile.personal.phone, crucial: true },
    { label: 'City', value: profile.location.city, crucial: false },
    { label: 'Country', value: profile.location.country, crucial: false },
    { label: 'Education', value: profile.education.length > 0 ? 'yes' : '', crucial: false },
    {
      label: 'Experience or Fresher Status',
      value: profile.preferences.isFresher || profile.experience.length > 0 ? 'yes' : '',
      crucial: false,
    },
    {
      label: 'Skills',
      value:
        profile.skills.languages.length > 0 || profile.skills.frameworks.length > 0 ? 'yes' : '',
      crucial: false,
    },
    { label: 'LinkedIn or GitHub', value: profile.links.linkedin || profile.links.github, crucial: false },
  ];

  for (const f of keyFields) {
    if (f.value && String(f.value).trim().length > 0) {
      completed++;
    } else {
      if (f.crucial) {
        missingCrucialFields.push(f.label);
        issues.push({
          field: f.label,
          message: `${f.label} is required for most job applications.`,
          severity: 'error',
        });
      } else {
        issues.push({
          field: f.label,
          message: `${f.label} is recommended for higher autofill accuracy.`,
          severity: 'warning',
        });
      }
    }
  }

  // Email format check
  if (profile.personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.personal.email)) {
    issues.push({
      field: 'Email',
      message: 'Email address appears invalid.',
      severity: 'error',
    });
  }

  // Phone number format check
  if (profile.personal.phone && profile.personal.phone.replace(/\D/g, '').length < 8) {
    issues.push({
      field: 'Phone',
      message: 'Phone number should contain at least 8 digits.',
      severity: 'warning',
    });
  }

  // Salary logic check
  if (
    profile.preferences.currentCtcLpa !== undefined &&
    profile.preferences.expectedCtcLpa !== undefined &&
    profile.preferences.expectedCtcLpa < profile.preferences.currentCtcLpa
  ) {
    issues.push({
      field: 'Expected CTC',
      message: 'Expected CTC is lower than Current CTC. Please verify.',
      severity: 'warning',
    });
  }

  const percentage = Math.round((completed / keyFields.length) * 100);

  return {
    percentage,
    completedFieldsCount: completed,
    totalKeyFieldsCount: keyFields.length,
    issues,
    missingCrucialFields,
  };
}

export function exportProfileToJson(profile: CandidateProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Parses a value strictly to a boolean, preventing string "false" or "0" from becoming true.
 */
function parseStrictBoolean(val: any, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof val === 'number') {
    return val === 1;
  }
  return fallback;
}

/**
 * Parses a numerical value with range validation.
 */
function parseValidatedNumber(val: any, min?: number, max?: number, fieldName?: string): { value?: number; error?: string } {
  if (val === undefined || val === null || val === '') return {};
  const num = Number(val);
  if (isNaN(num)) {
    return { error: `${fieldName || 'Field'} must be a valid number` };
  }
  if (min !== undefined && num < min) {
    return { error: `${fieldName || 'Field'} cannot be less than ${min}` };
  }
  if (max !== undefined && num > max) {
    return { error: `${fieldName || 'Field'} cannot be greater than ${max}` };
  }
  return { value: num };
}

export function importProfileFromJson(jsonString: string): { success: boolean; profile?: CandidateProfile; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Invalid JSON root: Expected a candidate profile object' };
    }
    if (!parsed.personal || typeof parsed.personal !== 'object') {
      return { success: false, error: 'Missing or invalid personal information section' };
    }
    if (!parsed.location || typeof parsed.location !== 'object') {
      return { success: false, error: 'Missing or invalid location information section' };
    }

    // Validate and sanitize education records
    const validatedEducation: EducationRecord[] = [];
    if (Array.isArray(parsed.education)) {
      for (let i = 0; i < parsed.education.length; i++) {
        const item = parsed.education[i];
        if (!item || typeof item !== 'object') {
          return { success: false, error: `Education record #${i + 1} is invalid` };
        }

        // Validate scoreType strictly
        if (item.scoreType && item.scoreType !== 'cgpa' && item.scoreType !== 'percentage') {
          return { success: false, error: `Education record #${i + 1} has invalid scoreType: '${item.scoreType}'. Allowed: 'cgpa' or 'percentage'.` };
        }

        const scoreRes = parseValidatedNumber(
          item.score,
          0,
          item.scoreType === 'percentage' ? 100 : (item.scale || 10),
          `Education record #${i + 1} score`
        );
        if (scoreRes.error) return { success: false, error: scoreRes.error };

        const gradYearRes = parseValidatedNumber(item.graduationYear, 1950, 2100, `Education record #${i + 1} graduation year`);
        if (gradYearRes.error) return { success: false, error: gradYearRes.error };

        const startYearRes = parseValidatedNumber(item.startYear, 1950, 2100, `Education record #${i + 1} start year`);
        if (startYearRes.error) return { success: false, error: startYearRes.error };

        validatedEducation.push({
          id: String(item.id || `edu-${Date.now()}-${i}`),
          institution: String(item.institution || '').trim(),
          degree: String(item.degree || '').trim(),
          fieldOfStudy: String(item.fieldOfStudy || '').trim(),
          graduationYear: gradYearRes.value,
          startYear: startYearRes.value,
          scoreType: item.scoreType === 'percentage' ? 'percentage' : 'cgpa',
          score: scoreRes.value,
          scale: parseValidatedNumber(item.scale).value,
          backlogsCount: parseValidatedNumber(item.backlogsCount, 0).value,
        });
      }
    }

    // Validate and sanitize experience records
    const validatedExperience: ExperienceRecord[] = [];
    if (Array.isArray(parsed.experience)) {
      for (let i = 0; i < parsed.experience.length; i++) {
        const item = parsed.experience[i];
        if (!item || typeof item !== 'object') {
          return { success: false, error: `Experience record #${i + 1} is invalid` };
        }

        // Validate employment type enum
        if (item.type && !['full-time', 'internship', 'contract'].includes(item.type)) {
          return { success: false, error: `Experience record #${i + 1} has invalid type: '${item.type}'. Allowed: 'full-time', 'internship', 'contract'.` };
        }

        validatedExperience.push({
          id: String(item.id || `exp-${Date.now()}-${i}`),
          type: item.type || 'full-time',
          company: String(item.company || '').trim(),
          jobTitle: String(item.jobTitle || '').trim(),
          location: item.location ? String(item.location).trim() : undefined,
          startDate: item.startDate ? String(item.startDate).trim() : undefined,
          endDate: item.endDate ? String(item.endDate).trim() : undefined,
          isCurrent: parseStrictBoolean(item.isCurrent, false),
          description: item.description ? String(item.description).trim() : undefined,
        });
      }
    }

    const expYearsRes = parseValidatedNumber(parsed.preferences?.totalExperienceYears, 0, 70, 'Total experience years');
    if (expYearsRes.error) return { success: false, error: expYearsRes.error };

    const noticeDaysRes = parseValidatedNumber(parsed.preferences?.noticePeriodDays, 0, 365, 'Notice period days');
    if (noticeDaysRes.error) return { success: false, error: noticeDaysRes.error };

    const currentCtcRes = parseValidatedNumber(parsed.preferences?.currentCtcLpa, 0, 1000, 'Current CTC');
    if (currentCtcRes.error) return { success: false, error: currentCtcRes.error };

    const expectedCtcRes = parseValidatedNumber(parsed.preferences?.expectedCtcLpa, 0, 1000, 'Expected CTC');
    if (expectedCtcRes.error) return { success: false, error: expectedCtcRes.error };

    const merged: CandidateProfile = {
      id: String(parsed.id || `profile-${Date.now()}`),
      updatedAt: new Date().toISOString(),
      personal: {
        firstName: String(parsed.personal.firstName || '').trim(),
        middleName: parsed.personal.middleName ? String(parsed.personal.middleName).trim() : undefined,
        lastName: String(parsed.personal.lastName || '').trim(),
        fullName: String(
          parsed.personal.fullName ||
            `${parsed.personal.firstName || ''} ${parsed.personal.middleName || ''} ${parsed.personal.lastName || ''}`.replace(/\s+/g, ' ')
        ).trim(),
        email: String(parsed.personal.email || '').trim(),
        phone: String(parsed.personal.phone || '').trim(),
        phoneCountryCode: String(parsed.personal.phoneCountryCode || '+91').trim(),
        dob: parsed.personal.dob ? String(parsed.personal.dob).trim() : undefined,
        gender: parsed.personal.gender || 'prefer-not-to-say',
        nationality: parsed.personal.nationality ? String(parsed.personal.nationality).trim() : undefined,
      },
      location: {
        addressLine1: String(parsed.location.addressLine1 || '').trim(),
        addressLine2: parsed.location.addressLine2 ? String(parsed.location.addressLine2).trim() : undefined,
        city: String(parsed.location.city || '').trim(),
        state: String(parsed.location.state || '').trim(),
        country: String(parsed.location.country || '').trim(),
        postalCode: String(parsed.location.postalCode || '').trim(),
      },
      education: validatedEducation,
      experience: validatedExperience,
      skills: {
        languages: Array.isArray(parsed.skills?.languages) ? parsed.skills.languages.map(String) : [],
        frameworks: Array.isArray(parsed.skills?.frameworks) ? parsed.skills.frameworks.map(String) : [],
        databases: Array.isArray(parsed.skills?.databases) ? parsed.skills.databases.map(String) : [],
        tools: Array.isArray(parsed.skills?.tools) ? parsed.skills.tools.map(String) : [],
        certifications: Array.isArray(parsed.skills?.certifications) ? parsed.skills.certifications.map(String) : [],
      },
      links: {
        linkedin: parsed.links?.linkedin ? String(parsed.links.linkedin).trim() : undefined,
        github: parsed.links?.github ? String(parsed.links.github).trim() : undefined,
        portfolio: parsed.links?.portfolio ? String(parsed.links.portfolio).trim() : undefined,
        twitter: parsed.links?.twitter ? String(parsed.links.twitter).trim() : undefined,
      },
      preferences: {
        isFresher: parseStrictBoolean(parsed.preferences?.isFresher, false),
        totalExperienceYears: expYearsRes.value,
        noticePeriodDays: noticeDaysRes.value,
        immediateJoiner: parseStrictBoolean(parsed.preferences?.immediateJoiner, false),
        currentCtcLpa: currentCtcRes.value,
        expectedCtcLpa: expectedCtcRes.value,
        currency: String(parsed.preferences?.currency || 'INR'),
        preferredCities: Array.isArray(parsed.preferences?.preferredCities)
          ? parsed.preferences.preferredCities.map(String)
          : [],
        willingToRelocate: parseStrictBoolean(parsed.preferences?.willingToRelocate, false),
        workMode: parsed.preferences?.workMode || '',
        workAuthorization: String(parsed.preferences?.workAuthorization || '').trim(),
        requiresSponsorship:
          parsed.preferences?.requiresSponsorship !== undefined
            ? parseStrictBoolean(parsed.preferences?.requiresSponsorship, false)
            : undefined,
      },
    };

    return { success: true, profile: merged };
  } catch (err: any) {
    return { success: false, error: err.message || 'Malformed JSON' };
  }
}
