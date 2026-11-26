import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../store/profileStore';
import { validateProfile, ProfileCompleteness } from '../utils/validation';
import {
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Sliders,
  Sparkles,
  Save,
  Check,
  Sun,
  Moon,
  Info,
  FileText,
  Settings
} from 'lucide-react';
import { PersonalTab } from './components/PersonalTab';
import { EducationTab } from './components/EducationTab';
import { ExperienceTab } from './components/ExperienceTab';
import { SkillsAndLinksTab } from './components/SkillsAndLinksTab';
import { PreferencesTab } from './components/PreferencesTab';
import { FormScannerTab } from './components/FormScannerTab';
import { ResumesTab } from './components/ResumesTab';
import { SettingsTab } from './components/SettingsTab';

type TabKey = 'personal' | 'education' | 'experience' | 'skills' | 'preferences' | 'resumes' | 'assistant' | 'settings';

export const SidepanelApp: React.FC = () => {
  const { profile, loadProfile, save, isDirty, isLoading } = useProfileStore();
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setCompleteness(validateProfile(profile));
    }
  }, [profile]);

  const handleSave = async () => {
    await save();
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'personal', label: 'Personal', icon: <User size={15} /> },
    { key: 'education', label: 'Education', icon: <GraduationCap size={15} /> },
    { key: 'experience', label: 'Experience', icon: <Briefcase size={15} /> },
    { key: 'skills', label: 'Skills & Links', icon: <Code2 size={15} /> },
    { key: 'preferences', label: 'Job Prefs', icon: <Sliders size={15} /> },
    { key: 'resumes', label: 'Resumes', icon: <FileText size={15} /> },
    { key: 'assistant', label: 'Scan Form', icon: <Sparkles size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-xs text-gray-500">
        Loading candidate profile...
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Header */}
      <header className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            A
          </div>
          <div>
            <h1 className="text-xs font-bold leading-none tracking-tight">AutoApply Assistant</h1>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Universal Form Scanner</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-xs ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {showSavedToast ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
            <span>{showSavedToast ? 'Saved!' : 'Save Profile'}</span>
          </button>
        </div>
      </header>

      {/* Completeness Bar */}
      {completeness && (
        <div className="bg-white dark:bg-gray-900 px-4 py-1.5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center space-x-2 flex-1 mr-3">
            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">Completeness:</span>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  completeness.percentage >= 80
                    ? 'bg-emerald-500'
                    : completeness.percentage >= 50
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
          </div>
          <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">
            {completeness.percentage}%
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex px-2 py-1.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar space-x-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === item.key
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'personal' && <PersonalTab />}
        {activeTab === 'education' && <EducationTab />}
        {activeTab === 'experience' && <ExperienceTab />}
        {activeTab === 'skills' && <SkillsAndLinksTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'resumes' && <ResumesTab />}
        {activeTab === 'assistant' && <FormScannerTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Bottom Status bar */}
      <footer className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
        <div className="flex items-center space-x-1">
          <Info size={12} />
          <span>Local IndexedDB & Storage</span>
        </div>
        <div className="font-mono text-[10px]">v1.0.0</div>
      </footer>
    </div>
  );
};
