import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { EducationRecord } from '../../types/profile';
import { Plus, Trash2, GraduationCap } from 'lucide-react';

export const EducationTab: React.FC = () => {
  const { profile, addEducation, updateEducation, removeEducation } = useProfileStore();

  const handleAddNew = () => {
    const newEntry: EducationRecord = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startYear: new Date().getFullYear() - 4,
      graduationYear: new Date().getFullYear(),
      scoreType: 'percentage',
    };
    addEducation(newEntry);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition';
  const labelClass = 'block font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">Academic History</h2>
          <p className="text-xs text-text-muted">Record degrees, certifications, and academic performance.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium shadow-xs transition"
        >
          <Plus size={14} />
          <span>Add Education</span>
        </button>
      </div>

      {profile.education.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border-subtle p-6">
          <GraduationCap className="mx-auto text-text-muted mb-3" size={32} />
          <p className="text-xs font-medium text-text-primary mb-1">No education entries added yet.</p>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Add your degrees to enable automatic mapping for education fields in job applications.
          </p>
        </div>
      ) : (
        profile.education.map((edu, idx) => (
          <div
            key={edu.id}
            className="bg-surface rounded-xl p-6 border border-border-subtle space-y-4 relative"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Education Entry #{idx + 1}
              </span>
              <button
                onClick={() => removeEducation(edu.id)}
                className="text-text-muted hover:text-danger transition p-1 rounded-md hover:bg-subtle"
                title="Delete education entry"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className={labelClass}>College / University / School *</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                  placeholder="e.g. Stanford University"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Degree / Qualification *</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                  placeholder="e.g. Bachelor of Science"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Field of Study / Major</label>
                <input
                  type="text"
                  value={edu.fieldOfStudy}
                  onChange={(e) => updateEducation(edu.id, { fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Start Year</label>
                <input
                  type="number"
                  value={edu.startYear || ''}
                  onChange={(e) => updateEducation(edu.id, { startYear: Number(e.target.value) || undefined })}
                  placeholder="2020"
                  className={`${inputClass} tabular-nums`}
                />
              </div>

              <div>
                <label className={labelClass}>Graduation / End Year *</label>
                <input
                  type="number"
                  value={edu.graduationYear || ''}
                  onChange={(e) => updateEducation(edu.id, { graduationYear: Number(e.target.value) || undefined })}
                  placeholder="2024"
                  className={`${inputClass} tabular-nums`}
                />
              </div>

              <div>
                <label className={labelClass}>Grading Scheme</label>
                <select
                  value={edu.scoreType || 'percentage'}
                  onChange={(e) =>
                    updateEducation(edu.id, { scoreType: e.target.value as 'percentage' | 'cgpa' })
                  }
                  className={inputClass}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="cgpa">CGPA / GPA</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {edu.scoreType === 'cgpa' ? 'CGPA / GPA Value' : 'Percentage Value (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={edu.score !== undefined ? edu.score : ''}
                  onChange={(e) =>
                    updateEducation(edu.id, { score: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder={edu.scoreType === 'cgpa' ? 'e.g. 3.8' : 'e.g. 85.5'}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
