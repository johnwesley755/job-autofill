import React, { useState, useEffect } from 'react';
import { dbService, ResumeDocument, MAX_RESUME_SIZE_BYTES } from '../../utils/indexedDb';
import { FileText, Upload, Trash2, Star } from 'lucide-react';

export const ResumesTab: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadResumes = async () => {
    setIsLoading(true);
    try {
      const list = await dbService.getAllResumes();
      setResumes(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load resumes from IndexedDB');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      setErrorMessage('Please upload a PDF or DOCX resume.');
      return;
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setErrorMessage(`Resume exceeds the 5 MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    const doc: ResumeDocument = {
      id: `resume-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      isDefault: resumes.length === 0,
      uploadedAt: new Date().toISOString(),
      data: file,
    };

    try {
      await dbService.saveResume(doc);
      await loadResumes();
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save resume locally');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await dbService.setDefaultResume(id);
      await loadResumes();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to set default resume');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dbService.deleteResume(id);
      await loadResumes();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete resume');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Upload and manage your PDF / DOCX resumes stored locally in IndexedDB.
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Upload button card */}
      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl cursor-pointer bg-white dark:bg-gray-800 transition">
        <Upload size={24} className="text-blue-500 mb-1" />
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Click to upload resume (PDF / DOCX)
        </span>
        <span className="text-[10px] text-gray-400 mt-0.5">Max size 5 MB · Stored 100% locally on your browser</span>
        <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} className="hidden" />
      </label>

      {/* Resumes List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-xs text-gray-400 text-center py-4">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No resumes saved yet.</div>
        ) : (
          resumes.map((r) => (
            <div
              key={r.id}
              className={`p-3 rounded-xl border bg-white dark:bg-gray-800 flex items-center justify-between text-xs ${
                r.isDefault
                  ? 'border-blue-400 dark:border-blue-600 shadow-xs'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate mr-2">
                <FileText className="text-blue-500 shrink-0" size={18} />
                <div className="truncate">
                  <div className="font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center space-x-1.5">
                    <span>{r.name}</span>
                    {r.isDefault && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {(r.size / 1024).toFixed(1)} KB · Added {new Date(r.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {!r.isDefault && (
                  <button
                    onClick={() => handleSetDefault(r.id)}
                    className="p-1.5 text-gray-400 hover:text-amber-500 rounded"
                    title="Set as Default Resume"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Delete Resume"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
