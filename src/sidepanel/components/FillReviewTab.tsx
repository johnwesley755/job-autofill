import React, { useState } from 'react';
import { ProposedFieldFill } from '../../filling/fieldValueMapper';
import { FillSessionReport } from '../../filling/fillCoordinator';
import { Check, AlertTriangle, Play, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

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
      prev.map((f) => (f.fieldId === fieldId ? { ...f, approved: !f.approved } : f))
    );
  };

  const selectAllEligible = () => {
    setFills((prev) =>
      prev.map((f) => ({
        ...f,
        approved: f.isEligibleForPreselection,
      }))
    );
  };

  const deselectAll = () => {
    setFills((prev) => prev.map((f) => ({ ...f, approved: false })));
  };

  const executeFill = () => {
    setIsFilling(true);
    setErrorMessage(null);

    const instructions = fills.map((f) => ({
      fieldId: f.fieldId,
      proposedValue: f.proposedValue,
      approved: f.approved,
      overwriteExisting: f.hasConflictOrWarning && f.approved,
    }));

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          setIsFilling(false);
          setErrorMessage('No active tab available.');
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
              setErrorMessage(chrome.runtime.lastError.message || 'Failed to dispatch fill command.');
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
      // Mock execution in test/dev environment
      setTimeout(() => {
        setIsFilling(false);
        const approvedCount = instructions.filter((i) => i.approved).length;
        setFillReport({
          sessionId,
          timestamp: new Date().toISOString(),
          totalRequested: instructions.length,
          filledCount: approvedCount,
          skippedCount: instructions.length - approvedCount,
          failedCount: 0,
          results: instructions.map((i) => ({
            fieldId: i.fieldId,
            status: i.approved ? 'filled' : 'needs_review',
            verifiedValue: i.proposedValue,
            message: i.approved ? 'Verified' : 'Skipped',
          })),
        });
      }, 500);
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
              onClick={() => toggleApproval(field.fieldId)}
              className={`p-3 rounded-xl border bg-white dark:bg-gray-800 text-xs transition cursor-pointer select-none ${
                field.approved
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 shadow-xs'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition ${
                      field.approved
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                    }`}
                  >
                    {field.approved && <Check size={11} />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-1.5">
                      <span>{field.label}</span>
                      <span className="text-[10px] font-mono text-gray-400">({field.canonicalKey})</span>
                    </div>

                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      Value: &quot;{String(field.proposedValue)}&quot;
                    </div>

                    {field.currentValue && (
                      <div className="text-[10px] text-gray-400">
                        Current DOM value: &quot;{String(field.currentValue)}&quot;
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                    field.confidenceTier === 'high'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {(field.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>

              {field.warningReason && (
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
