import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2,
  RefreshCw, ChevronDown, ChevronRight, Wrench, Trash2,
  RotateCcw, ClipboardList, Info, Loader2, Lock,
} from 'lucide-react';
import type {
  GovtJobDraft,
  QAFinalReport,
  QACheckResult,
  QAFinalStatus,
} from '../../types';

// ─── Props ───────────────────────────────────────────────────────────────────
interface AdminFinalQAPanelProps {
  drafts: GovtJobDraft[];
  /** Called after the admin approves a READY draft */
  onApproveDraft?: (draftId: string) => void;
}

// ─── Small Helpers ────────────────────────────────────────────────────────────

const CHECK_LABELS: Record<keyof QAFinalReport['checks'], string> = {
  source: 'Source',
  data: 'Data / Title / Org',
  dates: 'Dates',
  vacancies: 'Vacancies',
  eligibility: 'Eligibility',
  fee: 'Fee',
  salary: 'Salary',
  selection: 'Selection Process',
  content: 'Content / Overview',
  urls: 'URLs',
  seo: 'SEO / Slug',
  duplicate: 'Duplicate Check',
  schema: 'Database Schema',
  agent_pipeline: 'Agent Pipeline',
  public_render_data: 'Public Render Data',
};

function statusBadge(status: QAFinalStatus) {
  const map: Record<QAFinalStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    READY_FOR_ADMIN_REVIEW: {
      bg: 'bg-green-100 text-green-800 border-green-300',
      text: 'READY FOR REVIEW',
      icon: <ShieldCheck size={14} />,
    },
    REPROCESS_REQUIRED: {
      bg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      text: 'REPROCESS REQUIRED',
      icon: <RotateCcw size={14} />,
    },
    MANUAL_REVIEW_REQUIRED: {
      bg: 'bg-orange-100 text-orange-800 border-orange-300',
      text: 'MANUAL REVIEW',
      icon: <ClipboardList size={14} />,
    },
    BLOCKED: {
      bg: 'bg-red-100 text-red-800 border-red-300',
      text: 'BLOCKED',
      icon: <Lock size={14} />,
    },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${s.bg}`}>
      {s.icon} {s.text}
    </span>
  );
}

function checkBadge(result: QACheckResult) {
  const map: Record<QACheckResult, { cls: string; icon: React.ReactNode }> = {
    PASS: { cls: 'text-green-600', icon: <CheckCircle2 size={14} /> },
    FAIL: { cls: 'text-red-600', icon: <XCircle size={14} /> },
    WARN: { cls: 'text-yellow-600', icon: <AlertTriangle size={14} /> },
    SKIP: { cls: 'text-gray-400', icon: <Info size={14} /> },
  };
  const s = map[result];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${s.cls}`}>
      {s.icon} {result}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9155" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400 leading-none">/100</span>
      </div>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function Section({
  title, count, color, children, defaultOpen = false,
}: {
  title: string; count: number; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="border rounded-lg overflow-hidden mb-3">
      <button
        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-semibold ${color} text-left`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title} <span className="font-normal opacity-75">({count})</span></span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && <div className="divide-y">{children}</div>}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AdminFinalQAPanel({ drafts, onApproveDraft }: AdminFinalQAPanelProps) {
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QAFinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runQA() {
    if (!selectedDraftId) return;
    setLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drafts/${selectedDraftId}/qa-check`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? 'QA check failed');
      setReport(json.data as QAFinalReport);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={28} className="text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Final QA + Auto-Fix Agent</h1>
          <p className="text-sm text-gray-500">
            Runs all 15 check categories, automatically fixes safe issues, and produces a full audit report.
          </p>
        </div>
      </div>

      {/* Draft Selector + Run */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedDraftId}
          onChange={(e) => { setSelectedDraftId(e.target.value); setReport(null); setError(null); }}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">— Select a draft to audit —</option>
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.organization})
            </option>
          ))}
        </select>
        <button
          onClick={runQA}
          disabled={!selectedDraftId || loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold transition"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {loading ? 'Running…' : 'Run QA Check'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">

          {/* Summary Card */}
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <div className="flex items-start gap-4">
              <ScoreRing score={report.overall_score} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {statusBadge(report.final_status)}
                  <span className="text-xs text-gray-400">Cycles: {report.cycles_completed} / 5</span>
                  <span className="text-xs text-gray-400">Run: {new Date(report.run_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{report.draft_title}</p>
                <p className="text-sm text-gray-600 mt-1">{report.final_recommendation}</p>
              </div>
              {report.final_status === 'READY_FOR_ADMIN_REVIEW' && onApproveDraft && (
                <button
                  onClick={() => onApproveDraft(report.draft_id)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              )}
            </div>
          </div>

          {/* Checks Grid */}
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Check Results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(report.checks) as [keyof typeof report.checks, QACheckResult][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">{CHECK_LABELS[k]}</span>
                  {checkBadge(v)}
                </div>
              ))}
            </div>
          </div>

          {/* Auto Fixes */}
          <Section
            title="Auto-Fixes Applied"
            count={report.auto_fixes.length}
            color="bg-blue-50 text-blue-800"
            defaultOpen={report.auto_fixes.length > 0}
          >
            {report.auto_fixes.map((fix, i) => (
              <div key={i} className="px-4 py-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench size={13} className="text-blue-500 flex-shrink-0" />
                  <span className="font-semibold text-gray-800">{fix.field}</span>
                  <span className="ml-auto text-gray-400">{new Date(fix.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="line-through text-red-400 bg-red-50 px-1 rounded max-w-xs truncate">{fix.old_value || '(empty)'}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-700 bg-green-50 px-1 rounded max-w-xs truncate">{fix.new_value}</span>
                </div>
                <p className="text-gray-500 mt-1">{fix.reason}</p>
              </div>
            ))}
          </Section>

          {/* Critical Errors */}
          <Section
            title="Critical Errors"
            count={report.critical_errors.length}
            color="bg-red-50 text-red-800"
            defaultOpen
          >
            {report.critical_errors.map((err, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2 text-xs">
                <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-red-700 capitalize">[{err.category}]</span>{' '}
                  <span className="text-gray-700">{err.message}</span>
                  {err.blocking && (
                    <span className="ml-2 bg-red-600 text-white text-xs px-1 rounded">BLOCKING</span>
                  )}
                </div>
              </div>
            ))}
          </Section>

          {/* Removed Unsupported Content */}
          <Section
            title="Removed Unsupported Content"
            count={report.removed_unsupported_content.length}
            color="bg-orange-50 text-orange-800"
            defaultOpen
          >
            {report.removed_unsupported_content.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2 text-xs">
                <Trash2 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-gray-800">{r.field}</span>
                  <span className={`ml-2 text-xs px-1 rounded ${r.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.severity}
                  </span>
                  <p className="text-gray-500 mt-0.5 italic">"{r.removed_text.length > 120 ? r.removed_text.slice(0, 120) + '…' : r.removed_text}"</p>
                  <p className="text-gray-600 mt-0.5">{r.reason}</p>
                </div>
              </div>
            ))}
          </Section>

          {/* Reprocess Requests */}
          <Section
            title="Reprocess Requests"
            count={report.reprocess_requests.length}
            color="bg-yellow-50 text-yellow-800"
            defaultOpen
          >
            {report.reprocess_requests.map((rr, i) => (
              <div key={i} className="px-4 py-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={13} className="text-yellow-600 flex-shrink-0" />
                  <span className="font-semibold text-gray-800">{rr.field}</span>
                  <span className="ml-auto text-indigo-600 font-semibold">{rr.responsible_agent}</span>
                </div>
                <p className="text-gray-600">{rr.issue}</p>
                {rr.downstream_agents.length > 0 && (
                  <p className="text-gray-400 mt-0.5">
                    Downstream: {rr.downstream_agents.join(' → ')}
                  </p>
                )}
              </div>
            ))}
          </Section>

          {/* Manual Review Items */}
          <Section
            title="Manual Review Required"
            count={report.manual_review_items.length}
            color="bg-purple-50 text-purple-800"
            defaultOpen
          >
            {report.manual_review_items.map((m, i) => (
              <div key={i} className="px-4 py-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={13} className="text-purple-500 flex-shrink-0" />
                  <span className="font-semibold text-gray-800">{m.field}</span>
                </div>
                <p className="text-gray-700">{m.issue}</p>
                <p className="text-gray-500 mt-0.5">Current: <span className="text-gray-800 italic">{m.current_value || '(empty)'}</span></p>
                <p className="text-gray-500">Reason: {m.reason_cannot_auto_fix}</p>
              </div>
            ))}
          </Section>

          {/* Warnings */}
          <Section
            title="Warnings"
            count={report.warnings.length}
            color="bg-gray-50 text-gray-700"
            defaultOpen={false}
          >
            {report.warnings.map((w, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-2 text-xs text-gray-600">
                <AlertTriangle size={13} className="text-yellow-500 flex-shrink-0" />
                <span className="font-semibold capitalize">[{w.category}]</span>
                <span>{w.message}</span>
              </div>
            ))}
          </Section>

        </div>
      )}

      {/* Empty state */}
      {!loading && !report && !error && (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a draft above and click <strong>Run QA Check</strong> to begin the audit.</p>
        </div>
      )}
    </div>
  );
}
