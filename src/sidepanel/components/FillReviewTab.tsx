import React, { useState } from 'react';
import { ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillSessionReport } from '../../filling/fillCoordinator';
import { AlertTriangle, Play, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PersistentScanTargetContext } from '../../messaging/protocol';

interface FillReviewTabProps {
  proposedFills: ProposedFieldFill[];
  sessionId: string;
  targetContext: PersistentScanTargetContext | null;
  onRefreshScan: () => void;
  onFillComplete?: (report: FillSessionReport) => void;
}

export const FillReviewTab: React.FC<FillReviewTabProps> = ({
  proposedFills: initialFills,
  sessionId,
  targetContext,
  onRefreshScan,
  onFillComplete,
}) => {
  const [fills, setFills] = useState<ProposedFieldFill[]>(initialFills);
  const [isFilling, setIsFilling] = useState(false);
  const [fillReport, setFillReport] = useState<FillSessionReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if initialFills updates
  React.useEffect(() => {
    setFills(initialFills);
    setFillReport(null);
  }, [initialFills]);

  const toggleApproval = (identifier: string) => {
    setFills((prev) =>
      prev.map((f) => {
        const idMatch = (f.compositeIdentity && f.compositeIdentity === identifier) || f.fieldId === identifier;
        if (!idMatch) return f;
        const newApproved = !f.approved;
        return {
          ...f,
          approved: newApproved,
          isOverwrite: newApproved ? f.isOverwrite : false,
        };
      })
    );
  };

  const toggleOverwrite = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFills((prev) =>
      prev.map((f) => {
        const idMatch = (f.compositeIdentity && f.compositeIdentity === identifier) || f.fieldId === identifier;
        if (!idMatch) return f;
        const newOverwrite = !f.isOverwrite;
        return {
          ...f,
          isOverwrite: newOverwrite,
          approved: newOverwrite ? true : f.approved,
        };
      })
    );
  };

  const selectAllEligible = () => {
    setFills((prev) =>
      prev.map((f) => ({
        ...f,
        approved: f.isEligibleForPreselection,
        isOverwrite: false,
      }))
    );
  };

  const deselectAll = () => {
    setFills((prev) =>
      prev.map((f) => ({
        ...f,
        approved: false,
        isOverwrite: false,
      }))
    );
  };

  const executeFill = () => {
    setIsFilling(true);
    setErrorMessage(null);
    setFillReport(null);

    // Validate persistent scan target context
    if (!targetContext || !targetContext.tabId) {
      setIsFilling(false);
      setErrorMessage('No persistent scan target lock found. Please scan the form again.');
      return;
    }

    const approvedFills = fills.filter((f) => f.approved);
    if (approvedFills.length === 0) {
      setIsFilling(false);
      setErrorMessage('No fields approved for filling.');
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.get) {
      // Step 1: Verify the locked target tab still exists and URL origin matches
      chrome.tabs.get(targetContext.tabId, (currentTab) => {
        if (chrome.runtime.lastError || !currentTab || !currentTab.url) {
          setIsFilling(false);
          setErrorMessage('Original target application tab was closed. Re-scan required.');
          return;
        }

        try {
          const currentOrigin = new URL(currentTab.url).origin;
          const targetOrigin = new URL(targetContext.url).origin;
          if (currentOrigin !== targetOrigin) {
            setIsFilling(false);
            setErrorMessage(
              `Target tab navigated to a different site (${currentOrigin} vs ${targetOrigin}). Re-scan required.`
            );
            return;
          }
        } catch {
          // Ignore parse errors
        }

        // Step 2: Group instructions by target frameId for frame-specific dispatching
        const instructionsByFrame = new Map<number, typeof approvedFills>();
        for (const f of approvedFills) {
          const fId = f.frameId !== undefined ? f.frameId : targetContext.frameId || 0;
          if (!instructionsByFrame.has(fId)) {
            instructionsByFrame.set(fId, []);
          }
          instructionsByFrame.get(fId)!.push(f);
        }

        const aggregatedResults: FillSessionReport = {
          sessionId,
          timestamp: new Date().toISOString(),
          totalRequested: approvedFills.length,
          filledCount: 0,
          skippedCount: 0,
          failedCount: 0,
          results: [],
        };

        let framesCompleted = 0;
        const totalFramesToDispatch = instructionsByFrame.size;

        instructionsByFrame.forEach((frameFills, fId) => {
          const frameSessionId =
            (targetContext.frameSessions && targetContext.frameSessions[fId]) ||
            frameFills[0]?.scanSessionId ||
            sessionId;

          const frameInstructions = frameFills.map((f) => ({
            fieldId: f.fieldId,
            canonicalKey: f.canonicalKey,
            proposedValue: f.proposedValue,
            scanTimeValue: f.currentValue,
            approved: true, // Strictly validated
            overwriteExisting: Boolean(f.isOverwrite),
            isAmbiguous: Boolean(f.isAmbiguous),
            scanSessionId: frameSessionId,
            frameId: fId,
          }));

          chrome.tabs.sendMessage(
            targetContext.tabId,
            {
              type: 'FILL_APPROVED_FIELDS',
              sessionId: frameSessionId,
              instructions: frameInstructions,
              targetContext: {
                ...targetContext,
                frameId: fId,
                scanSessionId: frameSessionId,
              },
              frameId: fId,
            },
            { frameId: fId },
            (response) => {
              framesCompleted++;
              if (response && response.success && response.report) {
                aggregatedResults.filledCount += response.report.filledCount;
                aggregatedResults.skippedCount += response.report.skippedCount;
                aggregatedResults.failedCount += response.report.failedCount;
                aggregatedResults.results.push(...response.report.results);
              } else {
                aggregatedResults.failedCount += frameInstructions.length;
                for (const instr of frameInstructions) {
                  aggregatedResults.results.push({
                    fieldId: instr.fieldId,
                    status: 'failed',
                    message: response?.error || 'Frame communication failed.',
                  });
                }
              }

              if (framesCompleted === totalFramesToDispatch) {
                setIsFilling(false);
                setFillReport(aggregatedResults);
                if (onFillComplete) {
                  onFillComplete(aggregatedResults);
                }
              }
            }
          );
        });
      });
    } else {
      setIsFilling(false);
      setErrorMessage('Chrome Extension tab API is unavailable in this environment.');
    }
  };

  const approvedCount = fills.filter((f) => f.approved).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Top summary card */}
      <div className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary tracking-tight">Review Proposed Fields</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Verify values before autofilling. AutoApply never auto-submits.
            </p>
          </div>

          <button
            onClick={onRefreshScan}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-subtle transition"
            title="Re-scan Form"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs">
          <div className="space-x-3 text-xs">
            <button onClick={selectAllEligible} className="text-accent font-semibold hover:underline">
              Select Eligible
            </button>
            <span className="text-border-strong">|</span>
            <button onClick={deselectAll} className="text-text-muted hover:text-text-primary hover:underline">
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-text-secondary font-medium">
              {approvedCount} of {fills.length} approved
            </span>

            <button
              onClick={executeFill}
              disabled={isFilling || approvedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-xs transition disabled:opacity-50 shadow-xs"
            >
              <Play size={13} className={isFilling ? 'animate-spin' : ''} />
              <span>
                {isFilling
                  ? 'Filling...'
                  : approvedCount > 0
                  ? `Fill ${approvedCount} Approved Field${approvedCount === 1 ? '' : 's'}`
                  : 'Fill Approved Fields'}
              </span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-danger-subtle border border-border-subtle text-xs text-danger flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Report Summary Card (Post-fill) */}
      {fillReport && (
        <div className="bg-surface rounded-xl p-6 border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" />
            <h3 className="text-xs font-semibold text-text-primary">Autofill Completed</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-subtle p-2.5 rounded-lg border border-border-subtle">
              <span className="block text-sm font-bold text-text-primary">{fillReport.totalRequested}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Requested</span>
            </div>
            <div className="bg-success-subtle p-2.5 rounded-lg border border-border-subtle">
              <span className="block text-sm font-bold text-success">{fillReport.filledCount}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Filled</span>
            </div>
            <div className="bg-subtle p-2.5 rounded-lg border border-border-subtle">
              <span className="block text-sm font-bold text-text-muted">{fillReport.skippedCount}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Skipped</span>
            </div>
            <div className="bg-danger-subtle p-2.5 rounded-lg border border-border-subtle">
              <span className="block text-sm font-bold text-danger">{fillReport.failedCount}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Failed</span>
            </div>
          </div>
        </div>
      )}

      {/* Field Review List */}
      <div className="space-y-2.5">
        {fills.map((field) => {
          const itemKey = field.compositeIdentity || `${field.frameId || 0}:::${field.fieldId}`;
          return (
            <div
              key={itemKey}
              onClick={() => toggleApproval(itemKey)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                field.approved
                  ? 'border-accent bg-surface shadow-xs'
                  : 'border-border-subtle bg-surface hover:bg-subtle/50 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={field.approved}
                    onChange={() => {}} // Controlled by wrapper click
                    className="mt-0.5 rounded text-accent focus:ring-accent border-border-subtle"
                  />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">{field.label || 'Unnamed Question'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-text-secondary border border-border-subtle">
                      {field.canonicalKey}
                    </span>
                    {field.confidenceTier && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          field.confidenceTier === 'high'
                            ? 'bg-success-subtle text-success'
                            : field.confidenceTier === 'medium'
                            ? 'bg-accent-subtle text-accent'
                            : 'bg-danger-subtle text-danger'
                        }`}
                      >
                        {field.confidenceTier}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-text-secondary flex items-center gap-2">
                    <span>Proposed:</span>
                    <strong className="text-text-primary font-medium">
                      {Array.isArray(field.proposedValue)
                        ? field.proposedValue.join(', ')
                        : String(field.proposedValue ?? '')}
                    </strong>
                  </div>

                  {field.currentValue && (
                    <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                      <span>Existing page value:</span>
                      <span className="font-mono bg-subtle px-1.5 py-0.5 rounded">
                        {Array.isArray(field.currentValue) ? field.currentValue.join(', ') : String(field.currentValue)}
                      </span>
                    </div>
                  )}

                  {field.warningReason && (
                    <div className="text-[11px] text-danger flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span>{field.warningReason}</span>
                    </div>
                  )}

                  {field.isAmbiguous && (
                    <div className="text-[11px] text-accent flex items-center gap-1 mt-1">
                      <ShieldAlert size={12} className="shrink-0" />
                      <span>{field.ambiguityReason || 'Ambiguous mapping; requires manual review.'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overwrite Toggle */}
              {field.currentValue && (
                <div
                  onClick={(e) => toggleOverwrite(itemKey, e)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border border-border-subtle hover:bg-subtle transition"
                >
                  <input
                    type="checkbox"
                    checked={field.isOverwrite}
                    onChange={() => {}}
                    className="rounded text-accent focus:ring-accent border-border-subtle"
                  />
                  <span className="text-text-secondary">Overwrite</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
};
