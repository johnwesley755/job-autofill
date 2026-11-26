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
          // If unapproved, also clear overwrite
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
    setFills((prev) => prev.map((f) => ({ ...f, approved: false, isOverwrite: false })));
  };

  const executeFill = () => {
    if (isFilling) return;
    setIsFilling(true);
    setErrorMessage(null);

    const instructions = fills.map((f) => ({
      fieldId: f.fieldId,
      proposedValue: f.proposedValue,
      approved: f.approved && !f.isAmbiguous, // Ambiguous fields are strictly unfillable
      overwriteExisting: Boolean(f.isOverwrite),
      isAmbiguous: f.isAmbiguous,
      scanTimeValue: f.scanTimeValue,
    }));

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          setIsFilling(false);
          setErrorMessage('No active browser tab found to autofill.');
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'EXECUTE_FILL',
            sessionId,
            instructions,
          },
          (response: FillSessionReport) => {
            setIsFilling(false);
            if (chrome.runtime.lastError) {
              setErrorMessage(
                chrome.runtime.lastError.message ||
                  'Failed to communicate with content script on active tab.'
              );
              return;
            }
            if (response) {
              setFillReport(response);
              onFillComplete?.(response);
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
    <div className="space-y-4">
      {/* Top summary card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-100">Review Proposed Fields</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Verify values before autofilling. AutoApply never auto-submits.
            </p>
          </div>

          <button
            onClick={onRefreshScan}
            className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Re-scan Form"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="space-x-2 text-[11px]">
            <button onClick={selectAllEligible} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Select Eligible
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={deselectAll} className="text-gray-500 hover:underline">
              Deselect All
            </button>
          </div>

          <button
            onClick={executeFill}
            disabled={isFilling || approvedCount === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
          >
            <Play size={13} />
            <span>{isFilling ? 'Filling...' : `Autofill ${approvedCount} Fields`}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Fill report summary if available */}
      {fillReport && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
          <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Fill Session Complete</span>
          </div>
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Successfully verified: <strong>{fillReport.filledCount}</strong> · Skipped:{' '}
            <strong>{fillReport.skippedCount}</strong> · Errors: <strong>{fillReport.failedCount}</strong>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="space-y-2">
        {fills.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-6 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
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
              className={`p-3 rounded-xl border bg-white dark:bg-gray-800 text-xs transition cursor-pointer select-none focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                field.approved
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 shadow-xs'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    checked={field.approved}
                    onChange={() => {}} // Controlled via parent click/toggleApproval
                    disabled={field.isAmbiguous}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    aria-label={`Approve fill for ${field.label}`}
                  />

                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-1.5">
                      <span>{field.label}</span>
                      <span className="text-[10px] font-mono text-gray-400">({field.canonicalKey})</span>
                    </div>

                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      Value: &quot;{String(field.proposedValue)}&quot;
                    </div>

                    {field.currentValue !== undefined && field.currentValue !== '' && (
                      <div className="text-[10px] text-gray-500">
                        Current Page Value: &quot;{String(field.currentValue)}&quot;
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      field.confidenceTier === 'high'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
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
                        className="flex items-center space-x-1 text-[10px] text-amber-700 dark:text-amber-400 cursor-pointer hover:underline"
                      >
                        <input
                          type="checkbox"
                          checked={field.isOverwrite}
                          onChange={() => {}}
                          className="h-3 w-3 rounded text-amber-600 border-gray-300"
                        />
                        <span>Overwrite</span>
                      </label>
                    )}
                </div>
              </div>

              {/* Distinct Ambiguity Warning */}
              {field.isAmbiguous && (
                <div className="mt-2 p-1.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] flex items-center space-x-1">
                  <ShieldAlert size={12} className="shrink-0 text-red-500" />
                  <span>Ambiguous Match: {field.warningReason} (Fill prohibited)</span>
                </div>
              )}

              {/* Overwrite Warning */}
              {!field.isAmbiguous && field.warningReason && (
                <div className="mt-2 p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] flex items-center space-x-1">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{field.warningReason}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Safety Notice */}
      <div className="flex items-center space-x-1 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
        <ShieldAlert size={13} className="text-emerald-500" />
        <span>You remain in full control. Always review before submitting.</span>
      </div>
    </div>
  );
};
