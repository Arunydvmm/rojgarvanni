import React, { useState } from 'react';
import { Lock, Landmark, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onExit: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onExit }) => {
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Invalid password. Default is "admin123".');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      {/* Back to Public Site */}
      <button
        onClick={onExit}
        className="absolute top-6 left-6 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
      >
        ← Return to Public Website
      </button>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto text-slate-950 font-bold shadow-lg">
            <Landmark className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white font-serif tracking-tight">RozgarVaani Admin Portal</h1>
          <p className="text-xs text-slate-400">Government Information & AI Verification Control Panel</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Administrator Password / PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: admin123)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default administrator password: <code className="text-amber-400 font-mono">admin123</code></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Access Admin Panel'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800/80 pt-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>Restricted Portal - Administrator Clearance Required</span>
        </div>
      </div>
    </div>
  );
};
