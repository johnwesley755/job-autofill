import { CandidateProfile, defaultCandidateProfile } from '../types/profile';

export const STORAGE_KEYS = {
  PROFILE: 'autoapply_profile',
  THEME: 'autoapply_theme',
  SETTINGS: 'autoapply_settings',
} as const;

export interface ExtensionSettings {
  autoScanEnabled: boolean;
  confidenceThreshold: 'conservative' | 'balanced' | 'aggressive';
  theme: 'system' | 'light' | 'dark';
}

export const defaultSettings: ExtensionSettings = {
  autoScanEnabled: true,
  confidenceThreshold: 'conservative',
  theme: 'system',
};

export async function getStoredProfile(): Promise<CandidateProfile> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
    if (result[STORAGE_KEYS.PROFILE]) {
      return result[STORAGE_KEYS.PROFILE];
    }
  } else if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback to default
      }
    }
  }
  return defaultCandidateProfile;
}

export async function saveStoredProfile(profile: CandidateProfile): Promise<void> {
  const payload = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE]: payload });
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(payload));
  }
}
