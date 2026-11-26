import React, { useEffect, useState, useCallback } from 'react';
import { useProfileStore } from '../store/profileStore';
import { validateProfile, ProfileCompleteness } from '../utils/validation';
import { createProposedFieldFills, ProposedFieldFill } from '../filling/fieldValueMapper';
import { DetectedField } from '../scanner/types';
import {
  Sparkles,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Power
} from 'lucide-react';

export const PopupApp: React.FC = () => {
  const { profile, loadProfile, isLoading } = useProfileStore();
  const [isDark, setIsDark] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  // Active tab state
  const [activeTabDomain, setActiveTabDomain] = useState<string>('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [proposedFills, setProposedFills] = useState<ProposedFieldFill[]>([]);
  const [scanSessionId, setScanSessionId] = useState<string>('');
  const [isFilling, setIsFilling] = useState(false);
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();

    // Load master enable state from chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['autoapply_enabled'], (res) => {
        if (res.autoapply_enabled !== undefined) {
          setIsEnabled(!!res.autoapply_enabled);
        }
      });
    }
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setCompleteness(validateProfile(profile));
    }
  }, [profile]);

  // Query and scan current tab
  const scanActiveTab = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id && tab.url && !tab.url.startsWith('chrome-extension://')) {
          setActiveTabId(tab.id);
          try {
            setActiveTabDomain(new URL(tab.url).hostname);
          } catch {
            setActiveTabDomain('web page');
          }

          chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FORM_SUMMARY' }, (response) => {
            if (!chrome.runtime.lastError && response?.fields) {
              setDetectedFields(response.fields);
              setScanSessionId(response.scanSessionId || '');
            } else {
              setDetectedFields([]);
            }
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    scanActiveTab();
  }, [scanActiveTab]);

  useEffect(() => {
    if (detectedFields.length > 0 && profile) {
      const fills = createProposedFieldFills(detectedFields, profile);
      setProposedFills(fills);
    } else {
      setProposedFills([]);
    }
  }, [detectedFields, profile]);

  const toggleMasterEnable = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ autoapply_enabled: nextState });
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const openFullDashboard = () => {
    const dashboardUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL('app.html') : 'app.html';
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD_TAB' }, () => {
        if (chrome.runtime.lastError) {
          window.open(dashboardUrl, '_blank');
        }
      });
    } else {
      window.open(dashboardUrl, '_blank');
    }
  };

  const executeQuickFill = () => {
    if (!activeTabId || !scanSessionId) return;

    // Filter only eligible, high-confidence, non-ambiguous fields
    const eligibleFills = proposedFills.filter((f) => f.isEligibleForPreselection);
    if (eligibleFills.length === 0) {
      setFillFeedback('No eligible high-confidence fields to fill.');
      setTimeout(() => setFillFeedback(null), 3000);
      return;
    }

    setIsFilling(true);
    setFillFeedback(null);

    const instructions = eligibleFills.map((f) => ({
      fieldId: f.fieldId,
      canonicalKey: f.canonicalKey,
      proposedValue: f.proposedValue,
      scanTimeValue: f.currentValue,
      overwriteExisting: false,
      isAmbiguous: false,
    }));

    chrome.tabs.sendMessage(
      activeTabId,
      {
        type: 'FILL_APPROVED_FIELDS',
        sessionId: scanSessionId,
        instructions,
      },
      (res) => {
        setIsFilling(false);
        if (chrome.runtime.lastError) {
          setFillFeedback('Could not execute autofill on this page.');
        } else if (res?.report) {
          setFillFeedback(`Filled ${res.report.filledCount} fields!`);
          scanActiveTab();
        } else {
          setFillFeedback('Fill completed.');
        }
        setTimeout(() => setFillFeedback(null), 3500);
      }
    );
  };

  if (isLoading) {
    return (
      <div className="w-[340px] p-6 flex items-center justify-center text-xs text-text-muted bg-canvas">
        Loading AutoApply...
      </div>
    );
  }

  const eligibleCount = proposedFills.filter((f) => f.isEligibleForPreselection).length;
  const percent = completeness?.percentage || 0;

  return (
    <div className={`w-[340px] p-5 font-sans ${isDark ? 'dark bg-canvas text-text-primary' : 'bg-canvas text-text-primary'}`}>
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shadow-xs">
            A
          </div>
          <div>
            <h1 className="text-xs font-bold leading-none tracking-tight">AutoApply</h1>
            <span className="text-[10px] text-text-muted">Autofill Companion</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master Enable/Disable Button */}
          <button
            onClick={toggleMasterEnable}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition ${
              isEnabled
                ? 'bg-accent-subtle text-accent'
                : 'bg-subtle text-text-muted hover:text-text-primary'
            }`}
            title={isEnabled ? 'Extension is active' : 'Extension is paused'}
          >
            <Power size={12} className={isEnabled ? 'text-accent' : 'text-text-muted'} />
            <span>{isEnabled ? 'Enabled' : 'Paused'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-subtle text-text-secondary transition"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="py-4 space-y-3.5">
        {/* Active Page Form Status Card */}
        <div className="bg-surface p-4 rounded-xl border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Target Webpage
            </span>
            {activeTabDomain ? (
              <span className="text-[11px] font-medium text-text-primary truncate max-w-[150px]" title={activeTabDomain}>
                {activeTabDomain}
              </span>
            ) : (
              <span className="text-[11px] text-text-muted">Extension / Blank</span>
            )}
          </div>

          {!isEnabled ? (
            <div className="p-2.5 bg-subtle rounded-lg border border-border-subtle text-xs text-text-muted flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-text-muted" />
              <span>Autofill is paused. Toggle enable above to activate form scanning.</span>
            </div>
          ) : detectedFields.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-text-primary tabular-nums">
                  {detectedFields.length} <span className="text-xs font-normal text-text-muted">fields detected</span>
                </span>
                <span className="text-xs font-semibold text-accent tabular-nums">
                  {eligibleCount} ready to fill
                </span>
              </div>

              {fillFeedback && (
                <div className="p-2 rounded-lg bg-accent-subtle text-accent text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>{fillFeedback}</span>
                </div>
              )}

              {/* Quick Fill Button */}
              <button
                onClick={executeQuickFill}
                disabled={isFilling || eligibleCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
              >
                <Play size={13} />
                <span>{isFilling ? 'Filling fields...' : `Quick Autofill (${eligibleCount} Fields)`}</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-text-muted bg-subtle p-3 rounded-lg border border-dashed border-border-subtle">
              No job application form detected on current tab. Navigate to a job posting to scan fields.
            </div>
          )}
        </div>

        {/* Profile Readiness Meter */}
        <div className="bg-surface p-3.5 rounded-xl border border-border-subtle space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Profile Readiness</span>
            <span className="font-bold text-text-primary tabular-nums">{percent}%</span>
          </div>
          <div className="w-full bg-subtle rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Detailed View / Full Dashboard Bridge Button */}
        <button
          onClick={openFullDashboard}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-subtle hover:bg-surface-muted text-text-primary border border-border-subtle rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Sparkles size={14} className="text-accent" />
          <span>Open Detailed View & Dashboard</span>
          <ExternalLink size={13} className="text-text-muted" />
        </button>
      </div>

      {/* Footer Safety Notice */}
      <footer className="pt-3 border-t border-border-subtle flex items-center justify-between text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-accent" /> Safe & Private
        </span>
        <span>AutoApply v1.0.0</span>
      </footer>
    </div>
  );
};
