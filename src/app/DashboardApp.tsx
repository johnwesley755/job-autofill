import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../store/profileStore';
import { validateProfile, ProfileCompleteness } from '../utils/validation';
import {
  LayoutDashboard,
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Sliders,
  FileText,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Save,
  Check,
  Menu,
  X
} from 'lucide-react';

import { DashboardOverview } from './components/DashboardOverview';
import { PersonalTab } from '../sidepanel/components/PersonalTab';
import { EducationTab } from '../sidepanel/components/EducationTab';
import { ExperienceTab } from '../sidepanel/components/ExperienceTab';
import { SkillsAndLinksTab } from '../sidepanel/components/SkillsAndLinksTab';
import { PreferencesTab } from '../sidepanel/components/PreferencesTab';
import { ResumesTab } from '../sidepanel/components/ResumesTab';
import { FormScannerTab } from '../sidepanel/components/FormScannerTab';
import { SettingsTab } from '../sidepanel/components/SettingsTab';

export type DashboardTabKey =
  | 'overview'
  | 'personal'
  | 'education'
  | 'experience'
  | 'skills'
  | 'preferences'
  | 'resumes'
  | 'assistant'
  | 'settings';

export const DashboardApp: React.FC = () => {
  const { profile, loadProfile, save, isDirty, isLoading } = useProfileStore();
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('overview');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { key: 'overview' as DashboardTabKey, label: 'Overview', icon: LayoutDashboard },
        { key: 'personal' as DashboardTabKey, label: 'Personal Details', icon: User },
        { key: 'education' as DashboardTabKey, label: 'Education', icon: GraduationCap },
        { key: 'experience' as DashboardTabKey, label: 'Experience', icon: Briefcase },
        { key: 'skills' as DashboardTabKey, label: 'Skills & Links', icon: Code2 },
        { key: 'preferences' as DashboardTabKey, label: 'Job Preferences', icon: Sliders },
        { key: 'resumes' as DashboardTabKey, label: 'Resume Library', icon: FileText },
      ],
    },
    {
      title: 'APPLICATION TOOLS',
      items: [
        { key: 'assistant' as DashboardTabKey, label: 'Form Assistant', icon: Sparkles },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { key: 'settings' as DashboardTabKey, label: 'Settings', icon: Settings },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-muted bg-canvas">
        Loading AutoApply candidate data...
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview onNavigate={(t) => setActiveTab(t)} />;
      case 'personal':
        return <PersonalTab />;
      case 'education':
        return <EducationTab />;
      case 'experience':
        return <ExperienceTab />;
      case 'skills':
        return <SkillsAndLinksTab />;
      case 'preferences':
        return <PreferencesTab />;
      case 'resumes':
        return <ResumesTab />;
      case 'assistant':
        return <FormScannerTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardOverview onNavigate={(t) => setActiveTab(t)} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDark ? 'dark bg-canvas text-text-primary' : 'bg-canvas text-text-primary'}`}>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-text flex items-center justify-center font-bold text-sm">
            A
          </div>
          <span className="font-bold text-base tracking-tight">AutoApply</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:bg-subtle transition"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-text-secondary hover:bg-subtle transition"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-surface border-r border-border-subtle flex flex-col justify-between shrink-0 transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Brand Header */}
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-text flex items-center justify-center font-bold text-base shadow-xs">
                A
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary leading-tight">AutoApply</h2>
                <span className="text-[11px] text-text-muted">Application Dashboard</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6 flex-1">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold text-text-muted tracking-wider">
                  {sec.title}
                </div>
                <div className="space-y-0.5 pt-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveTab(item.key);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                          isActive
                            ? 'bg-accent-subtle text-accent font-semibold'
                            : 'text-text-secondary hover:bg-subtle hover:text-text-primary'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-accent' : 'text-text-muted'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User & Save Footer */}
          <div className="p-4 border-t border-border-subtle space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-text-muted">Profile Complete</span>
              <span className="text-xs font-semibold text-text-primary tabular-nums">
                {completeness?.percentage || 0}%
              </span>
            </div>
            <div className="w-full bg-subtle rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all"
                style={{ width: `${completeness?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main App Body */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Top Desktop Action Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-surface border-b border-border-subtle shrink-0">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              AutoApply Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:bg-subtle transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isDirty && (
              <span className="text-xs text-warning flex items-center gap-1 font-medium mr-1">
                Unsaved edits
              </span>
            )}

            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs ${
                showSavedToast
                  ? 'bg-success text-white'
                  : 'bg-accent hover:bg-accent-hover text-white'
              }`}
            >
              {showSavedToast ? <Check size={14} /> : <Save size={14} />}
              <span>{showSavedToast ? 'Saved' : 'Save Changes'}</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
