import { CandidateProfile } from '../types/profile';

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

export function importProfileFromJson(jsonString: string): { success: boolean; profile?: CandidateProfile; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON root' };
    }
    if (!parsed.personal || typeof parsed.personal !== 'object') {
      return { success: false, error: 'Missing personal information structure' };
    }
    if (!parsed.location || typeof parsed.location !== 'object') {
      return { success: false, error: 'Missing location information structure' };
    }

    const merged: CandidateProfile = {
      id: parsed.id || `profile-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      personal: {
        firstName: parsed.personal.firstName || '',
        middleName: parsed.personal.middleName || '',
        lastName: parsed.personal.lastName || '',
        fullName: parsed.personal.fullName || `${parsed.personal.firstName || ''} ${parsed.personal.lastName || ''}`.trim(),
        email: parsed.personal.email || '',
        phone: parsed.personal.phone || '',
        phoneCountryCode: parsed.personal.phoneCountryCode || '+91',
        dob: parsed.personal.dob || '',
        gender: parsed.personal.gender || 'prefer-not-to-say',
        nationality: parsed.personal.nationality || '',
      },
      location: {
        addressLine1: parsed.location.addressLine1 || '',
        addressLine2: parsed.location.addressLine2 || '',
        city: parsed.location.city || '',
        state: parsed.location.state || '',
        country: parsed.location.country || '',
        postalCode: parsed.location.postalCode || '',
      },
      education: Array.isArray(parsed.education) ? parsed.education : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      skills: {
        languages: Array.isArray(parsed.skills?.languages) ? parsed.skills.languages : [],
        frameworks: Array.isArray(parsed.skills?.frameworks) ? parsed.skills.frameworks : [],
        databases: Array.isArray(parsed.skills?.databases) ? parsed.skills.databases : [],
        tools: Array.isArray(parsed.skills?.tools) ? parsed.skills.tools : [],
        certifications: Array.isArray(parsed.skills?.certifications) ? parsed.skills.certifications : [],
      },
      links: {
        linkedin: parsed.links?.linkedin || '',
        github: parsed.links?.github || '',
        portfolio: parsed.links?.portfolio || '',
        twitter: parsed.links?.twitter || '',
      },
      preferences: {
        isFresher: Boolean(parsed.preferences?.isFresher),
        totalExperienceYears: parsed.preferences?.totalExperienceYears,
        noticePeriodDays: parsed.preferences?.noticePeriodDays,
        immediateJoiner: Boolean(parsed.preferences?.immediateJoiner),
        currentCtcLpa: parsed.preferences?.currentCtcLpa,
        expectedCtcLpa: parsed.preferences?.expectedCtcLpa,
        currency: parsed.preferences?.currency || 'INR',
        preferredCities: Array.isArray(parsed.preferences?.preferredCities) ? parsed.preferences.preferredCities : [],
        willingToRelocate: Boolean(parsed.preferences?.willingToRelocate),
        workMode: parsed.preferences?.workMode || '',
        workAuthorization: parsed.preferences?.workAuthorization || '',
        requiresSponsorship: Boolean(parsed.preferences?.requiresSponsorship),
      },
    };

    return { success: true, profile: merged };
  } catch (err: any) {
    return { success: false, error: err.message || 'Malformed JSON' };
  }
}
