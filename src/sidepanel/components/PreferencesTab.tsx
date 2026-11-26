import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { Sliders, IndianRupee, Clock, Building2 } from 'lucide-react';

export const PreferencesTab: React.FC = () => {
  const { profile, updatePreferences } = useProfileStore();
  const pref = profile.preferences;

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          <Sliders className="text-amber-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Job Preferences & Compensation</h2>
        </div>

        {/* Fresher vs Experienced toggle */}
        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">Fresher Candidate</div>
            <div className="text-[11px] text-gray-500">Enable if applying as a college graduate or 0 years experience</div>
          </div>
          <input
            type="checkbox"
            checked={pref.isFresher}
            onChange={(e) => updatePreferences({ isFresher: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Experience (Years)
            </label>
            <input
              type="number"
              step="0.5"
              disabled={pref.isFresher}
              value={pref.isFresher ? 0 : pref.totalExperienceYears}
              onChange={(e) => updatePreferences({ totalExperienceYears: parseFloat(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
              <Clock size={13} className="text-blue-500" />
              <span>Notice Period (Days)</span>
            </label>
            <input
              type="number"
              value={pref.noticePeriodDays}
              onChange={(e) => updatePreferences({ noticePeriodDays: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 15, 30, 60, 90"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="col-span-2 flex items-center space-x-2">
            <input
              type="checkbox"
              id="immediate-joiner"
              checked={pref.immediateJoiner}
              onChange={(e) => updatePreferences({ immediateJoiner: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="immediate-joiner" className="font-medium text-gray-700 dark:text-gray-300 text-xs">
              Immediate Joiner (Serving notice or already available)
            </label>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
              <IndianRupee size={13} className="text-emerald-500" />
              <span>Current CTC (LPA)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={pref.currentCtcLpa || ''}
              onChange={(e) => updatePreferences({ currentCtcLpa: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 12"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
              <IndianRupee size={13} className="text-emerald-500" />
              <span>Expected CTC (LPA)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={pref.expectedCtcLpa || ''}
              onChange={(e) => updatePreferences({ expectedCtcLpa: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 18"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
              <Building2 size={13} className="text-gray-500" />
              <span>Work Mode</span>
            </label>
            <select
              value={pref.workMode}
              onChange={(e) => updatePreferences({ workMode: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
              <option value="any">Open to Any</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Work Authorization</label>
            <input
              type="text"
              value={pref.workAuthorization}
              onChange={(e) => updatePreferences({ workAuthorization: e.target.value })}
              placeholder="e.g. Citizen / Permanent Resident"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preferred Cities (Comma-separated)
            </label>
            <input
              type="text"
              value={pref.preferredCities.join(', ')}
              onChange={(e) =>
                updatePreferences({
                  preferredCities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Bengaluru, Hyderabad, Pune, Gurgaon, Remote"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2 flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="relocate-pref"
              checked={pref.willingToRelocate}
              onChange={(e) => updatePreferences({ willingToRelocate: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="relocate-pref" className="font-medium text-gray-700 dark:text-gray-300 text-xs">
              Willing to relocate for the right opportunity
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
