import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, FileCheck2, ArrowRight, Globe, Layers } from 'lucide-react';
import { DetectedField } from '../../scanner/types';
import { useProfileStore } from '../../store/profileStore';
import { createProposedFieldFills, ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillReviewTab } from './FillReviewTab';
import { FillSessionReport } from '../../filling/fillCoordinator';
import { GetActiveApplicationTabResponse, PersistentScanTargetContext, DiscoverFramesResponse } from '../../messaging/protocol';

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
  const [inaccessibleFramesCount, setInaccessibleFramesCount] = useState<number>(0);
  const [hasDynamicUpdate, setHasDynamicUpdate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'detected' | 'review'>('detected');
  const [proposedFills, setProposedFills] = useState<ProposedFieldFill[]>([]);
  const [, setLastReport] = useState<FillSessionReport | null>(null);

  // Target tab & persistent target context state
  const [targetTab, setTargetTab] = useState<GetActiveApplicationTabResponse | null>(null);
  const [targetContext, setTargetContext] = useState<PersistentScanTargetContext | null>(null);
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

  // Explicit user action: Start Autofilling with Frame-Aware Discovery
  const handleStartAutofilling = () => {
    setErrorMessage(null);
    setHasDynamicUpdate(false);
    setInaccessibleFramesCount(0);
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

      // Step 2: Discover all eligible frames on the target tab
      chrome.runtime.sendMessage({ type: 'DISCOVER_FRAMES', tabId }, (discoverRes: DiscoverFramesResponse) => {
        const frameIds = discoverRes?.frames && discoverRes.frames.length > 0
          ? discoverRes.frames.map((f) => f.frameId)
          : [0];

        if (discoverRes?.inaccessibleFramesCount) {
          setInaccessibleFramesCount(discoverRes.inaccessibleFramesCount);
        }

        const aggregatedFields: DetectedField[] = [];
        let completedFrames = 0;
        let masterSessionId = '';
        let primaryPlatformId = 'generic';
        const frameSessions: Record<number, string> = {};

        // Scan each frame specifically
        frameIds.forEach((fId) => {
          chrome.tabs.sendMessage(
            tabId,
            { type: 'SCAN_FORM_SUMMARY', frameId: fId },
            { frameId: fId },
            (response) => {
              completedFrames++;
              if (!chrome.runtime.lastError && response && response.fields) {
                if (!masterSessionId && response.scanSessionId) {
                  masterSessionId = response.scanSessionId;
                }
                if (response.scanSessionId) {
                  frameSessions[fId] = response.scanSessionId;
                }
                if (response.platformId && response.platformId !== 'generic') {
                  primaryPlatformId = response.platformId;
                }
                for (const field of response.fields) {
                  field.frameId = fId;
                  field.scanSessionId = response.scanSessionId;
                  // Deduplicate fields that might appear identical across frames
                  const isDuplicate = aggregatedFields.some(
                    (af) => af.id === field.id && af.label === field.label
                  );
                  if (!isDuplicate) {
                    aggregatedFields.push(field);
                  }
                }
              }

              // When all frames have responded
              if (completedFrames === frameIds.length) {
                const sessionId = masterSessionId || `session-${Date.now()}`;
                const currentUrl = tabRes.url || '';
                let currentOrigin = '';
                let currentPath = '';
                try {
                  const parsed = new URL(currentUrl);
                  currentOrigin = parsed.origin;
                  currentPath = parsed.pathname;
                } catch {
                  // Ignore
                }

                // Lock persistent target context for autofill execution
                setTargetContext({
                  tabId,
                  url: currentUrl,
                  origin: currentOrigin,
                  pathname: currentPath,
                  title: tabRes.title || '',
                  domain: tabRes.domain || 'job page',
                  platformId: primaryPlatformId,
                  scanSessionId: sessionId,
                  frameSessions,
                  revision: 1,
                  timestamp: new Date().toISOString(),
                  frameId: 0,
                });

                setScanResult({
                  url: currentUrl,
                  domain: tabRes.domain || 'job page',
                  scanSessionId: sessionId,
                  fields: aggregatedFields,
                });
              }
            }
          );
        });
      });
    });
  };

  const readyCount = proposedFills.filter((f) => f.readinessState === 'ready').length;
  const missingValueCount = proposedFills.filter((f) => f.readinessState === 'missing_profile_value').length;
  const unmappedCount = proposedFills.filter((f) => f.readinessState === 'needs_manual_mapping').length;
  const protectedCount = proposedFills.filter(
    (f) => f.readinessState === 'existing_value_protected' || f.readinessState === 'ambiguous_mapping'
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
          <span>Form fields changed on the target page. Prior scan session invalidated. Click to re-sync.</span>
          <button
            onClick={handleStartAutofilling}
            className="text-xs font-semibold underline hover:text-accent-hover"
          >
            Re-sync Form
          </button>
        </div>
      )}

      {/* Inaccessible cross-origin iframe notification */}
      {inaccessibleFramesCount > 0 && (
        <div className="bg-subtle border border-border-subtle p-3 rounded-lg text-xs text-text-muted flex items-center gap-2">
          <Layers size={14} className="text-accent shrink-0" />
          <span>
            Detected {inaccessibleFramesCount} embedded cross-origin frame(s) that restrict direct browser extension script injection.
          </span>
        </div>
      )}

      {/* Review Tab or Main Assistant Flow */}
      {activeSubTab === 'review' && scanResult && scanResult.fields.length > 0 ? (
        <FillReviewTab
          proposedFills={proposedFills}
          sessionId={sessionId}
          targetContext={targetContext}
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
                <div className="flex items-center justify-between text-text-secondary">
                  <span>
                    Scanned <strong>{scanResult.domain}</strong>
                  </span>
                  <span className="text-[11px] text-text-muted">Session: {scanResult.scanSessionId}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="p-2.5 bg-surface rounded-lg border border-border-subtle">
                    <span className="text-text-muted block text-[10px] font-semibold uppercase">Ready to Fill</span>
                    <span className="text-sm font-bold text-success">{readyCount}</span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-lg border border-border-subtle">
                    <span className="text-text-muted block text-[10px] font-semibold uppercase">Missing Profile</span>
                    <span className="text-sm font-bold text-accent">{missingValueCount}</span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-lg border border-border-subtle">
                    <span className="text-text-muted block text-[10px] font-semibold uppercase">Needs Mapping</span>
                    <span className="text-sm font-bold text-text-muted">{unmappedCount}</span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-lg border border-border-subtle">
                    <span className="text-text-muted block text-[10px] font-semibold uppercase">Protected / Review</span>
                    <span className="text-sm font-bold text-warning">{protectedCount}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveSubTab('review')}
                    className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
                  >
                    <span>Proceed to Review & Fill</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detected Fields List */}
          {scanResult && scanResult.fields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Scanned Controls ({scanResult.fields.length})
              </h3>
              <div className="space-y-2">
                {scanResult.fields.map((f) => (
                  <div key={f.id} className="p-3.5 bg-surface rounded-xl border border-border-subtle text-xs flex items-center justify-between gap-4">
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary truncate">{f.label || 'Unnamed Question'}</span>
                        {f.isRequired && (
                          <span className="text-danger font-bold text-xs" title="Required field">*</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-text-secondary border border-border-subtle">
                          {f.type}
                        </span>
                        {f.frameId !== undefined && f.frameId > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-text-muted border border-border-subtle">
                            Frame {f.frameId}
                          </span>
                        )}
                        {f.platformId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-subtle text-accent border border-border-subtle">
                            {f.platformId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate">
                        Mapped profile field: <code className="text-text-secondary font-mono">{f.mappedProfileKey || 'unmapped'}</code>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          f.confidenceTier === 'high'
                            ? 'bg-success-subtle text-success'
                            : f.confidenceTier === 'medium'
                            ? 'bg-accent-subtle text-accent'
                            : 'bg-subtle text-text-muted'
                        }`}
                      >
                        {f.confidenceTier || 'low'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
