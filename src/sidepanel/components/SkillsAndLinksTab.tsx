import React, { useState } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { Code2, Globe, Plus, X } from 'lucide-react';

export const SkillsAndLinksTab: React.FC = () => {
  const { profile, updateSkills, updateLinks } = useProfileStore();

  const [langInput, setLangInput] = useState('');
  const [frameworkInput, setFrameworkInput] = useState('');
  const [toolInput, setToolInput] = useState('');

  const addTag = (
    field: 'languages' | 'frameworks' | 'tools',
    val: string,
    setter: (s: string) => void
  ) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const current = profile.skills[field] || [];
    if (!current.includes(trimmed)) {
      updateSkills({ [field]: [...current, trimmed] });
    }
    setter('');
  };

  const removeTag = (field: 'languages' | 'frameworks' | 'tools', item: string) => {
    const current = profile.skills[field] || [];
    updateSkills({ [field]: current.filter((x) => x !== item) });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition';
  const labelClass = 'block font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Technical Skills */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-border-subtle pb-3">
          <Code2 className="text-accent" size={18} />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Technical Skills</h2>
        </div>

        <div className="space-y-5 text-xs">
          {/* Languages */}
          <div>
            <label className={labelClass}>Programming & Query Languages</label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag('languages', langInput, setLangInput);
                  }
                }}
                placeholder="e.g. TypeScript, Python, SQL"
                className={inputClass}
              />
              <button
                onClick={() => addTag('languages', langInput, setLangInput)}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.languages.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-subtle border border-border-subtle text-text-primary text-[11px] font-medium"
                >
                  {l}
                  <button onClick={() => removeTag('languages', l)} className="text-text-muted hover:text-danger">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Frameworks */}
          <div>
            <label className={labelClass}>Frameworks & Libraries</label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={frameworkInput}
                onChange={(e) => setFrameworkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag('frameworks', frameworkInput, setFrameworkInput);
                  }
                }}
                placeholder="e.g. React, Next.js, Node.js"
                className={inputClass}
              />
              <button
                onClick={() => addTag('frameworks', frameworkInput, setFrameworkInput)}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.frameworks.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-subtle border border-border-subtle text-text-primary text-[11px] font-medium"
                >
                  {f}
                  <button onClick={() => removeTag('frameworks', f)} className="text-text-muted hover:text-danger">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <label className={labelClass}>Developer Tools & Platforms</label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag('tools', toolInput, setToolInput);
                  }
                }}
                placeholder="e.g. Git, Docker, AWS"
                className={inputClass}
              />
              <button
                onClick={() => addTag('tools', toolInput, setToolInput)}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-subtle border border-border-subtle text-text-primary text-[11px] font-medium"
                >
                  {t}
                  <button onClick={() => removeTag('tools', t)} className="text-text-muted hover:text-danger">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Online Profiles & Links */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-border-subtle pb-3">
          <Globe className="text-accent" size={18} />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Online Presence & Links</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className={labelClass}>LinkedIn Profile URL</label>
            <input
              type="url"
              value={profile.links.linkedin || ''}
              onChange={(e) => updateLinks({ linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>GitHub Profile URL</label>
            <input
              type="url"
              value={profile.links.github || ''}
              onChange={(e) => updateLinks({ github: e.target.value })}
              placeholder="https://github.com/username"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Portfolio / Personal Website</label>
            <input
              type="url"
              value={profile.links.portfolio || ''}
              onChange={(e) => updateLinks({ portfolio: e.target.value })}
              placeholder="https://yourname.dev"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Twitter / X Profile</label>
            <input
              type="url"
              value={profile.links.twitter || ''}
              onChange={(e) => updateLinks({ twitter: e.target.value })}
              placeholder="https://x.com/username"
              className={inputClass}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
