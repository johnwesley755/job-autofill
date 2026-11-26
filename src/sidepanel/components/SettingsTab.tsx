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
    <div className="space-y-6 max-w-4xl">
      {/* Privacy Notice */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
          <Shield size={18} className="text-accent" />
          <span>Local Storage & Data Privacy</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          All your candidate data and uploaded resumes are stored strictly on your local browser machine via Chrome
          Local Storage and IndexedDB. No external telemetry, tracking, or remote database services are accessed.
        </p>
      </section>

      {/* Export / Import */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4">
        <div>
          <h3 className="text-sm font-bold text-text-primary tracking-tight">Backup & Transfer</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Export your candidate profile to JSON or restore from a previously exported backup file.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-success-subtle text-success border border-border-subtle'
                : 'bg-danger-subtle text-danger border border-border-subtle'
            }`}
          >
            {statusMessage.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-subtle hover:bg-surface-muted text-text-primary border border-border-subtle rounded-lg font-medium transition"
          >
            <Download size={15} />
            <span>Export Profile JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-subtle hover:bg-surface-muted text-text-primary border border-border-subtle rounded-lg font-medium transition"
          >
            <Upload size={15} />
            <span>Import Profile JSON</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </section>
    </div>
  );
};
