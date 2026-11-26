import { create } from 'zustand';
import { CandidateProfile, defaultCandidateProfile } from '../types/profile';
import { getStoredProfile, saveStoredProfile } from '../utils/storage';

interface ProfileState {
  profile: CandidateProfile;
  isLoading: boolean;
  isDirty: boolean;
  loadProfile: () => Promise<void>;
  updatePersonal: (data: Partial<CandidateProfile['personal']>) => void;
  updateLocation: (data: Partial<CandidateProfile['location']>) => void;
  updatePreferences: (data: Partial<CandidateProfile['preferences']>) => void;
  updateLinks: (data: Partial<CandidateProfile['links']>) => void;
  updateSkills: (data: Partial<CandidateProfile['skills']>) => void;
  addEducation: (edu: CandidateProfile['education'][number]) => void;
  updateEducation: (id: string, edu: Partial<CandidateProfile['education'][number]>) => void;
  removeEducation: (id: string) => void;
  addExperience: (exp: CandidateProfile['experience'][number]) => void;
  updateExperience: (id: string, exp: Partial<CandidateProfile['experience'][number]>) => void;
  removeExperience: (id: string) => void;
  save: () => Promise<void>;
  resetToDefault: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultCandidateProfile,
  isLoading: true,
  isDirty: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const stored = await getStoredProfile();
      set({ profile: stored, isLoading: false, isDirty: false });
    } catch (err) {
      console.error('Failed to load profile', err);
      set({ isLoading: false });
    }
  },

  updatePersonal: (data) => {
    set((state) => {
      const updatedPersonal = { ...state.profile.personal, ...data };
      if (data.firstName !== undefined || data.lastName !== undefined || data.middleName !== undefined) {
        const parts = [
          data.firstName ?? state.profile.personal.firstName,
          data.middleName ?? state.profile.personal.middleName,
          data.lastName ?? state.profile.personal.lastName,
        ].filter(Boolean);
        updatedPersonal.fullName = parts.join(' ').trim();
      }
      return {
        profile: { ...state.profile, personal: updatedPersonal },
        isDirty: true,
      };
    });
  },

  updateLocation: (data) => {
    set((state) => ({
      profile: {
        ...state.profile,
        location: { ...state.profile.location, ...data },
      },
      isDirty: true,
    }));
  },

  updatePreferences: (data) => {
    set((state) => ({
      profile: {
        ...state.profile,
        preferences: { ...state.profile.preferences, ...data },
      },
      isDirty: true,
    }));
  },

  updateLinks: (data) => {
    set((state) => ({
      profile: {
        ...state.profile,
        links: { ...state.profile.links, ...data },
      },
      isDirty: true,
    }));
  },

  updateSkills: (data) => {
    set((state) => ({
      profile: {
        ...state.profile,
        skills: { ...state.profile.skills, ...data },
      },
      isDirty: true,
    }));
  },

  addEducation: (edu) => {
    set((state) => ({
      profile: {
        ...state.profile,
        education: [...state.profile.education, edu],
      },
      isDirty: true,
    }));
  },

  updateEducation: (id, partialEdu) => {
    set((state) => ({
      profile: {
        ...state.profile,
        education: state.profile.education.map((item) =>
          item.id === id ? { ...item, ...partialEdu } : item
        ),
      },
      isDirty: true,
    }));
  },

  removeEducation: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        education: state.profile.education.filter((item) => item.id !== id),
      },
      isDirty: true,
    }));
  },

  addExperience: (exp) => {
    set((state) => ({
      profile: {
        ...state.profile,
        experience: [...state.profile.experience, exp],
      },
      isDirty: true,
    }));
  },

  updateExperience: (id, partialExp) => {
    set((state) => ({
      profile: {
        ...state.profile,
        experience: state.profile.experience.map((item) =>
          item.id === id ? { ...item, ...partialExp } : item
        ),
      },
      isDirty: true,
    }));
  },

  removeExperience: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        experience: state.profile.experience.filter((item) => item.id !== id),
      },
      isDirty: true,
    }));
  },

  save: async () => {
    const { profile } = get();
    await saveStoredProfile(profile);
    set({ isDirty: false });
  },

  resetToDefault: () => {
    set({ profile: defaultCandidateProfile, isDirty: true });
  },
}));
