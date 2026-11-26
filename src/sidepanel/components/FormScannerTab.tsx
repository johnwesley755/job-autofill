import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, HelpCircle, FileCheck2, ArrowRight } from 'lucide-react';
import { DetectedField } from '../../scanner/types';
import { useProfileStore } from '../../store/profileStore';
import { createProposedFieldFills, ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillReviewTab } from './FillReviewTab';
import { FillSessionReport } from '../../filling/fillCoordinator';

export const FormScannerTab: React.FC = () => {
  const { profile } = useProfileStore();
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDynamicUpdate, setHasDynamicUpdate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'detected' | 'review'>('detected');
  const [proposedFills, setProposedFills] = useState<ProposedFieldFill[]>([]);
  const [, setLastReport] = useState<FillSessionReport | null>(null);
  const [scanResult, setScanResult] = useState<{
    url: string;
    domain: string;
    scanSessionId: string;
    fields: DetectedField[];
  } | null>(null);

  const scanCurrentTab = useCallback((isAuto = false) => {
    setIsScanning(true);
    setErrorMessage(null);
    if (!isAuto) setHasDynamicUpdate(false);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          setIsScanning(false);
          setErrorMessage(chrome.runtime.lastError.message || 'Failed to query active tab.');
          return;
        }

        const tab = tabs[0];
        if (!tab?.id) {
          setIsScanning(false);
          setErrorMessage('No active tab available to scan.');
          return;
        }

        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FORM_SUMMARY' }, (response) => {
          setIsScanning(false);
          if (chrome.runtime.lastError) {
            setErrorMessage(
              'Content script is not running on this tab or tab is restricted. Please navigate to a job application page and refresh.'
            );
            return;
          }

          if (response && response.fields) {
            setScanResult({
              url: response.url || tab.url || '',
              domain: response.domain || new URL(tab.url || 'https://unknown').hostname,
              scanSessionId: response.scanSessionId || `fallback-${Date.now()}`,
              fields: response.fields,
            });
          } else {
            setScanResult({
              url: tab.url || '',
              domain: new URL(tab.url || 'https://unknown').hostname,
              scanSessionId: `empty-${Date.now()}`,
              fields: [],
            });
          }
        });
      });
    } else {
      setIsScanning(false);
      setErrorMessage('Chrome Tabs API is unavailable in this environment.');
    }
  }, []);

  useEffect(() => {
    scanCurrentTab(true);

    const messageListener = (msg: any) => {
      if (msg.type === 'TAB_FORM_MUTATED') {
        setHasDynamicUpdate(true);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, [scanCurrentTab]);

  useEffect(() => {
    if (scanResult && scanResult.fields) {
      const fills = createProposedFieldFills(scanResult.fields, profile);
      setProposedFills(fills);
    } else {
      setProposedFills([]);
    }
  }, [scanResult, profile]);

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
      {/* Subtab Toggle */}
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
          <span>Form fields updated dynamically on the active page.</span>
          <button
            onClick={() => scanCurrentTab(false)}
            className="text-xs font-semibold underline hover:text-accent-hover"
          >
            Re-sync
          </button>
        </div>
      )}

      {activeSubTab === 'review' && scanResult && scanResult.fields.length > 0 ? (
        <FillReviewTab
          proposedFills={proposedFills}
          sessionId={sessionId}
          onRefreshScan={() => scanCurrentTab(false)}
          onFillComplete={(report) => setLastReport(report)}
        />
      ) : (
        <>
          {/* Target status banner */}
          <div className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                </span>
                <span className="text-sm font-semibold text-text-primary">Live Page Scanner</span>
              </div>

              <button
                onClick={() => scanCurrentTab(false)}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                <span>{isScanning ? 'Scanning...' : 'Scan Form'}</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-danger-subtle border border-border-subtle text-xs text-danger">
                {errorMessage}
              </div>
            )}

            {scanResult ? (
              <div className="bg-subtle p-4 rounded-lg border border-border-subtle text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Target Host / Domain:</span>
                  <span className="font-semibold text-text-primary">{scanResult.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Detected Form Controls:</span>
                  <span className="font-semibold text-accent tabular-nums">
                    {scanResult.fields.length} interactive fields
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-muted bg-subtle p-4 rounded-lg border border-dashed border-border-subtle">
                Click "Scan Form" to inspect form inputs on the active browser tab.
              </div>
            )}
          </div>

          {/* Metrics overview */}
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

          {/* Quick link to Review & Fill when mappable fields exist */}
          {proposedFills.length > 0 && (
            <div className="p-4 bg-accent-subtle border border-border-subtle rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-accent">
                  {proposedFills.filter((f) => f.isEligibleForPreselection).length} of {proposedFills.length} Fields Ready for Fill
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                  Review values, ambiguity warnings, and confirm fields before filling.
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('review')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                <span>Review & Fill</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Detected fields breakdown list if scanned */}
          {scanResult && scanResult.fields.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-text-primary tracking-wide">
                Scanned Form Elements ({scanResult.fields.length})
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
              AutoApply never clicks Apply or Submit buttons, never agrees to declarations, and never bypasses CAPTCHAs. All field operations require explicit user approval.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
