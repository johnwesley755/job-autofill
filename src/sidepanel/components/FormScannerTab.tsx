import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertTriangle, HelpCircle, FileCheck2, ArrowRight, Globe } from 'lucide-react';
import { DetectedField } from '../../scanner/types';
import { useProfileStore } from '../../store/profileStore';
import { createProposedFieldFills, ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillReviewTab } from './FillReviewTab';
import { FillSessionReport } from '../../filling/fillCoordinator';
import { GetActiveApplicationTabResponse } from '../../messaging/protocol';

export type AssistantWorkflowState =
  | 'idle'
  | 'locating_target'
  | 'unsupported_page'
  | 'content_script_unavailable'
  | 'scanning'
  | 'scan_complete'
  | 'no_fields_detected'
  | 'filling'
  | 'completed'
  | 'partial_success'
  | 'failed';

export const FormScannerTab: React.FC = () => {
  const { profile } = useProfileStore();
  const [workflowState, setWorkflowState] = useState<AssistantWorkflowState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDynamicUpdate, setHasDynamicUpdate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'detected' | 'review'>('detected');
  const [proposedFills, setProposedFills] = useState<ProposedFieldFill[]>([]);
  const [, setLastReport] = useState<FillSessionReport | null>(null);

  // Target tab state
  const [targetTab, setTargetTab] = useState<GetActiveApplicationTabResponse | null>(null);
  const [scanResult, setScanResult] = useState<{
    url: string;
    domain: string;
    scanSessionId: string;
    fields: DetectedField[];
  } | null>(null);

  // On mount: ONLY check what external application tab exists. NEVER start scanning automatically!
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_APPLICATION_TAB' }, (res) => {
        if (!chrome.runtime.lastError && res) {
          setTargetTab(res);
        }
      });

      const messageListener = (msg: any) => {
        if (msg.type === 'TAB_FORM_MUTATED') {
          setHasDynamicUpdate(true);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, []);

  // Compute proposed fills whenever scan result changes
  useEffect(() => {
    if (scanResult && scanResult.fields) {
      const fills = createProposedFieldFills(scanResult.fields, profile);
      setProposedFills(fills);
      if (fills.length > 0) {
        setWorkflowState('scan_complete');
      } else {
        setWorkflowState('no_fields_detected');
      }
    }
  }, [scanResult, profile]);

  // Explicit user action: Start Autofilling
  const handleStartAutofilling = () => {
    setErrorMessage(null);
    setHasDynamicUpdate(false);
    setWorkflowState('locating_target');

    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.tabs) {
      setWorkflowState('failed');
      setErrorMessage('Chrome Extension APIs unavailable in this environment.');
      return;
    }

    // Step 1: Identify the correct external application tab
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_APPLICATION_TAB' }, (tabRes: GetActiveApplicationTabResponse) => {
      if (chrome.runtime.lastError || !tabRes || !tabRes.tabId) {
        setWorkflowState('unsupported_page');
        setErrorMessage('No active job application tab found. Please open your job application in another tab first.');
        return;
      }

      setTargetTab(tabRes);
      const tabId = tabRes.tabId;
      setWorkflowState('scanning');

      // Step 2: Send SCAN_FORM_SUMMARY to content script on that tab
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_FORM_SUMMARY' }, (response) => {
        if (chrome.runtime.lastError) {
          setWorkflowState('content_script_unavailable');
          setErrorMessage(
            'Cannot communicate with the application page. Please reload the target tab and make sure it is not restricted.'
          );
          return;
        }

        if (response && response.fields) {
          setScanResult({
            url: response.url || tabRes.url || '',
            domain: response.domain || 'job page',
            scanSessionId: response.scanSessionId || `session-${Date.now()}`,
            fields: response.fields,
          });
        } else {
          setScanResult({
            url: tabRes.url || '',
            domain: 'job page',
            scanSessionId: `empty-${Date.now()}`,
            fields: [],
          });
        }
      });
    });
  };

  const highConfidenceCount = proposedFills.filter((f) => f.confidenceTier === 'high').length;
  const reviewCount = proposedFills.filter(
    (f) => f.confidenceTier === 'medium' || f.isAmbiguous || f.hasConflictOrWarning
  ).length;
  const unknownCount = proposedFills.filter(
    (f) => f.confidenceTier === 'low'
  ).length;

  const sessionId = scanResult?.scanSessionId || '';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Subtab Toggle (only visible after scan) */}
      {scanResult && scanResult.fields.length > 0 && (
        <div className="flex border-b border-border-subtle pb-3 gap-2">
          <button
            onClick={() => setActiveSubTab('detected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'detected'
                ? 'bg-accent text-white shadow-xs'
                : 'text-text-secondary hover:bg-subtle hover:text-text-primary'
            }`}
          >
            Detected Fields ({scanResult.fields.length})
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              activeSubTab === 'review'
                ? 'bg-accent text-white shadow-xs'
                : 'text-text-secondary hover:bg-subtle hover:text-text-primary'
            }`}
          >
            <FileCheck2 size={14} />
            <span>Review & Fill ({proposedFills.length})</span>
          </button>
        </div>
      )}

      {/* Dynamic update indicator */}
      {hasDynamicUpdate && (
        <div className="bg-accent-subtle border border-border-subtle p-3 rounded-lg text-xs text-accent flex items-center justify-between">
          <span>Form fields changed on the target page. Click to re-sync.</span>
          <button
            onClick={handleStartAutofilling}
            className="text-xs font-semibold underline hover:text-accent-hover"
          >
            Re-sync Form
          </button>
        </div>
      )}

      {/* Review Tab or Main Assistant Flow */}
      {activeSubTab === 'review' && scanResult && scanResult.fields.length > 0 ? (
        <FillReviewTab
          proposedFills={proposedFills}
          sessionId={sessionId}
          onRefreshScan={handleStartAutofilling}
          onFillComplete={(report) => {
            setLastReport(report);
            setWorkflowState(report.failedCount === 0 ? 'completed' : 'partial_success');
          }}
        />
      ) : (
        <>
          {/* Top Target Application Card */}
          <div className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-text-primary">Target Application Tab</span>
                </div>
                {targetTab?.url ? (
                  <div className="text-xs text-text-secondary flex items-center gap-1.5 truncate max-w-md">
                    <span className="font-medium text-text-primary truncate">{targetTab.title || 'Untitled Page'}</span>
                    <span className="text-text-muted">•</span>
                    <span className="truncate text-text-muted">{targetTab.url}</span>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    Open your application form in another tab to begin.
                  </p>
                )}
              </div>

              {/* Start Autofilling Button (Explicit User Trigger) */}
              <button
                onClick={handleStartAutofilling}
                disabled={workflowState === 'scanning' || workflowState === 'locating_target'}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                <Play size={14} className={workflowState === 'scanning' ? 'animate-spin' : ''} />
                <span>
                  {workflowState === 'scanning'
                    ? 'Scanning Form...'
                    : workflowState === 'locating_target'
                    ? 'Locating Page...'
                    : 'Start Autofilling'}
                </span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-danger-subtle border border-border-subtle text-xs text-danger flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Idle State Explanation */}
            {workflowState === 'idle' && (
              <div className="p-4 rounded-lg bg-subtle border border-dashed border-border-subtle text-xs text-text-muted space-y-1">
                <p className="font-medium text-text-primary">Ready to scan application form</p>
                <p className="leading-relaxed">
                  AutoApply never runs automatic scans in the background without your consent. Click <strong>Start Autofilling</strong> above when you are on the job application page to detect questions, review candidate data matches, and fill fields.
                </p>
              </div>
            )}

            {/* Scan Results Summary */}
            {scanResult && (
              <div className="bg-subtle p-4 rounded-lg border border-border-subtle text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Domain / Platform:</span>
                  <span className="font-semibold text-text-primary">{scanResult.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Detected Form Controls:</span>
                  <span className="font-semibold text-accent tabular-nums">
                    {scanResult.fields.length} interactive fields
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Metrics overview when scanned */}
          {scanResult && scanResult.fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-surface p-4 rounded-xl border border-border-subtle">
                <div className="text-text-muted text-[11px] uppercase tracking-wider font-semibold">High Confidence</div>
                <div className="text-xl font-bold text-success mt-2 flex items-center gap-1.5 tabular-nums">
                  <CheckCircle2 size={16} />
                  <span>{highConfidenceCount}</span>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-border-subtle">
                <div className="text-text-muted text-[11px] uppercase tracking-wider font-semibold">Needs Review</div>
                <div className="text-xl font-bold text-warning mt-2 flex items-center gap-1.5 tabular-nums">
                  <AlertTriangle size={16} />
                  <span>{reviewCount}</span>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-border-subtle">
                <div className="text-text-muted text-[11px] uppercase tracking-wider font-semibold">Unmatched / Custom</div>
                <div className="text-xl font-bold text-text-muted mt-2 flex items-center gap-1.5 tabular-nums">
                  <HelpCircle size={16} />
                  <span>{unknownCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Review Banner Link */}
          {proposedFills.length > 0 && (
            <div className="p-4 bg-accent-subtle border border-border-subtle rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-accent">
                  {proposedFills.filter((f) => f.isEligibleForPreselection).length} of {proposedFills.length} Fields Ready for Fill
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                  Inspect proposed values, check warnings, and click Fill Approved Fields.
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('review')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                <span>Review Fields</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Field Breakdown List */}
          {scanResult && scanResult.fields.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-text-primary tracking-wide">
                Detected Elements ({scanResult.fields.length})
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {scanResult.fields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-lg bg-surface border border-border-subtle text-xs flex justify-between items-center gap-3"
                  >
                    <div className="truncate min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {field.label || field.placeholder || field.name || 'Unnamed control'}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        Type: {field.type} {field.isRequired ? '• Required' : ''}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                        field.confidenceTier === 'high'
                          ? 'bg-success-subtle text-success'
                          : field.confidenceTier === 'medium'
                          ? 'bg-warning-subtle text-warning'
                          : 'bg-subtle text-text-muted'
                      }`}
                    >
                      {field.mappedProfileKey || 'unmapped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety & Compliance Notice */}
          <div className="bg-subtle border border-border-subtle p-4 rounded-xl text-xs text-text-secondary space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-text-primary">
              <AlertTriangle size={15} className="text-warning shrink-0" />
              <span>Automated Submission Prohibited</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              AutoApply will never click Apply or Submit buttons, agree to legal declarations, or attempt CAPTCHA bypassing. All field operations require explicit user approval.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
