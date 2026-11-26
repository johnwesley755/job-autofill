/**
 * Canonical Candidate Profile Types
 *
 * Strict Privacy Rule: All defaults are empty or unknown.
 * Never fabricate or infer degrees, institutes, marks, salaries, or notice periods.
 */

export interface PersonalInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  dob?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | string;
  nationality?: string;
}

export interface LocationInfo {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EducationRecord {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationYear?: number;
  startYear?: number;
  scoreType: 'cgpa' | 'percentage';
  score?: number;
  scale?: number;
  backlogsCount?: number;
}

export interface ExperienceRecord {
  id: string;
  type: 'full-time' | 'internship' | 'contract';
  company: string;
  jobTitle: string;
  location?: string;
  startDate?: string; // YYYY-MM
  endDate?: string; // YYYY-MM or undefined
  isCurrent: boolean;
  description?: string;
}

export interface SkillsInfo {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  certifications: string[];
}

export interface LinksInfo {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
}

export interface JobPreferences {
  isFresher: boolean;
  totalExperienceYears?: number;
  noticePeriodDays?: number;
  immediateJoiner: boolean;
  currentCtcLpa?: number;
  expectedCtcLpa?: number;
  currency: string;
  preferredCities: string[];
  willingToRelocate: boolean;
  workMode: 'remote' | 'hybrid' | 'onsite' | 'any' | '';
  workAuthorization: string;
  requiresSponsorship?: boolean;
}

export interface CandidateProfile {
  id: string;
  updatedAt: string;
  personal: PersonalInfo;
  location: LocationInfo;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillsInfo;
  links: LinksInfo;
  preferences: JobPreferences;
}

/**
 * True empty profile template without fabricated assumptions.
 */
export const defaultCandidateProfile: CandidateProfile = {
  id: 'default-profile',
  updatedAt: new Date().toISOString(),
  personal: {
    firstName: '',
    middleName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+91', // Standard country dialing format prefix
    dob: '',
    gender: 'prefer-not-to-say',
    nationality: '',
  },
  location: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  },
  education: [],
  experience: [],
  skills: {
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
    certifications: [],
  },
  links: {
    linkedin: '',
    github: '',
    portfolio: '',
  },
  preferences: {
    isFresher: false,
    immediateJoiner: false,
    currency: 'INR',
    preferredCities: [],
    willingToRelocate: false,
    workMode: '',
    workAuthorization: '',
  },
};
