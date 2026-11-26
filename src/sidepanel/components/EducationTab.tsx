import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { EducationRecord } from '../../types/profile';

export const EducationTab: React.FC = () => {
  const { profile, addEducation, updateEducation, removeEducation } = useProfileStore();

  const handleAddNew = () => {
    const newEdu: EducationRecord = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: 'B.Tech / B.E.',
      fieldOfStudy: '',
      graduationYear: new Date().getFullYear(),
      scoreType: 'cgpa',
      score: 8.0,
      scale: 10.0,
      backlogsCount: 0,
    };
    addEducation(newEdu);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Add your university degrees, colleges, and academic records.
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
        >
          <Plus size={14} />
          <span>Add Education</span>
        </button>
      </div>

      {profile.education.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <GraduationCap className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-xs text-gray-500">No education entries added yet.</p>
        </div>
      ) : (
        profile.education.map((edu, idx) => (
          <div
            key={edu.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Education #{idx + 1}
              </span>
              <button
                onClick={() => removeEducation(edu.id)}
                className="text-gray-400 hover:text-red-500 transition p-1"
                title="Delete education"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Institution / University *
                </label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                  placeholder="e.g. National Institute of Technology Karnataka"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Degree *</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                  placeholder="e.g. B.Tech / B.E. / M.S."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Specialization / Branch *
                </label>
                <input
                  type="text"
                  value={edu.fieldOfStudy}
                  onChange={(e) => updateEducation(edu.id, { fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Graduation Year (Batch) *
                </label>
                <input
                  type="number"
                  value={edu.graduationYear}
                  onChange={(e) => updateEducation(edu.id, { graduationYear: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Score Type</label>
                <select
                  value={edu.scoreType}
                  onChange={(e) => updateEducation(edu.id, { scoreType: e.target.value as 'cgpa' | 'percentage' })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cgpa">CGPA (Out of 10 or 4)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Score Value ({edu.scoreType === 'cgpa' ? 'e.g. 8.75' : 'e.g. 85.5%'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={edu.score}
                  onChange={(e) => updateEducation(edu.id, { score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Active Backlogs</label>
                <input
                  type="number"
                  value={edu.backlogsCount || 0}
                  onChange={(e) => updateEducation(edu.id, { backlogsCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
