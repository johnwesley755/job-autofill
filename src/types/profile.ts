/**
 * Canonical Candidate Profile Types
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
  graduationYear: number;
  startYear?: number;
  scoreType: 'cgpa' | 'percentage';
  score: number;
  scale?: number;
  backlogsCount?: number;
}

export interface ExperienceRecord {
  id: string;
  type: 'full-time' | 'internship' | 'contract';
  company: string;
  jobTitle: string;
  location?: string;
  startDate: string; // YYYY-MM
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
  totalExperienceYears: number;
  noticePeriodDays: number;
  immediateJoiner: boolean;
  currentCtcLpa?: number;
  expectedCtcLpa?: number;
  currency: string;
  preferredCities: string[];
  willingToRelocate: boolean;
  workMode: 'remote' | 'hybrid' | 'onsite' | 'any';
  workAuthorization: string;
  requiresSponsorship: boolean;
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
    phoneCountryCode: '+91',
    dob: '',
    gender: 'prefer-not-to-say',
    nationality: 'Indian',
  },
  location: {
    addressLine1: '',
    addressLine2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '',
  },
  education: [
    {
      id: 'edu-1',
      institution: '',
      degree: 'B.Tech / B.E.',
      fieldOfStudy: 'Computer Science and Engineering',
      graduationYear: new Date().getFullYear(),
      scoreType: 'cgpa',
      score: 8.5,
      scale: 10.0,
      backlogsCount: 0,
    },
  ],
  experience: [],
  skills: {
    languages: ['JavaScript', 'TypeScript', 'Python'],
    frameworks: ['React', 'Node.js', 'Express', 'Tailwind CSS'],
    databases: ['PostgreSQL', 'MongoDB'],
    tools: ['Git', 'Docker', 'VS Code'],
    certifications: [],
  },
  links: {
    linkedin: '',
    github: '',
    portfolio: '',
  },
  preferences: {
    isFresher: false,
    totalExperienceYears: 2,
    noticePeriodDays: 30,
    immediateJoiner: false,
    currentCtcLpa: 10,
    expectedCtcLpa: 15,
    currency: 'INR',
    preferredCities: ['Bengaluru', 'Hyderabad', 'Pune'],
    willingToRelocate: true,
    workMode: 'hybrid',
    workAuthorization: 'Citizen',
    requiresSponsorship: false,
  },
};
