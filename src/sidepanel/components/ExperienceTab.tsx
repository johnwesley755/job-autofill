import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { ExperienceRecord } from '../../types/profile';
import { Plus, Trash2, Briefcase } from 'lucide-react';

export const ExperienceTab: React.FC = () => {
  const { profile, addExperience, updateExperience, removeExperience } = useProfileStore();

  const handleAddNew = () => {
    const newEntry: ExperienceRecord = {
      id: crypto.randomUUID(),
      company: '',
      jobTitle: '',
      type: 'full-time',
      startDate: '',
      isCurrent: true,
      description: '',
    };
    addExperience(newEntry);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition';
  const labelClass = 'block font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">Work Experience</h2>
          <p className="text-xs text-text-muted">Document professional roles, internships, and duties.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition"
        >
          <Plus size={14} />
          <span>Add Position</span>
        </button>
      </div>

      {profile.experience.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border-subtle p-6">
          <Briefcase className="mx-auto text-text-muted mb-3" size={32} />
          <p className="text-xs font-medium text-text-primary mb-1">No employment entries added yet.</p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            If you are a fresher, you can indicate this under Job Preferences.
          </p>
        </div>
      ) : (
        profile.experience.map((exp, idx) => (
          <div
            key={exp.id}
            className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4 relative"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Position #{idx + 1} {exp.isCurrent && '• Current Role'}
              </span>
              <button
                onClick={() => removeExperience(exp.id)}
                className="text-text-muted hover:text-danger transition p-1 rounded-md hover:bg-subtle"
                title="Delete position"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className={labelClass}>Company / Employer *</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Job Title *</label>
                <input
                  type="text"
                  value={exp.jobTitle}
                  onChange={(e) => updateExperience(exp.id, { jobTitle: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Employment Type</label>
                <select
                  value={exp.type}
                  onChange={(e) =>
                    updateExperience(exp.id, {
                      type: e.target.value as 'full-time' | 'contract' | 'internship',
                    })
                  }
                  className={inputClass}
                >
                  <option value="full-time">Full-time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={exp.isCurrent}
                    onChange={(e) => updateExperience(exp.id, { isCurrent: e.target.checked })}
                    className="rounded border-border-subtle text-accent focus:ring-accent h-4 w-4"
                  />
                  <span className="font-medium text-text-primary">I currently work here</span>
                </label>
              </div>

              <div>
                <label className={labelClass}>Start Date *</label>
                <input
                  type="month"
                  value={exp.startDate}
                  onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                  className={inputClass}
                />
              </div>

              {!exp.isCurrent && (
                <div>
                  <label className={labelClass}>End Date *</label>
                  <input
                    type="month"
                    value={exp.endDate || ''}
                    onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className={labelClass}>Responsibilities & Key Achievements</label>
                <textarea
                  rows={3}
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                  placeholder="Key contributions and technologies utilized..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
