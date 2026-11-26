import React, { useState } from 'react';
import { ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillSessionReport } from '../../filling/fillCoordinator';
import { AlertTriangle, Play, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface FillReviewTabProps {
  proposedFills: ProposedFieldFill[];
  sessionId: string;
  onRefreshScan: () => void;
  onFillComplete?: (report: FillSessionReport) => void;
}

export const FillReviewTab: React.FC<FillReviewTabProps> = ({
  proposedFills: initialFills,
  sessionId,
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

  const toggleApproval = (fieldId: string) => {
    setFills((prev) =>
      prev.map((f) => {
        if (f.fieldId !== fieldId) return f;
        const newApproved = !f.approved;
        return {
          ...f,
          approved: newApproved,
          isOverwrite: newApproved ? f.isOverwrite : false,
        };
      })
    );
  };

  const toggleOverwrite = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFills((prev) =>
      prev.map((f) => {
        if (f.fieldId !== fieldId) return f;
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

    const approvedFills = fills.filter((f) => f.approved);
    if (approvedFills.length === 0) {
      setIsFilling(false);
      setErrorMessage('No fields approved for filling.');
      return;
    }

    const instructions = approvedFills.map((f) => ({
      fieldId: f.fieldId,
      canonicalKey: f.canonicalKey,
      proposedValue: f.proposedValue,
      scanTimeValue: f.currentValue,
      approved: true, // Strictly validated
      overwriteExisting: Boolean(f.isOverwrite),
      isAmbiguous: Boolean(f.isAmbiguous),
      scanSessionId: sessionId,
    }));

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_APPLICATION_TAB' }, (target) => {
        const targetTabId = target?.tabId;
        if (!targetTabId) {
          setIsFilling(false);
          setErrorMessage('Target application tab is no longer active. Please re-scan.');
          return;
        }

        chrome.tabs.sendMessage(
          targetTabId,
          {
            type: 'FILL_APPROVED_FIELDS',
            sessionId,
            instructions,
          },
          (response) => {
            setIsFilling(false);
            if (chrome.runtime.lastError) {
              setErrorMessage(
                chrome.runtime.lastError.message || 'Failed to communicate with content script on target page.'
              );
              return;
            }

            if (response && response.success && response.report) {
              setFillReport(response.report);
              if (onFillComplete) {
                onFillComplete(response.report);
              }
            } else if (response && response.error) {
              setErrorMessage(`Fill execution error: ${response.error}`);
            } else {
              setErrorMessage('Fill command completed without confirmation report.');
            }
          }
        );
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

          <button
            onClick={executeFill}
            disabled={isFilling || approvedCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
          >
            <Play size={13} />
            <span>{isFilling ? 'Filling...' : `Autofill ${approvedCount} Fields`}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-danger-subtle border border-border-subtle text-xs text-danger">
          {errorMessage}
        </div>
      )}

      {/* Fill report summary if available */}
      {fillReport && (
        <div className="p-4 bg-success-subtle border border-border-subtle rounded-xl text-xs space-y-1">
          <div className="font-semibold text-success flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-success" />
            <span>Fill Session Complete</span>
          </div>
          <div className="text-xs text-text-secondary tabular-nums">
            Successfully verified: <strong>{fillReport.filledCount}</strong> • Skipped:{' '}
            <strong>{fillReport.skippedCount}</strong> • Errors: <strong>{fillReport.failedCount}</strong>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="space-y-2.5">
        {fills.length === 0 ? (
          <div className="text-xs text-text-muted text-center py-8 bg-surface rounded-xl border border-dashed border-border-subtle p-6">
            No mappable candidate fields identified on this form.
          </div>
        ) : (
          fills.map((field) => (
            <div
              key={field.fieldId}
              tabIndex={0}
              role="button"
              aria-label={`Toggle approval for ${field.label}`}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleApproval(field.fieldId);
                }
              }}
              onClick={() => toggleApproval(field.fieldId)}
              className={`p-4 rounded-xl border bg-surface text-xs transition cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-accent ${
                field.approved
                  ? 'border-accent bg-accent-subtle shadow-xs'
                  : 'border-border-subtle hover:border-border-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={field.approved}
                    onChange={() => {}}
                    disabled={field.isAmbiguous}
                    className="mt-0.5 h-4 w-4 rounded border-border-subtle text-accent focus:ring-accent cursor-pointer"
                    aria-label={`Approve fill for ${field.label}`}
                  />

                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5 truncate">
                      <span className="truncate">{field.label}</span>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">({field.canonicalKey})</span>
                    </div>

                    <div className="text-xs text-accent font-medium">
                      Value: &quot;{String(field.proposedValue)}&quot;
                    </div>

                    {field.currentValue !== undefined && field.currentValue !== '' && (
                      <div className="text-[11px] text-text-muted">
                        Current Page Value: &quot;{String(field.currentValue)}&quot;
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                      field.confidenceTier === 'high'
                        ? 'bg-success-subtle text-success'
                        : 'bg-warning-subtle text-warning'
                    }`}
                  >
                    {(field.confidenceScore * 100).toFixed(0)}%
                  </span>

                  {/* Explicit Overwrite Checkbox if field has existing value */}
                  {field.currentValue !== undefined &&
                    field.currentValue !== '' &&
                    !field.isAmbiguous && (
                      <label
                        onClick={(e) => toggleOverwrite(field.fieldId, e)}
                        className="flex items-center gap-1 text-[11px] text-warning cursor-pointer hover:underline"
                      >
                        <input
                          type="checkbox"
                          checked={field.isOverwrite}
                          onChange={() => {}}
                          className="h-3 w-3 rounded text-accent border-border-subtle"
                        />
                        <span>Overwrite</span>
                      </label>
                    )}
                </div>
              </div>

              {/* Distinct Ambiguity Warning */}
              {field.isAmbiguous && (
                <div className="mt-2.5 p-2 rounded-lg bg-danger-subtle text-danger text-[11px] flex items-center gap-1.5">
                  <ShieldAlert size={13} className="shrink-0" />
                  <span>Ambiguous Match: {field.warningReason} (Automatic fill prohibited)</span>
                </div>
              )}

              {/* Overwrite Warning */}
              {!field.isAmbiguous && field.warningReason && (
                <div className="mt-2.5 p-2 rounded-lg bg-warning-subtle text-warning text-[11px] flex items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{field.warningReason}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Safety Notice */}
      <div className="flex items-center gap-2 text-xs text-text-muted pt-2">
        <ShieldAlert size={14} className="text-accent shrink-0" />
        <span>You remain in full control. Always inspect before submitting.</span>
      </div>
    </div>
  );
};
