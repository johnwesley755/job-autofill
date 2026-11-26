import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Check, AlertCircle } from 'lucide-react';
import { dbService, ResumeDocument, MAX_RESUME_SIZE_BYTES } from '../../utils/indexedDb';

export const ResumesTab: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const list = await dbService.getAllResumes();
      setResumes(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to access IndexedDB storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setErrorMsg(`Resume file size exceeds maximum limit of 5 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      e.target.value = '';
      return;
    }

    try {
      const isFirst = resumes.length === 0;
      const doc: ResumeDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        isDefault: isFirst,
        uploadedAt: new Date().toISOString(),
        data: file,
      };
      await dbService.saveResume(doc);
      setSuccessMsg(`Successfully uploaded and verified "${file.name}".`);
      await loadResumes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving resume to local IndexedDB.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await dbService.setDefaultResume(id);
      await loadResumes();
      setSuccessMsg('Default resume updated.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update default resume.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from local storage?`)) return;
    try {
      await dbService.deleteResume(id);
      await loadResumes();
      setSuccessMsg(`Deleted "${name}".`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete resume.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">Resume Document Repository</h2>
          <p className="text-xs text-text-muted">
            Files are stored privately as raw binary blobs in local browser IndexedDB.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition self-start">
          <Upload size={14} />
          <span>Upload PDF or DOCX</span>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {errorMsg && (
        <div className="p-3 bg-danger-subtle border border-border-subtle rounded-lg flex items-center gap-2 text-danger text-xs">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-success-subtle border border-border-subtle rounded-lg flex items-center gap-2 text-success text-xs font-medium">
          <Check size={15} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-xs text-text-muted">Accessing local IndexedDB...</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border-subtle p-6">
          <FileText className="mx-auto text-text-muted mb-3" size={36} />
          <p className="text-xs font-medium text-text-primary mb-1">No resumes uploaded yet.</p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Upload your PDF or DOCX resume to enable local resume attachment in job applications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((doc) => (
            <div
              key={doc.id}
              className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                doc.isDefault
                  ? 'bg-surface border-accent'
                  : 'bg-surface border-border-subtle hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    doc.isDefault ? 'bg-accent text-white' : 'bg-subtle text-text-secondary'
                  }`}
                >
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary truncate" title={doc.name}>
                      {doc.name}
                    </span>
                    {doc.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-subtle text-accent text-[10px] font-semibold">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted tabular-nums">
                    {(doc.size / 1024).toFixed(1)} KB • {doc.type.includes('pdf') ? 'PDF' : 'DOCX'} • Added on{' '}
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!doc.isDefault && (
                  <button
                    onClick={() => handleSetDefault(doc.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary hover:bg-subtle hover:text-text-primary transition"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-subtle transition"
                  title="Delete resume"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
