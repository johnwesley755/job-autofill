import React, { useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { Code2, Globe, Plus, X } from 'lucide-react';

export const SkillsAndLinksTab: React.FC = () => {
  const { profile, updateSkills, updateLinks } = useProfileStore();
  const [newSkill, setNewSkill] = useState('');
  const [skillCategory, setSkillCategory] = useState<'languages' | 'frameworks' | 'databases' | 'tools'>('languages');

  const addSkillBadge = () => {
    if (!newSkill.trim()) return;
    const currentList = profile.skills[skillCategory] || [];
    if (!currentList.includes(newSkill.trim())) {
      updateSkills({
        [skillCategory]: [...currentList, newSkill.trim()],
      });
    }
    setNewSkill('');
  };

  const removeSkillBadge = (category: keyof typeof profile.skills, item: string) => {
    updateSkills({
      [category]: (profile.skills[category] || []).filter((s) => s !== item),
    });
  };

  return (
    <div className="space-y-6">
      {/* Social & Web Links */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          <Globe className="text-emerald-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Professional Links</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn Profile URL</label>
            <input
              type="url"
              value={profile.links.linkedin || ''}
              onChange={(e) => updateLinks({ linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Profile URL</label>
            <input
              type="url"
              value={profile.links.github || ''}
              onChange={(e) => updateLinks({ github: e.target.value })}
              placeholder="https://github.com/username"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Portfolio / Website</label>
            <input
              type="url"
              value={profile.links.portfolio || ''}
              onChange={(e) => updateLinks({ portfolio: e.target.value })}
              placeholder="https://myportfolio.dev"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Skills Matrix */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          <Code2 className="text-purple-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Technical Skills</h2>
        </div>

        {/* Add skill control */}
        <div className="flex space-x-2 text-xs">
          <select
            value={skillCategory}
            onChange={(e) => setSkillCategory(e.target.value as any)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="languages">Language</option>
            <option value="frameworks">Framework</option>
            <option value="databases">Database</option>
            <option value="tools">Tool / Cloud</option>
          </select>

          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkillBadge()}
            placeholder="e.g. Next.js, Redis..."
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={addSkillBadge}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </div>

        {/* Badges Display */}
        {(['languages', 'frameworks', 'databases', 'tools'] as const).map((cat) => (
          <div key={cat} className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {cat}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(profile.skills[cat] || []).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkillBadge(cat, skill)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
