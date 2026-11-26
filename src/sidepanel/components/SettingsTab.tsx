import React, { useRef, useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { exportProfileToJson, importProfileFromJson } from '../../utils/validation';
import { Download, Upload, Shield, Check, AlertCircle } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const { profile, loadProfile } = useProfileStore();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportProfileToJson(profile));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `candidate-profile-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setStatusMessage({ text: 'Profile exported successfully.', type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = importProfileFromJson(content);
      if (res.success && res.profile) {
        useProfileStore.setState({ profile: res.profile, isDirty: true });
        await useProfileStore.getState().save();
        await loadProfile();
        setStatusMessage({ text: 'Profile imported successfully!', type: 'success' });
      } else {
        setStatusMessage({ text: res.error || 'Import failed', type: 'error' });
      }
      setTimeout(() => setStatusMessage(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Privacy Notice */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-800 dark:text-gray-100">
          <Shield size={16} className="text-emerald-500" />
          <span>Local Data & Privacy Controls</span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          All your candidate data and uploaded resumes are preserved strictly on your local browser machine via Chrome
          Local Storage and IndexedDB. Nothing is ever sent to remote analytics or third parties.
        </p>
      </section>

      {/* Export / Import */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100">Backup & Transfer</h3>

        {statusMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center space-x-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleExport}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg font-medium transition"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg font-medium transition"
          >
            <Upload size={14} />
            <span>Import JSON</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </section>
    </div>
  );
};
