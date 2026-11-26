import { describe, it, expect, beforeEach } from 'vitest';
import { useProfileStore } from '../src/store/profileStore';

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.getState().resetToDefault();
  });

  it('initializes with default profile schema', () => {
    const profile = useProfileStore.getState().profile;
    expect(profile).toBeDefined();
    expect(profile.personal.phoneCountryCode).toBe('+91');
    expect(profile.preferences.currency).toBe('INR');
  });

  it('updates personal details and auto-computes full name', () => {
    useProfileStore.getState().updatePersonal({
      firstName: 'Rahul',
      middleName: 'Kumar',
      lastName: 'Sharma',
    });

    const updated = useProfileStore.getState().profile.personal;
    expect(updated.firstName).toBe('Rahul');
    expect(updated.middleName).toBe('Kumar');
    expect(updated.lastName).toBe('Sharma');
    expect(updated.fullName).toBe('Rahul Kumar Sharma');
    expect(useProfileStore.getState().isDirty).toBe(true);
  });

  it('adds and removes education records cleanly', () => {
    const initialCount = useProfileStore.getState().profile.education.length;
    const testId = `edu-test-${Date.now()}`;

    useProfileStore.getState().addEducation({
      id: testId,
      institution: 'IIT Madras',
      degree: 'B.Tech',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2024,
      scoreType: 'cgpa',
      score: 9.2,
      scale: 10.0,
      backlogsCount: 0,
    });

    expect(useProfileStore.getState().profile.education.length).toBe(initialCount + 1);

    useProfileStore.getState().removeEducation(testId);
    expect(useProfileStore.getState().profile.education.length).toBe(initialCount);
  });

  it('correctly handles India-specific salary and notice period preferences', () => {
    useProfileStore.getState().updatePreferences({
      currentCtcLpa: 14.5,
      expectedCtcLpa: 22,
      noticePeriodDays: 60,
      immediateJoiner: false,
      preferredCities: ['Bengaluru', 'Pune'],
    });

    const pref = useProfileStore.getState().profile.preferences;
    expect(pref.currentCtcLpa).toBe(14.5);
    expect(pref.expectedCtcLpa).toBe(22);
    expect(pref.noticePeriodDays).toBe(60);
    expect(pref.preferredCities).toContain('Bengaluru');
    expect(pref.preferredCities).toContain('Pune');
  });
});
