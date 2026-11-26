import React from 'react';
import { useProfileStore } from '../../store/profileStore';
import { User, MapPin } from 'lucide-react';

export const PersonalTab: React.FC = () => {
  const { profile, updatePersonal, updateLocation } = useProfileStore();

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          <User className="text-blue-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Personal Details</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
            <input
              type="text"
              value={profile.personal.firstName}
              onChange={(e) => updatePersonal({ firstName: e.target.value })}
              placeholder="e.g. Rahul"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name</label>
            <input
              type="text"
              value={profile.personal.middleName || ''}
              onChange={(e) => updatePersonal({ middleName: e.target.value })}
              placeholder="e.g. Kumar"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
            <input
              type="text"
              value={profile.personal.lastName}
              onChange={(e) => updatePersonal({ lastName: e.target.value })}
              placeholder="e.g. Sharma"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.personal.fullName}
              onChange={(e) => updatePersonal({ fullName: e.target.value })}
              placeholder="Auto-computed or custom"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
            <input
              type="email"
              value={profile.personal.email}
              onChange={(e) => updatePersonal({ email: e.target.value })}
              placeholder="rahul.sharma@example.com"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Country Code</label>
            <input
              type="text"
              value={profile.personal.phoneCountryCode}
              onChange={(e) => updatePersonal({ phoneCountryCode: e.target.value })}
              placeholder="+91"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={profile.personal.phone}
              onChange={(e) => updatePersonal({ phone: e.target.value })}
              placeholder="9876543210"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
            <select
              value={profile.personal.gender || 'prefer-not-to-say'}
              onChange={(e) => updatePersonal({ gender: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-Binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
            <input
              type="date"
              value={profile.personal.dob || ''}
              onChange={(e) => updatePersonal({ dob: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Location Info */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          <MapPin className="text-red-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Location & Address</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
            <input
              type="text"
              value={profile.location.addressLine1}
              onChange={(e) => updateLocation({ addressLine1: e.target.value })}
              placeholder="Flat 402, Green Heights, Outer Ring Road"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
            <input
              type="text"
              value={profile.location.city}
              onChange={(e) => updateLocation({ city: e.target.value })}
              placeholder="Bengaluru"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">State / Province *</label>
            <input
              type="text"
              value={profile.location.state}
              onChange={(e) => updateLocation({ state: e.target.value })}
              placeholder="Karnataka"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
            <input
              type="text"
              value={profile.location.country}
              onChange={(e) => updateLocation({ country: e.target.value })}
              placeholder="India"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Postal / PIN Code *</label>
            <input
              type="text"
              value={profile.location.postalCode}
              onChange={(e) => updateLocation({ postalCode: e.target.value })}
              placeholder="560103"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
