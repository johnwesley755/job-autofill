import React, { useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { Sliders, Plus, X } from 'lucide-react';

export const PreferencesTab: React.FC = () => {
  const { profile, updatePreferences } = useProfileStore();
  const [cityInput, setCityInput] = useState('');

  const addCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    const current = profile.preferences.preferredCities || [];
    if (!current.includes(trimmed)) {
      updatePreferences({ preferredCities: [...current, trimmed] });
    }
    setCityInput('');
  };

  const removeCity = (city: string) => {
    const current = profile.preferences.preferredCities || [];
    updatePreferences({ preferredCities: current.filter((c) => c !== city) });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition';
  const labelClass = 'block font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-border-subtle pb-3">
          <Sliders className="text-accent" size={18} />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Job & Employment Preferences</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Fresher Status */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.preferences.isFresher}
                onChange={(e) => updatePreferences({ isFresher: e.target.checked })}
                className="rounded border-border-subtle text-accent focus:ring-accent h-4 w-4"
              />
              <span className="font-medium text-text-primary">
                I am a fresher / recent graduate seeking entry-level roles
              </span>
            </label>
          </div>

          {/* Work Authorization */}
          <div>
            <label className={labelClass}>Work Authorization</label>
            <input
              type="text"
              value={profile.preferences.workAuthorization || ''}
              onChange={(e) => updatePreferences({ workAuthorization: e.target.value })}
              placeholder="e.g. US Citizen, Permanent Resident, H1B"
              className={inputClass}
            />
          </div>

          {/* Sponsorship Requirement */}
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.preferences.requiresSponsorship}
                onChange={(e) => updatePreferences({ requiresSponsorship: e.target.checked })}
                className="rounded border-border-subtle text-accent focus:ring-accent h-4 w-4"
              />
              <span className="font-medium text-text-primary">Requires visa sponsorship now or in future</span>
            </label>
          </div>

          {/* Work Mode */}
          <div>
            <label className={labelClass}>Preferred Work Mode</label>
            <select
              value={profile.preferences.workMode || 'hybrid'}
              onChange={(e) =>
                updatePreferences({ workMode: e.target.value as 'remote' | 'hybrid' | 'onsite' })
              }
              className={inputClass}
            >
              <option value="remote">Remote only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site only</option>
            </select>
          </div>

          {/* Notice Period */}
          <div>
            <label className={labelClass}>Notice Period (Days)</label>
            <input
              type="number"
              value={profile.preferences.noticePeriodDays || ''}
              onChange={(e) =>
                updatePreferences({ noticePeriodDays: Number(e.target.value) || undefined })
              }
              placeholder="e.g. 15 or 30"
              className={`${inputClass} tabular-nums`}
            />
          </div>

          {/* Immediate Joining */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.preferences.immediateJoiner}
                onChange={(e) => updatePreferences({ immediateJoiner: e.target.checked })}
                className="rounded border-border-subtle text-accent focus:ring-accent h-4 w-4"
              />
              <span className="font-medium text-text-primary">Available for immediate joining</span>
            </label>
          </div>

          {/* Preferred Cities */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Preferred Job Locations / Cities</label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCity();
                  }
                }}
                placeholder="e.g. San Francisco, New York, Seattle"
                className={inputClass}
              />
              <button
                onClick={addCity}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(profile.preferences.preferredCities || []).map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-subtle border border-border-subtle text-text-primary text-[11px] font-medium"
                >
                  {city}
                  <button onClick={() => removeCity(city)} className="text-text-muted hover:text-danger">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
