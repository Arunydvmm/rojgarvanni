import React, { useState, useEffect } from 'react';
import { AgentLog } from '../../types';
import {
  Activity, ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
  Clock, Cpu, BarChart2, Loader2, RefreshCw,
} from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AgentLog[];
}

// ─── NVIDIA agent monitoring types ───────────────────────────────────────────
interface AgentMonitorEntry {
  agentId: string;
  agentName: string;
  description: string;
  model: string;
  version: string;
  totalRuns: number;
  successRate: string;
  avgDurationMs: number;
  failureCount: number;
  warningCount: number;
  lastRun: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    FAILED:  'bg-rose-500/20 text-rose-400 border-rose-500/30',
    WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    RUNNING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  const cls = map[status] ?? 'bg-slate-700 text-slate-400 border-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
      {status}
    </span>
  );
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'monitor'>('monitor');
  const [agentStats, setAgentStats]   = useState<AgentMonitorEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [nvidiaModel, setNvidiaModel]   = useState('');

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const r = await fetch('/api/admin/agent-stats');
      const d = await r.json();
      if (d.success) {
        setAgentStats(d.data);
        setNvidiaModel(d.model_display ?? d.model ?? '');
      }
    } catch { /* silent — show empty state */ }
    finally { setLoadingStats(false); }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  // ── Agent Monitor Tab ────────────────────────────────────────────────────
  function MonitorTab() {
    const totalRuns = agentStats.reduce((s, a) => s + a.totalRuns, 0);
    const totalFails = agentStats.reduce((s, a) => s + a.failureCount, 0);

    return (
      <div className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Model',       value: nvidiaModel || 'NVIDIA Nemotron Nano 9B', icon: <Cpu className="w-4 h-4 text-amber-400" /> },
            { label: 'Total Agents', value: `${agentStats.length}`,                  icon: <Activity className="w-4 h-4 text-indigo-400" /> },
            { label: 'Total Runs',  value: `${totalRuns}`,                           icon: <BarChart2 className="w-4 h-4 text-emerald-400" /> },
            { label: 'Failures',    value: `${totalFails}`,                          icon: <XCircle className="w-4 h-4 text-red-400" /> },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
              {c.icon}
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold">{c.label}</p>
                <p className="text-sm font-bold text-white font-mono truncate">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Per-agent rows */}
        {loadingStats ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading agent stats…
          </div>
        ) : agentStats.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No agent stats yet. Run the NVIDIA pipeline to see data here.
          </div>
        ) : (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Agent</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Runs</th>
                  <th className="p-3">Success Rate</th>
                  <th className="p-3">Avg Time</th>
                  <th className="p-3">Failures</th>
                  <th className="p-3">Last Run</th>
                  <th className="p-3">Last Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {agentStats.map((a) => (
                  <tr key={a.agentId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-amber-400">{a.agentName}</p>
                      <p className="text-slate-500 text-[10px] truncate max-w-[160px]">{a.description}</p>
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[10px] truncate max-w-[120px]">{a.model}</td>
                    <td className="p-3 font-mono text-white">{a.totalRuns}</td>
                    <td className="p-3">
                      <span className={`font-bold ${
                        a.successRate === 'N/A' ? 'text-slate-500' :
                        parseFloat(a.successRate) >= 90 ? 'text-emerald-400' :
                        parseFloat(a.successRate) >= 70 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{a.successRate}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {a.avgDurationMs > 0 ? `${(a.avgDurationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="p-3 font-mono text-red-400">{a.failureCount}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {a.lastRun ? new Date(a.lastRun).toLocaleTimeString('en-IN') : '—'}
                    </td>
                    <td className="p-3">
                      {a.lastStatus ? <StatusBadge status={a.lastStatus} /> : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Agent Logs Tab ───────────────────────────────────────────────────────
  function LogsTab() {
    return (
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300 font-mono">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 whitespace-nowrap">Timestamp</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Status</th>
                <th className="p-3">Item</th>
                <th className="p-3">Model</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Output Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No agent logs yet. Run the NVIDIA pipeline to see activity.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 font-bold text-amber-400 whitespace-nowrap">{log.agentType}</td>
                  <td className="p-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="p-3 text-slate-200 truncate max-w-[160px]">
                    {log.itemTitle || '—'}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[140px]">{log.modelUsed || '—'}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                  </td>
                  <td className="p-3 text-slate-300 leading-relaxed truncate max-w-xs">
                    {log.issueDetails
                      ? <span className="text-rose-400">{log.issueDetails}</span>
                      : log.outputSummary || log.inputSummary || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 min-h-screen">

      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-amber-400" />
            Agent Monitoring & Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            NVIDIA Nemotron Nano 9B · 11 agents · Real-time execution stats and logs.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          {loadingStats
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          Refresh Stats
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['monitor', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border ${
              activeTab === tab
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {tab === 'monitor' ? '● Agent Health' : '📋 Execution Logs'}
          </button>
        ))}
      </div>

      {activeTab === 'monitor' ? <MonitorTab /> : <LogsTab />}
    </div>
  );
};
