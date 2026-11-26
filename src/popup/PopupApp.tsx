import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../store/profileStore';
import { LayoutDashboard, UserCheck, ExternalLink, ShieldCheck, Sun, Moon } from 'lucide-react';

export const PopupApp: React.FC = () => {
  const { profile, loadProfile } = useProfileStore();
  const [activeUrl, setActiveUrl] = useState<string>('Detecting current tab...');
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const parsed = new URL(tabs[0].url);
            setActiveUrl(parsed.hostname);
          } catch {
            setActiveUrl(tabs[0].url);
          }
        }
      });
    } else {
      setActiveUrl('localhost (Dev Mode)');
    }
  }, [loadProfile]);

  const openSidepanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.windows) {
      chrome.windows.getCurrent((w) => {
        if (w.id) {
          chrome.sidePanel.open({ windowId: w.id });
          window.close();
        }
      });
    } else {
      window.open('/src/sidepanel/index.html', '_blank');
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`p-4 w-80 space-y-4 ${isDark ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow">
            A
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none">AutoApply Assistant</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Universal ATS Autofill</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-lg p-3 text-xs">
        <div className="font-medium text-blue-900 dark:text-blue-200 flex items-center space-x-1.5">
          <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />
          <span>Active Profile:</span>
        </div>
        <div className="mt-1 font-semibold text-gray-800 dark:text-gray-100">
          {profile.personal.fullName || 'No name set yet'}
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-[11px] truncate">
          {profile.personal.email || 'Click Side Panel to complete profile'}
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="text-gray-500 dark:text-gray-400 font-medium">Target Page:</div>
        <div className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-700 truncate">
          {activeUrl}
        </div>
      </div>

      <div className="pt-1">
        <button
          onClick={openSidepanel}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
        >
          <LayoutDashboard size={15} />
          <span>Open Side Panel Assistant</span>
          <ExternalLink size={13} className="opacity-70" />
        </button>
      </div>

      <div className="flex items-center justify-center space-x-1 text-[11px] text-gray-400 dark:text-gray-500 pt-1">
        <ShieldCheck size={13} className="text-emerald-500" />
        <span>100% Local Storage · Privacy First</span>
      </div>
    </div>
  );
};
