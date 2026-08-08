import React from 'react';
import { GovtJob, AgentLog } from '../../types';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity,
  Layers,
} from 'lucide-react';

interface AdminDashboardProps {
  jobs: GovtJob[];
  agentLogs: AgentLog[];
  onNavigate: (tab: string) => void;
  onSelectDraft: (job: GovtJob) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  jobs,
  agentLogs,
  onNavigate,
  onSelectDraft,
}) => {
  const publishedJobs = jobs.filter((j) => !j.isDraft);
  const draftJobs = jobs.filter((j) => j.isDraft);
  const pendingReview = draftJobs.filter((j) => j.verificationReport?.verificationStatus === 'PASSED');
  const failedVerification = draftJobs.filter((j) => j.verificationReport?.verificationStatus === 'FAILED');

  return (
    <div className="p-6 sm:p-8 space-y-8 bg-slate-900 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">System Operational Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of government information discovery, multi-agent processing, and human verification queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('pipeline-runner')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Bot className="w-4 h-4" />
            Run AI Multi-Agent Pipeline
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Published Jobs */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Live Government Jobs</span>
            <span className="text-3xl font-extrabold text-white">{publishedJobs.length}</span>
            <span className="text-[11px] text-emerald-400 block mt-1">Published to Candidates</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Verification Queue (Passed Gate) */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Ready for Approval</span>
            <span className="text-3xl font-extrabold text-amber-400">{pendingReview.length}</span>
            <span className="text-[11px] text-amber-400 block mt-1">Verification Gate Passed ✓</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Verification Failed */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Verification Failed</span>
            <span className="text-3xl font-extrabold text-rose-400">{failedVerification.length}</span>
            <span className="text-[11px] text-rose-400 block mt-1">Hard Gate Blocked (Cannot Publish)</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total AI Logs */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">AI Pipeline Runs</span>
            <span className="text-3xl font-extrabold text-blue-400">{agentLogs.length}</span>
            <span className="text-[11px] text-blue-400 block mt-1">Agents Monitored</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Verification Gate Queue Section */}
      <section className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Pending Human Verification Queue
            </h2>
            <p className="text-xs text-slate-400">
              Drafts that passed AI extraction and require final human verification before publishing.
            </p>
          </div>
          <button
            onClick={() => onNavigate('verification-queue')}
            className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
          >
            View Queue ({pendingReview.length})
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {pendingReview.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No drafts currently waiting in the verification queue. All items have been processed or published.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {pendingReview.map((draft) => (
              <div key={draft.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {draft.category}
                    </span>
                    <span className="text-xs text-slate-400">{draft.organization}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{draft.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sourced from: <strong className="text-slate-300">{draft.sourceInfo.name}</strong> • Confidence:{' '}
                    <strong className="text-emerald-400">
                      {(draft.verificationReport?.overallConfidence || 0.95) * 100}%
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => onSelectDraft(draft)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shrink-0 shadow-md transition-all"
                >
                  Inspect & Verify Draft
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent AI Pipeline Logs */}
      <section className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Live Agent Monitoring Stream
          </h2>
          <button
            onClick={() => onNavigate('agent-monitor')}
            className="text-xs font-bold text-blue-400 hover:underline"
          >
            Full Agent Logs
          </button>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto font-mono text-xs text-slate-300 pr-2">
          {agentLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 flex items-start gap-3">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 mt-0.5 ${
                  log.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : log.status === 'RUNNING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {log.agentName}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="truncate">{log.targetTitle || 'Pipeline Task'}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-200 text-xs line-clamp-1">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
