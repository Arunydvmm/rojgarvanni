import React, { useState } from 'react';
import { Settings, ShieldCheck, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminSettingsProps {
  adsEnabled: boolean;
  setAdsEnabled: (enabled: boolean) => void;
  token: string;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ adsEnabled, setAdsEnabled, token }) => {
  const [siteTitle, setSiteTitle] = useState('RozgarVaani');
  const [contactEmail, setContactEmail] = useState('support@rozgarvaani.gov.in');
  const [autoApproveConfidence, setAutoApproveConfidence] = useState(0.98);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 min-h-screen">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-amber-400" />
          System Settings & Monetization Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Global portal rules, verification gate strictness, and advertisement network settings.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Ad Infrastructure Toggle */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Advertising System Toggle (ADS_ENABLED)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Controls whether sponsored partner banners are displayed on the public site.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAdsEnabled(!adsEnabled)}
              className={`w-14 h-8 rounded-full transition-colors relative p-1 ${
                adsEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  adsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
            Current Status: <strong className={adsEnabled ? 'text-emerald-400' : 'text-slate-400'}>
              {adsEnabled ? 'ENABLED (Banner Placements Active)' : 'DISABLED (Clean Public Presentation)'}
            </strong>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">
            Portal Details
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Portal Name</label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Support Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Minimum AI Confidence for Verification Gate
            </label>
            <input
              type="number"
              step="0.01"
              min="0.80"
              max="1.00"
              value={autoApproveConfidence}
              onChange={(e) => setAutoApproveConfidence(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default 0.98 (98% verification accuracy required to pass hard gate).</p>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
        >
          Save System Configuration
        </button>
      </form>
    </div>
  );
};
