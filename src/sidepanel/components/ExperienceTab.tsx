import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { ExperienceRecord } from '../../types/profile';

export const ExperienceTab: React.FC = () => {
  const { profile, addExperience, updateExperience, removeExperience } = useProfileStore();

  const handleAddNew = () => {
    const newExp: ExperienceRecord = {
      id: `exp-${Date.now()}`,
      type: 'full-time',
      company: '',
      jobTitle: '',
      startDate: '2023-01',
      endDate: '',
      isCurrent: true,
      description: '',
    };
    addExperience(newExp);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          List your full-time jobs and internships separately with accurate timelines.
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
        >
          <Plus size={14} />
          <span>Add Experience</span>
        </button>
      </div>

      {profile.experience.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Briefcase className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-xs text-gray-500">No work or internship experience added yet.</p>
          <p className="text-[11px] text-gray-400 mt-1">If you are a fresher, you can leave this empty or add college internships.</p>
        </div>
      ) : (
        profile.experience.map((exp, idx) => (
          <div
            key={exp.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Role #{idx + 1}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                  exp.type === 'internship'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {exp.type}
                </span>
              </div>
              <button
                onClick={() => removeExperience(exp.id)}
                className="text-gray-400 hover:text-red-500 transition p-1"
                title="Delete role"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                  placeholder="e.g. Infosys / Google"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title *</label>
                <input
                  type="text"
                  value={exp.jobTitle}
                  onChange={(e) => updateExperience(exp.id, { jobTitle: e.target.value })}
                  placeholder="e.g. Software Development Engineer"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                <select
                  value={exp.type}
                  onChange={(e) => updateExperience(exp.id, { type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full-time">Full-time Employee</option>
                  <option value="internship">Internship / Trainee</option>
                  <option value="contract">Contract / Freelance</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={exp.location || ''}
                  onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                  placeholder="e.g. Bengaluru, India"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="month"
                  value={exp.startDate}
                  onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="month"
                  disabled={exp.isCurrent}
                  value={exp.isCurrent ? '' : exp.endDate || ''}
                  onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="col-span-2 flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id={`current-${exp.id}`}
                  checked={exp.isCurrent}
                  onChange={(e) => updateExperience(exp.id, { isCurrent: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor={`current-${exp.id}`} className="font-medium text-gray-700 dark:text-gray-300">
                  I currently work here
                </label>
              </div>

              <div className="col-span-2">
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Key Responsibilities & Impact</label>
                <textarea
                  rows={2}
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                  placeholder="Architected scalable microservices, reduced latency by 35%..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
