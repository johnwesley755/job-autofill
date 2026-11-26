import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export const FormScannerTab: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [tabInfo, setTabInfo] = useState<{ url: string; domain: string; fieldCount: number } | null>(null);

  const scanCurrentTab = () => {
    setIsScanning(true);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FORM_SUMMARY' }, (response) => {
            setIsScanning(false);
            if (response) {
              setTabInfo({
                url: response.url,
                domain: response.domain,
                fieldCount: response.totalFields,
              });
            } else {
              setTabInfo({
                url: tab.url || 'Unknown',
                domain: new URL(tab.url || 'https://unknown').hostname,
                fieldCount: 0,
              });
            }
          });
        } else {
          setIsScanning(false);
        }
      });
    } else {
      setTimeout(() => {
        setIsScanning(false);
        setTabInfo({
          url: 'https://boards.greenhouse.io/demo/jobs/12345',
          domain: 'greenhouse.io',
          fieldCount: 14,
        });
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
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
            onClick={scanCurrentTab}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Scanning...' : 'Scan Form'}</span>
          </button>
        </div>

        {tabInfo ? (
          <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Domain:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{tabInfo.domain}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Detected Form Controls:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{tabInfo.fieldCount} fields</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            Click "Scan Form" to analyze form inputs on the active browser tab.
          </div>
        )}
      </div>

      {/* Side panel metrics overview */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">High Confidence</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 size={16} />
            <span>Ready</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">Review Required</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1">
            <AlertTriangle size={16} />
            <span>Conservative</span>
          </div>
        </div>
      </div>

      {/* Safety & Compliance Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
        <div className="font-semibold flex items-center space-x-1.5">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
          <span>Safety Standard Active</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/80">
          AutoApply adheres to strict safety boundaries: it never automatically clicks submit, never accepts legal declarations, and never bypasses human checks.
        </p>
      </div>
    </div>
  );
};
