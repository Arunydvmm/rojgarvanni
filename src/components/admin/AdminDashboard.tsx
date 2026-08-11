import React from 'react';
import { GovtJob, AgentLog } from '../../types';
import {
  FileText,
  Zap,
  Bot,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Database,
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
  
  // Count API articles (from RapidAPI source)
  const apiPublishedJobs = publishedJobs.filter((j) => j.sourceInfo?.name.includes('RapidAPI'));
  
  // Count successful agent logs from pipeline
  const successfulRuns = agentLogs.filter((l) => l.status === 'SUCCESS').length;

  return (
    <div className="p-6 sm:p-8 space-y-8 bg-slate-900 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">System Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            RapidAPI → 5-Stage AI Pipeline (with auto-fallbacks) → Live Publication. Zero-failure architecture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('scraper')}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Database className="w-4 h-4" />
            RapidAPI Scraper
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Published Articles from Pipeline */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Live Articles</span>
            <span className="text-3xl font-extrabold text-white">{publishedJobs.length}</span>
            <span className="text-[11px] text-emerald-400 block mt-1">Published via AI Pipeline</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* API Articles Published */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">From RapidAPI</span>
            <span className="text-3xl font-extrabold text-cyan-400">{apiPublishedJobs.length}</span>
            <span className="text-[11px] text-cyan-400 block mt-1">API → Pipeline → Live</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pipeline Success Rate */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Pipeline Success</span>
            <span className="text-3xl font-extrabold text-blue-400">{successfulRuns}</span>
            <span className="text-[11px] text-blue-400 block mt-1">Successful Agent Runs</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Drafts */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Pending Review</span>
            <span className="text-3xl font-extrabold text-amber-400">{draftJobs.length}</span>
            <span className="text-[11px] text-amber-400 block mt-1">Manual Admin Drafts</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pipeline Architecture Info */}
      <section className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              5-Stage AI Pipeline Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Simplified pipeline with automatic fallbacks. Never fails - 100% article publication rate.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { stage: 'DISCOVERY', desc: 'Verify job', icon: '🔍' },
            { stage: 'EXTRACTION', desc: 'Extract data', icon: '📋' },
            { stage: 'CONTENT', desc: 'Write overview', icon: '✍️' },
            { stage: 'SEO', desc: 'Metadata', icon: '🔗' },
            { stage: 'FINAL_QA', desc: 'Quality check', icon: '✓' },
          ].map((stage) => (
            <div key={stage.stage} className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{stage.icon}</div>
              <h3 className="font-bold text-xs text-white mb-1">{stage.stage}</h3>
              <p className="text-[10px] text-slate-400">{stage.desc}</p>
              <p className="text-[9px] text-emerald-400 mt-2 font-semibold">Auto-Fallback</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-xs text-emerald-300">
            ✓ <strong>Zero-Failure Design:</strong> Every stage has automatic fallback templates. If any agent fails, fallback ensures article still publishes.
          </p>
        </div>
      </section>

      {/* Recent Published Articles */}
      <section className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Recently Published Articles
          </h2>
          <button
            onClick={() => onNavigate('content-jobs')}
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            View All ({publishedJobs.length})
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {publishedJobs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No articles published yet. Wait for RapidAPI scraper to fetch jobs and process through pipeline.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {publishedJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {job.category}
                    </span>
                    <span className="text-xs text-slate-400">{job.organization}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{job.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Vacancies: <strong className="text-white">{job.totalVacancies}</strong> • 
                    Source: <strong className="text-cyan-300">{job.sourceInfo.name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectDraft(job)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Manual Drafts Section */}
      {draftJobs.length > 0 && (
        <section className="bg-slate-950 rounded-2xl border border-amber-800/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Manual Admin Drafts
            </h2>
            <button
              onClick={() => onNavigate('verification-queue')}
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              Review ({draftJobs.length})
            </button>
          </div>

          <div className="space-y-3">
            {draftJobs.slice(0, 3).map((draft) => (
              <div key={draft.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">{draft.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{draft.organization}</p>
                </div>
                <button
                  onClick={() => onSelectDraft(draft)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shrink-0"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
