import React, { useState } from 'react';
import { SourceRegistry } from '../../types';
import { Globe, Plus, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminSourcesManagerProps {
  sources: SourceRegistry[];
  token: string;
  onRefresh: () => void;
}

export const AdminSourcesManager: React.FC<AdminSourcesManagerProps> = ({ sources, token, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'GOVT_WEBSITE' | 'PRESS_RELEASE' | 'OFFICIAL_GAZETTE'>('GOVT_WEBSITE');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('SSC');
  const [scanFrequencyHours, setScanFrequencyHours] = useState(6);
  const [parserType, setParserType] = useState('STANDARD_PDF');
  const [loading, setLoading] = useState(false);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          url,
          category,
          scanFrequencyHours,
          parserType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName('');
        setUrl('');
        onRefresh();
      }
    } catch (err) {
      alert('Error adding source');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
            <Globe className="w-7 h-7 text-amber-400" />
            Permitted Government Source Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered official commission portals, gazettes, and RSS feeds monitored for automated discovery.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Register New Government Source
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((s) => (
          <div key={s.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {s.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                ACTIVE MONITORED
              </span>
            </div>

            <h3 className="font-bold text-white text-base">{s.name}</h3>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-amber-400 font-mono truncate block"
            >
              {s.url}
            </a>

            <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span>Scan Interval: <strong>Every {s.scanFrequencyHours}h</strong></span>
              <span>Type: <strong>{s.parserType}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSource}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Register Official Source</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Source Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UPSC Official Gazette"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Official Portal URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://upsc.gov.in"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Interval (Hours)</label>
                <input
                  type="number"
                  value={scanFrequencyHours}
                  onChange={(e) => setScanFrequencyHours(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              {loading ? 'Adding...' : 'Save Source Entry'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
