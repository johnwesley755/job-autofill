import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, HelpCircle, FileCheck2 } from 'lucide-react';
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
      setTimeout(() => {
        setIsScanning(false);
        setScanResult({
          url: 'http://localhost/demo-form',
          domain: 'localhost',
          scanSessionId: `mock-session-${Date.now()}`,
          fields: [],
        });
      }, 300);
    }
  }, []);

  // Update proposed fills whenever scan result or profile changes
  useEffect(() => {
    if (scanResult && scanResult.fields.length > 0 && profile) {
      const fills = createProposedFieldFills(scanResult.fields, profile);
      setProposedFills(fills);
    } else {
      setProposedFills([]);
    }
  }, [scanResult, profile]);

  // Listen for dynamic form mutations broadcast by background worker
  useEffect(() => {
    const handleRuntimeMessage = (message: any) => {
      if (message.type === 'TAB_FORM_MUTATED') {
        setHasDynamicUpdate(true);
        // Automatically re-scan to keep fields up to date without submitting
        scanCurrentTab(true);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      };
    }
  }, [scanCurrentTab]);

  const highConfidenceCount = scanResult?.fields.filter((f) => f.confidenceTier === 'high').length || 0;
  const reviewCount = scanResult?.fields.filter((f) => f.confidenceTier === 'medium').length || 0;
  const unknownCount = scanResult?.fields.filter((f) => f.confidenceTier === 'low' || !f.confidenceTier).length || 0;
  const sessionId = scanResult?.scanSessionId || 'no-session';

  return (
    <div className="space-y-4">
      {/* Subtab Toggle */}
      {scanResult && scanResult.fields.length > 0 && (
        <div className="flex border-b border-gray-200 dark:border-gray-750 pb-2 space-x-2">
          <button
            onClick={() => setActiveSubTab('detected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'detected'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Detected Fields ({scanResult.fields.length})
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeSubTab === 'review'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FileCheck2 size={13} />
            <span>Review & Fill ({proposedFills.length})</span>
          </button>
        </div>
      )}

      {/* Dynamic update indicator */}
      {hasDynamicUpdate && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-850 p-2 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <span>Form fields updated dynamically on the active page.</span>
          <button
            onClick={() => scanCurrentTab(false)}
            className="text-[11px] font-semibold underline hover:text-blue-800"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">Live Page Scanner</span>
              </div>

              <button
                onClick={() => scanCurrentTab(false)}
                disabled={isScanning}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
              >
                <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
                <span>{isScanning ? 'Scanning...' : 'Scan Form'}</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            {scanResult ? (
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Domain:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{scanResult.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Detected Form Controls:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {scanResult.fields.length} fields
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                Click "Scan Form" to analyze form inputs on the active browser tab.
              </div>
            )}
          </div>

          {/* Side panel metrics overview */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">High Conf</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 size={14} />
                <span>{highConfidenceCount}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Needs Review</div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1">
                <AlertTriangle size={14} />
                <span>{reviewCount}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Uncertain</div>
              <div className="text-base font-bold text-gray-400 mt-1 flex items-center space-x-1">
                <HelpCircle size={14} />
                <span>{unknownCount}</span>
              </div>
            </div>
          </div>

          {/* Quick link to Review & Fill when mappable fields exist */}
          {proposedFills.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  {proposedFills.filter((f) => f.isEligibleForPreselection).length} of {proposedFills.length} Fields Ready
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300">
                  Review matched values and approve fills.
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('review')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs"
              >
                Review & Fill
              </button>
            </div>
          )}

          {/* Detected fields breakdown list if scanned */}
          {scanResult && scanResult.fields.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Scanned Elements ({scanResult.fields.length})
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {scanResult.fields.map((field) => (
                  <div
                    key={field.id}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs flex justify-between items-center"
                  >
                    <div className="truncate mr-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {field.label || field.placeholder || field.name || 'Unnamed field'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Type: {field.type} {field.isRequired ? '· Required' : ''}
                      </div>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        field.confidenceTier === 'high'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : field.confidenceTier === 'medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {field.mappedProfileKey || 'unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety & Compliance Notice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Automated Submission Prohibited</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/80">
              AutoApply never clicks Apply or Submit buttons, never accepts terms/declarations, and never solves CAPTCHAs.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
