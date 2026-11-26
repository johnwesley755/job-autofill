import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { validateProfile, ProfileCompleteness } from '../../utils/validation';
import { dbService, ResumeDocument } from '../../utils/indexedDb';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  FileText,
  User,
  AlertCircle,
  ExternalLink,
  Layers
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigate: (tab: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { profile } = useProfileStore();
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [activeTabInfo, setActiveTabInfo] = useState<{ title?: string; url?: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setCompleteness(validateProfile(profile));
    }
  }, [profile]);

  useEffect(() => {
    dbService.getAllResumes().then(setResumes).catch(() => setResumes([]));

    // Safely query current active browser tab if Chrome APIs available
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, lastFocusedWindow: false }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const tab = tabs[0];
          // Filter out extension URLs to show external job page if available
          if (tab.url && !tab.url.startsWith('chrome-extension://')) {
            setActiveTabInfo({ title: tab.title, url: tab.url });
          }
        }
      });
    }
  }, []);

  const defaultResume = resumes.find((r) => r.isDefault) || resumes[0];
  const percent = completeness?.percentage || 0;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Welcome & Objective Bar */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck size={13} />
            <span>Privacy-Preserving Autofill</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Welcome{profile?.personal?.firstName ? `, ${profile.personal.firstName}` : ''}
          </h1>
          <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
            Manage your candidate profile, store resumes securely on your device, and review detected ATS form fields before filling.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => onNavigate('assistant')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg shadow-xs transition"
          >
            <Sparkles size={16} />
            <span>Open Form Assistant</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Metrics & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Readiness Card */}
        <div className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">Candidate Profile</span>
              <User size={16} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-text-primary tabular-nums">{percent}%</span>
              <span className="text-xs text-text-secondary">Readiness</span>
            </div>
            <div className="w-full bg-subtle rounded-full h-2 mb-3 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            {completeness?.missingCrucialFields && completeness.missingCrucialFields.length > 0 ? (
              <p className="text-xs text-text-muted">
                Missing: {completeness.missingCrucialFields.slice(0, 3).join(', ')}
                {completeness.missingCrucialFields.length > 3 ? ` +${completeness.missingCrucialFields.length - 3} more` : ''}
              </p>
            ) : (
              <p className="text-xs text-success flex items-center gap-1 font-medium">
                <FileCheck2 size={13} /> All essential fields completed
              </p>
            )}
          </div>
          <button
            onClick={() => onNavigate('personal')}
            className="mt-5 text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 self-start"
          >
            Edit Profile <ArrowRight size={12} />
          </button>
        </div>

        {/* Resume Library Summary */}
        <div className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">Resume Repository</span>
              <FileText size={16} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-text-primary tabular-nums">{resumes.length}</span>
              <span className="text-xs text-text-secondary">Saved Documents</span>
            </div>
            {defaultResume ? (
              <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary truncate max-w-[170px]" title={defaultResume.name}>
                    {defaultResume.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-subtle text-accent font-semibold">
                    Default
                  </span>
                </div>
                <div className="text-[11px] text-text-muted tabular-nums">
                  {(defaultResume.size / 1024).toFixed(1)} KB • IndexedDB Local
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">No resume uploaded yet.</p>
            )}
          </div>
          <button
            onClick={() => onNavigate('resumes')}
            className="mt-5 text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 self-start"
          >
            Manage Resumes <ArrowRight size={12} />
          </button>
        </div>

        {/* Current Target Tab Status */}
        <div className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Browser Context</span>
              <Layers size={16} />
            </div>
            {activeTabInfo?.url ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary truncate" title={activeTabInfo.title}>
                  {activeTabInfo.title || 'Untitled Job Page'}
                </div>
                <div className="text-xs text-text-secondary truncate flex items-center gap-1">
                  <ExternalLink size={12} className="shrink-0 text-text-muted" />
                  <span className="truncate">{activeTabInfo.url}</span>
                </div>
                <p className="text-xs text-text-muted pt-1">
                  Ready for Universal DOM form inspection in the Form Assistant.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">No External Page Target</p>
                <p className="text-xs text-text-muted">
                  Open a job application page in another tab, then navigate to Form Assistant.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate('assistant')}
            className="mt-5 text-xs text-accent font-semibold hover:underline inline-flex items-center gap-1 self-start"
          >
            Inspect Active Page <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Safety & Compliance Policy Card */}
      <div className="bg-subtle border border-border-subtle rounded-xl p-5 flex items-start gap-3.5 text-xs text-text-secondary">
        <AlertCircle size={17} className="text-text-muted shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">Safety and Compliance Policy</p>
          <p className="leading-relaxed">
            AutoApply will never automatically submit job applications, click "Apply", agree to legal declarations, or attempt CAPTCHA bypassing. All form inputs require your explicit verification before filling.
          </p>
        </div>
      </div>
    </div>
  );
};
