import { describe, it, expect } from 'vitest';
import { resolveProfileValue } from '../src/filling/profileResolver';
import { CandidateProfile } from '../src/types/profile';

describe('profileResolver', () => {
  const sampleProfile: CandidateProfile = {
    id: 'test-cand',
    updatedAt: new Date().toISOString(),
    personal: {
      fullName: 'John Wesley',
      firstName: 'John',
      lastName: 'Wesley',
      middleName: 'David',
      email: 'john@example.com',
      phone: '9876543210',
      phoneCountryCode: '+91',
      dob: '2000-01-15',
      gender: 'male',
      nationality: 'Indian',
    },
    location: {
      addressLine1: '123 High St',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
    },
    education: [
      {
        id: 'edu-btech',
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology',
        fieldOfStudy: 'Computer Science',
        startYear: 2018,
        graduationYear: 2022,
        scoreType: 'cgpa',
        score: 8.75,
        backlogsCount: 0,
      },
      {
        id: 'edu-hsc',
        institution: 'State Higher Secondary School',
        degree: 'Higher Secondary',
        fieldOfStudy: 'Science',
        startYear: 2016,
        graduationYear: 2018,
        scoreType: 'percentage',
        score: 92.5,
        backlogsCount: 0,
      },
    ],
    experience: [
      {
        id: 'exp-fulltime',
        company: 'Innovate Tech Labs',
        jobTitle: 'Full Stack Engineer',
        location: 'Bengaluru',
        startDate: '2022-07',
        endDate: '',
        isCurrent: true,
        type: 'full-time',
        description: 'Building cloud scalable web applications.',
      },
      {
        id: 'exp-intern',
        company: 'Startup Co',
        jobTitle: 'Software Intern',
        location: 'Remote',
        startDate: '2021-05',
        endDate: '2021-08',
        isCurrent: false,
        type: 'internship',
        description: 'Assisted in front-end microservice development.',
      },
    ],
    skills: {
      languages: ['English', 'Kannada', 'Hindi'],
      frameworks: ['React', 'Node.js', 'Express'],
      databases: ['PostgreSQL', 'MongoDB'],
      tools: ['Git', 'Docker'],
      certifications: ['AWS Certified Solutions Architect'],
    },
    preferences: {
      isFresher: false,
      totalExperienceYears: 3,
      currentCtcLpa: 12,
      expectedCtcLpa: 18,
      noticePeriodDays: 30,
      preferredCities: ['Bengaluru', 'Hyderabad'],
      willingToRelocate: true,
      workMode: 'hybrid',
      requiresSponsorship: false,
      workAuthorization: 'Citizen',
      immediateJoiner: false,
      currency: 'INR',
    },
    links: {
      linkedin: 'https://linkedin.com/in/johnwesley',
      github: 'https://github.com/johnwesley755',
      portfolio: 'https://johnwesley.dev',
    },
  };

  it('resolves personal fields correctly', () => {
    expect(resolveProfileValue('personal.firstName', sampleProfile)).toBe('John');
    expect(resolveProfileValue('personal.lastName', sampleProfile)).toBe('Wesley');
    expect(resolveProfileValue('personal.fullName', sampleProfile)).toBe('John Wesley');
    expect(resolveProfileValue('personal.email', sampleProfile)).toBe('john@example.com');
    expect(resolveProfileValue('personal.phone', sampleProfile)).toBe('9876543210');
    expect(resolveProfileValue('location.city', sampleProfile)).toBe('Bengaluru');
    expect(resolveProfileValue('location.postalCode', sampleProfile)).toBe('560001');
  });

  it('resolves education records and protects CGPA vs percentage distinction', () => {
    // Primary education is degree with CGPA
    expect(resolveProfileValue('education.institution', sampleProfile)).toBe('National Institute of Technology');
    expect(resolveProfileValue('education.degree', sampleProfile)).toBe('Bachelor of Technology');
    expect(resolveProfileValue('education.cgpa', sampleProfile)).toBe(8.75);

    // CGPA request on primary education should not return percentage
    expect(resolveProfileValue('education.percentage', sampleProfile)).toBeUndefined();

    // Querying secondary education record with percentage scoreType
    expect(
      resolveProfileValue('education.percentage', sampleProfile, { selectedEducationId: 'edu-hsc' })
    ).toBe(92.5);
    expect(
      resolveProfileValue('education.cgpa', sampleProfile, { selectedEducationId: 'edu-hsc' })
    ).toBeUndefined();
  });

  it('resolves employment records and protects internship vs full-time distinction', () => {
    // Primary job is full-time
    expect(resolveProfileValue('experience.company', sampleProfile)).toBe('Innovate Tech Labs');
    expect(resolveProfileValue('experience.jobTitle', sampleProfile)).toBe('Full Stack Engineer');

    // Second job is internship
    expect(
      resolveProfileValue('experience.internship', sampleProfile, { selectedExperienceId: 'exp-intern' })
    ).toBe('Startup Co');
  });

  it('resolves preferences and links accurately without cross-contamination', () => {
    expect(resolveProfileValue('preferences.currentCtcLpa', sampleProfile)).toBe(12);
    expect(resolveProfileValue('preferences.expectedCtcLpa', sampleProfile)).toBe(18);
    expect(resolveProfileValue('preferences.noticePeriodDays', sampleProfile)).toBe(30);
    expect(resolveProfileValue('preferences.willingToRelocate', sampleProfile)).toBe(true);
    expect(resolveProfileValue('links.github', sampleProfile)).toBe('https://github.com/johnwesley755');
    expect(resolveProfileValue('links.portfolio', sampleProfile)).toBe('https://johnwesley.dev');
  });

  it('returns undefined for unconfigured or unknown keys', () => {
    expect(resolveProfileValue('unknown.field', sampleProfile)).toBeUndefined();
  });
});
