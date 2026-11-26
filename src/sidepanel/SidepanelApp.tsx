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
  FileText,
  Settings,
  ExternalLink
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
      <div className="flex h-screen items-center justify-center text-xs text-text-muted bg-canvas">
        Loading candidate profile...
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'dark bg-canvas text-text-primary' : 'bg-canvas text-text-primary'}`}>
      {/* Top Header */}
      <header className="px-4 py-3 bg-surface border-b border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shadow-xs">
            A
          </div>
          <div>
            <h1 className="text-xs font-bold leading-none tracking-tight">AutoApply</h1>
            <span className="text-[10px] text-text-muted">Companion Panel</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => chrome.tabs?.create({ url: chrome.runtime.getURL('app.html') })}
            className="p-1.5 rounded-lg hover:bg-subtle text-text-secondary transition"
            title="Open Full Dashboard"
          >
            <ExternalLink size={15} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-subtle text-text-secondary transition"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs ${
              showSavedToast
                ? 'bg-success text-white'
                : isDirty
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-subtle text-text-muted'
            }`}
          >
            {showSavedToast ? <Check size={14} /> : <Save size={14} />}
            <span>{showSavedToast ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Profile Completeness Ribbon */}
      {completeness && (
        <div className="bg-surface px-4 py-2 border-b border-border-subtle flex items-center justify-between text-[11px]">
          <span className="text-text-muted">Profile Complete</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-subtle rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <span className="font-semibold text-text-primary tabular-nums">
              {completeness.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex overflow-x-auto border-b border-border-subtle bg-surface px-2 py-1 gap-1 shrink-0 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              activeTab === item.key
                ? 'bg-accent-subtle text-accent font-semibold'
                : 'text-text-secondary hover:bg-subtle hover:text-text-primary'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto p-4 bg-canvas">
        {activeTab === 'personal' && <PersonalTab />}
        {activeTab === 'education' && <EducationTab />}
        {activeTab === 'experience' && <ExperienceTab />}
        {activeTab === 'skills' && <SkillsAndLinksTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'resumes' && <ResumesTab />}
        {activeTab === 'assistant' && <FormScannerTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Bottom Status Bar */}
      <footer className="px-4 py-2 bg-surface border-t border-border-subtle text-[10px] text-text-muted flex justify-between items-center shrink-0">
        <span className="text-success font-medium">Local IndexedDB Active</span>
        <span>AutoApply v1.0.0</span>
      </footer>
    </div>
  );
};
