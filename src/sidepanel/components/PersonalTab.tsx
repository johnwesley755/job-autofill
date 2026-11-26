import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { User, MapPin } from 'lucide-react';

export const PersonalTab: React.FC = () => {
  const { profile, updatePersonal, updateLocation } = useProfileStore();

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-xs transition';
  const labelClass = 'block font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Personal Info */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-border-subtle pb-3">
          <User className="text-accent" size={18} />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Personal Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className={labelClass}>First Name *</label>
            <input
              type="text"
              value={profile.personal.firstName}
              onChange={(e) => updatePersonal({ firstName: e.target.value })}
              placeholder="e.g. John"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Middle Name</label>
            <input
              type="text"
              value={profile.personal.middleName || ''}
              onChange={(e) => updatePersonal({ middleName: e.target.value })}
              placeholder="e.g. Robert"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              type="text"
              value={profile.personal.lastName}
              onChange={(e) => updatePersonal({ lastName: e.target.value })}
              placeholder="e.g. Doe"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Full Name</label>
            <input
              type="text"
              value={profile.personal.fullName}
              onChange={(e) => updatePersonal({ fullName: e.target.value })}
              placeholder="Auto-computed or custom"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Email Address *</label>
            <input
              type="email"
              value={profile.personal.email}
              onChange={(e) => updatePersonal({ email: e.target.value })}
              placeholder="john.doe@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Country Code</label>
            <input
              type="text"
              value={profile.personal.phoneCountryCode}
              onChange={(e) => updatePersonal({ phoneCountryCode: e.target.value })}
              placeholder="+1"
              className={`${inputClass} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="tel"
              value={profile.personal.phone}
              onChange={(e) => updatePersonal({ phone: e.target.value })}
              placeholder="5551234567"
              className={`${inputClass} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelClass}>Gender</label>
            <select
              value={profile.personal.gender || 'prefer-not-to-say'}
              onChange={(e) => updatePersonal({ gender: e.target.value })}
              className={inputClass}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-Binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              value={profile.personal.dob || ''}
              onChange={(e) => updatePersonal({ dob: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Location Info */}
      <section className="bg-surface rounded-xl p-6 border border-border-subtle space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-border-subtle pb-3">
          <MapPin className="text-accent" size={18} />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Location & Address</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className={labelClass}>Street Address</label>
            <input
              type="text"
              value={profile.location.addressLine1}
              onChange={(e) => updateLocation({ addressLine1: e.target.value })}
              placeholder="123 Market Street, Suite 400"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>City *</label>
            <input
              type="text"
              value={profile.location.city}
              onChange={(e) => updateLocation({ city: e.target.value })}
              placeholder="San Francisco"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>State / Province *</label>
            <input
              type="text"
              value={profile.location.state}
              onChange={(e) => updateLocation({ state: e.target.value })}
              placeholder="California"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Country *</label>
            <input
              type="text"
              value={profile.location.country}
              onChange={(e) => updateLocation({ country: e.target.value })}
              placeholder="United States"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Postal / PIN Code *</label>
            <input
              type="text"
              value={profile.location.postalCode}
              onChange={(e) => updateLocation({ postalCode: e.target.value })}
              placeholder="94105"
              className={`${inputClass} tabular-nums`}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
