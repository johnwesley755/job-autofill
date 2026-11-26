import { describe, it, expect } from 'vitest';
import { validateProfile, importProfileFromJson, exportProfileToJson } from '../src/utils/validation';
import { defaultCandidateProfile, CandidateProfile } from '../src/types/profile';

describe('Profile Validation and Import/Export', () => {
  it('identifies unconfigured candidate profile completeness accurately without false defaults', () => {
    const result = validateProfile(defaultCandidateProfile);
    expect(result.percentage).toBeLessThan(30);
    expect(result.missingCrucialFields).toContain('First Name');
    expect(result.missingCrucialFields).toContain('Email');
  });

  it('validates a complete profile and warns on conflicting compensation', () => {
    const completeProfile: CandidateProfile = {
      ...defaultCandidateProfile,
      personal: {
        ...defaultCandidateProfile.personal,
        firstName: 'Amit',
        lastName: 'Verma',
        email: 'amit.verma@example.com',
        phone: '9876543210',
      },
      location: {
        ...defaultCandidateProfile.location,
        city: 'Bengaluru',
        country: 'India',
      },
      preferences: {
        ...defaultCandidateProfile.preferences,
        currentCtcLpa: 25,
        expectedCtcLpa: 20, // Warning condition!
      },
    };

    const result = validateProfile(completeProfile);
    expect(result.percentage).toBeGreaterThan(50);
    const ctcWarning = result.issues.find((i) => i.field === 'Expected CTC');
    expect(ctcWarning).toBeDefined();
    expect(ctcWarning?.severity).toBe('warning');
  });

  it('exports and re-imports JSON profile cleanly without data loss', () => {
    const testProfile: CandidateProfile = {
      ...defaultCandidateProfile,
      personal: {
        ...defaultCandidateProfile.personal,
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'priya.nair@example.com',
      },
    };

    const exported = exportProfileToJson(testProfile);
    const importedResult = importProfileFromJson(exported);

    expect(importedResult.success).toBe(true);
    expect(importedResult.profile?.personal.firstName).toBe('Priya');
    expect(importedResult.profile?.personal.lastName).toBe('Nair');
  });

  it('rejects malformed JSON imports safely', () => {
    const badJson = '{"foo": "bar"}';
    const res = importProfileFromJson(badJson);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
