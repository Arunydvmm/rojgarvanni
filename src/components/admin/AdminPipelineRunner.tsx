import React, { useState, useEffect } from 'react';
import {
  Bot, Play, CheckCircle2, XCircle, Loader2,
  Wifi, WifiOff, Zap, Clock, RefreshCw, AlertTriangle,
} from 'lucide-react';

interface AgentStepStatus {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
}

const PIPELINE_STAGES: Omit<AgentStepStatus, 'status'>[] = [
  { id: 'DISCOVERY',      label: 'Discovery Agent'            },
  { id: 'CLASSIFICATION', label: 'Classification Agent'       },
  { id: 'EXTRACTION',     label: 'Extraction Agent'           },
  { id: 'NORMALIZATION',  label: 'Normalization Agent'        },
  { id: 'DUPLICATE',      label: 'Duplicate Detection Agent'  },
  { id: 'ENRICHMENT',     label: 'Enrichment Agent'           },
  { id: 'CONTENT',        label: 'Content Agent'              },
  { id: 'SEO',            label: 'SEO Agent'                  },
  { id: 'VERIFICATION',   label: 'Verification Agent'         },
  { id: 'QUALITY_CONTROL','label': 'Quality Control Agent'    },
  { id: 'FINAL_QA',       label: 'Final QA Agent'             },
];

const SAMPLE_NOTICES = [
  {
    label: 'SSC CGL 2026',
    source: 'Staff Selection Commission (SSC)',
    url: 'https://ssc.gov.in/notifications/cgl2026.pdf',
    text: `STAFF SELECTION COMMISSION
ADVERTISEMENT NO. SSC/CGL/2026
COMBINED GRADUATE LEVEL EXAMINATION, 2026
Total Vacancies: 17,727 Posts across Central Government Ministries.
Application Start: 15-08-2026 | Application End: 15-09-2026
Fee: Rs 100 (Exempted for Women/SC/ST/PwD)
Qualification: Bachelor's Degree | Age: 18-30 Years
Official Website: https://ssc.gov.in`,
  },
  {
    label: 'RRB NTPC 2026',
    source: 'Railway Recruitment Board (RRB)',
    url: 'https://indianrailways.gov.in/rrb-ntpc-2026.pdf',
    text: `RAILWAY RECRUITMENT BOARD (RRB)
NOTICE NO. CEN 01/2026 - NON-TECHNICAL POPULAR CATEGORIES (NTPC)
Vacancies: 11,558 Posts (Station Master, Goods Train Manager, Senior Clerk)
Application Start: 20-08-2026 | Application End: 20-09-2026
Qualification: Graduation / 12th Pass | Age: 18-33 Years
Fee: Rs 500 (Rs 250 for SC/ST/Ex-Servicemen)
Official Website: https://indianrailways.gov.in`,
  },
  {
    label: 'UPSC Civil Services 2026',
    source: 'Union Public Service Commission (UPSC)',
    url: 'https://upsc.gov.in/notifications/cse2026.pdf',
    text: `UNION PUBLIC SERVICE COMMISSION (UPSC)
CIVIL SERVICES EXAMINATION, 2026
Vacancies: 1,056 Posts (IAS, IPS, IFS, IRS and Allied Services)
Application Start: 01-09-2026 | Application End: 24-09-2026
Qualification: Graduate Degree from recognized University
Age: 21-32 Years | Fee: Rs 100 (Exempted for Female/SC/ST/PwBD)
Official Website: https://upsc.gov.in`,
  },
];

interface AdminPipelineRunnerProps {
  token: string;
  onRefreshJobs: () => void;
}

export const AdminPipelineRunner: React.FC<AdminPipelineRunnerProps> = ({ token, onRefreshJobs }) => {
  const [sourceName, setSourceName] = useState('Staff Selection Commission (SSC)');
  const [sourceUrl, setSourceUrl] = useState('https://ssc.gov.in/notifications/cgl2026.pdf');
  const [notificationText, setNotificationText] = useState(SAMPLE_NOTICES[0].text);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<AgentStepStatus[]>(
    PIPELINE_STAGES.map((s) => ({ ...s, status: 'pending' }))
  );
  const [resultDraft, setResultDraft] = useState<any>(null);
  const [error, setError] = useState('');
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [finalQaStatus, setFinalQaStatus] = useState<string | null>(null);

  // Failed pipeline sessions state
  const [failedSessions, setFailedSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [fixData, setFixData] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isFixing, setIsFixing] = useState(false);

  // NVIDIA connection state
  const [nvidiaOk, setNvidiaOk] = useState<boolean | null>(null);
  const [nvidiaChecking, setNvidiaChecking] = useState(false);
  const [nvidiaMs, setNvidiaMs] = useState<number | null>(null);

  async function checkNvidia() {
    setNvidiaChecking(true);
    try {
      const r = await fetch('/api/admin/nvidia/test');
      const d = await r.json();
      setNvidiaOk(d.success);
      setNvidiaMs(d.durationMs ?? null);
    } catch {
      setNvidiaOk(false);
    } finally {
      setNvidiaChecking(false);
    }
  }

  useEffect(() => { checkNvidia(); }, []);

  async function loadFailedSessions() {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/admin/pipeline/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter for BLOCKED_REVIEW sessions
        const blocked = data.sessions.filter((s: any) => s.current_status === 'BLOCKED_REVIEW');
        setFailedSessions(blocked);
      }
    } catch (error) {
      console.error('Failed to load pipeline sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    checkNvidia();
    loadFailedSessions();
  }, []);

  function resetStages() {
    setStages(PIPELINE_STAGES.map((s) => ({ ...s, status: 'pending' })));
  }

  function markStage(id: string, status: AgentStepStatus['status'], durationMs?: number) {
    setStages((prev) =>
      prev.map((s) => s.id === id ? { ...s, status, durationMs } : s)
    );
  }

  async function handleRunPipeline() {
    setRunning(true);
    resetStages();
    setResultDraft(null);
    setError('');
    setTotalMs(null);
    setFinalQaStatus(null);

    // Animate each stage to 'running' then receive real result from server
    // We optimistically show running state while the request is in flight
    const start = Date.now();
    let stageIdx = 0;

    const ticker = setInterval(() => {
      if (stageIdx < PIPELINE_STAGES.length) {
        const sid = PIPELINE_STAGES[stageIdx].id;
        setStages((prev) => prev.map((s) =>
          s.id === sid ? { ...s, status: 'running' } : s
        ));
        stageIdx++;
      }
    }, 800);

    try {
      const res = await fetch('/api/admin/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceName, sourceUrl, rawText: notificationText }),
      });

      clearInterval(ticker);
      const data = await res.json();
      const elapsed = Date.now() - start;
      setTotalMs(elapsed);

      if (data.success) {
        // Mark all stages green using actual agent logs
        const logMap: Record<string, string> = {};
        (data.data?.logs ?? []).forEach((l: any) => { logMap[l.agentType] = l.status; });

        setStages((prev) =>
          prev.map((s) => ({
            ...s,
            status:
              logMap[s.id] === 'SUCCESS' ? 'success' :
              logMap[s.id] === 'FAILED'  ? 'failed'  :
              logMap[s.id] === 'WARNING' ? 'success' : 'success',
          }))
        );

        setResultDraft(data.data?.draft);
        setFinalQaStatus(data.final_qa_status ?? null);
        onRefreshJobs();
      } else {
        // Mark the failed stage
        const failedStage = data.stage as string | undefined;
        setStages((prev) =>
          prev.map((s) => ({
            ...s,
            status:
              s.id === failedStage ? 'failed' :
              s.status === 'running' || s.status === 'pending' ? 'skipped' : s.status,
          }))
        );
        setError(data.message || 'Pipeline execution failed.');
      }
    } catch (err: any) {
      clearInterval(ticker);
      setStages((prev) =>
        prev.map((s) => ({ ...s, status: s.status === 'running' ? 'failed' : s.status === 'pending' ? 'skipped' : s.status }))
      );
      setError('Connection error — check server and NVIDIA API key.');
    } finally {
      setRunning(false);
    }
  }

  async function handleFixSession() {
    if (!selectedSession || !fixData.trim()) {
      alert('Please provide the fixed data in JSON format');
      return;
    }

    setIsFixing(true);
    try {
      // Parse the fix data to validate JSON
      const parsedData = JSON.parse(fixData);

      const res = await fetch(`/api/admin/pipeline/sessions/${selectedSession.id}/fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentIndex: selectedSession.current_agent_index,
          fixedData: parsedData,
          adminNotes: adminNotes || 'Admin manually fixed and resumed',
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('✓ Pipeline fixed and resumed successfully!');
        setSelectedSession(null);
        setFixData('');
        setAdminNotes('');
        loadFailedSessions();
        onRefreshJobs();
      } else {
        alert(`Failed to fix pipeline: ${data.message}`);
      }
    } catch (error: any) {
      console.error('Fix error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  }

  const stageIcon = (s: AgentStepStatus) => {
    if (s.status === 'pending')  return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
    if (s.status === 'running')  return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
    if (s.status === 'success')  return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (s.status === 'failed')   return <XCircle className="w-4 h-4 text-red-400" />;
    if (s.status === 'skipped')  return <div className="w-4 h-4 rounded-full border-2 border-slate-700 bg-slate-800" />;
  };

  const qaStatusColor =
    finalQaStatus === 'READY_FOR_ADMIN_REVIEW' ? 'text-emerald-400' :
    finalQaStatus === 'BLOCKED'                ? 'text-red-400' :
    finalQaStatus === 'REPROCESS_REQUIRED'     ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 min-h-screen">

      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-amber-400" />
            NVIDIA Multi-Agent Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Powered by <span className="text-amber-400 font-semibold">NVIDIA Nemotron Nano 9B</span> — one model,
            11 specialized agents, separate prompts.
          </p>
        </div>

        {/* NVIDIA Connection Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors
            ${nvidiaOk === true  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              nvidiaOk === false ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                   'bg-slate-800 border-slate-700 text-slate-400'}`}
          onClick={checkNvidia}
          title="Click to re-test NVIDIA connection"
        >
          {nvidiaChecking
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : nvidiaOk ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />
          }
          {nvidiaChecking ? 'Checking...' :
            nvidiaOk === true  ? `NVIDIA API Connected${nvidiaMs ? ` · ${nvidiaMs}ms` : ''}` :
            nvidiaOk === false ? 'NVIDIA API Unreachable' : 'NVIDIA Status Unknown'}
        </div>
      </div>

      {/* Sample notice selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400">Sample Notices:</span>
        {SAMPLE_NOTICES.map((s) => (
          <button
            key={s.label}
            onClick={() => { setSourceName(s.source); setSourceUrl(s.url); setNotificationText(s.text); }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Input */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">Notification Input</h3>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Government Source Name</label>
            <input type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Source URL / Gazette PDF</label>
            <input type="text" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Advertisement Text</label>
            <textarea rows={9} value={notificationText} onChange={(e) => setNotificationText(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed" />
          </div>

          <button
            onClick={handleRunPipeline}
            disabled={running || !notificationText.trim()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {running
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running NVIDIA Pipeline…</>
              : <><Play className="w-4 h-4 fill-current" /> Run NVIDIA Multi-Agent Pipeline</>
            }
          </button>
        </div>

        {/* Right: Pipeline stages + result */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Agent Execution Stages</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <Zap className="w-3 h-3 text-amber-400" />
              nvidia/nvidia-nemotron-nano-9b-v2
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Stage list */}
          <div className="space-y-1.5">
            {stages.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${s.status === 'running'  ? 'bg-amber-500/10 border border-amber-500/20' :
                  s.status === 'success'  ? 'bg-emerald-500/5 border border-emerald-500/10' :
                  s.status === 'failed'   ? 'bg-red-500/10 border border-red-500/20' :
                  s.status === 'skipped'  ? 'opacity-40 bg-slate-900' :
                                            'bg-slate-900/50'}`}
              >
                <span className="text-slate-600 text-xs w-4 text-right shrink-0">{i + 1}</span>
                {stageIcon(s)}
                <span className={`text-xs font-semibold flex-1
                  ${s.status === 'running' ? 'text-amber-300' :
                    s.status === 'success' ? 'text-emerald-300' :
                    s.status === 'failed'  ? 'text-red-300' :
                    s.status === 'skipped' ? 'text-slate-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {s.status === 'running' && (
                  <span className="text-[10px] text-amber-400 font-mono">Processing…</span>
                )}
              </div>
            ))}
          </div>

          {/* Summary row */}
          {totalMs !== null && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Total: {(totalMs / 1000).toFixed(1)}s
              {finalQaStatus && (
                <span className={`ml-auto font-bold ${qaStatusColor}`}>{finalQaStatus}</span>
              )}
            </div>
          )}

          {/* Result card */}
          {resultDraft && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Draft sent to Verification Queue
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded
                  ${resultDraft.verificationReport?.verificationStatus === 'PASSED'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'}`}>
                  {resultDraft.verificationReport?.verificationStatus}
                </span>
              </div>
              <p className="font-bold text-white">{resultDraft.title}</p>
              <p className="text-slate-300">
                Vacancies: <strong>{resultDraft.totalVacancies}</strong> ·
                Deadline: <strong>{resultDraft.applicationEnd}</strong>
              </p>
              <p className="text-slate-500 text-[10px] font-mono">
                Model: NVIDIA Nemotron Nano 9B · Draft ID: {resultDraft.id}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Model Info Card */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5">
        <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Model Configuration
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            { label: 'Provider',   value: 'NVIDIA'                                  },
            { label: 'Model',      value: 'Nemotron Nano 9B'                        },
            { label: 'Model ID',   value: 'nvidia/nvidia-nemotron-nano-9b-v2'       },
            { label: 'API Base',   value: 'integrate.api.nvidia.com/v1'             },
            { label: 'Agents',     value: '11 specialized agents'                   },
            { label: 'Shared Key', value: 'Server-side only (never exposed)'        },
            { label: 'Retries',    value: 'Max 3 · Exponential back-off'            },
            { label: 'Timeout',    value: '30s per agent'                           },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-slate-500 uppercase tracking-wide text-[9px] font-bold mb-1">{item.label}</p>
              <p className="text-slate-200 font-mono text-[11px] break-all">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Failed Pipeline Sessions Section */}
      {failedSessions.length > 0 && (
        <div className="bg-slate-950 rounded-2xl border border-red-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Failed Pipelines Requiring Admin Review ({failedSessions.length})
            </h3>
            <button
              onClick={loadFailedSessions}
              disabled={loadingSessions}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              {loadingSessions ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            {failedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-900 border border-red-500/20 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{session.source_name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Failed at: <span className="text-red-400 font-semibold">{session.failed_agent}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Reason: {session.failure_reason || 'Unknown error'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Session ID: {session.id}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSession(session);
                      setFixData(JSON.stringify(session.current_draft || {}, null, 2));
                      setAdminNotes('');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Fix & Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix Session Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Fix Failed Pipeline</h3>
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setFixData('');
                  setAdminNotes('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm font-bold text-red-400 mb-2">Pipeline Failed At:</p>
                <p className="text-white font-semibold">{selectedSession.failed_agent}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {selectedSession.failure_reason}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                  Edit the data below and click "Fix & Resume" to continue the pipeline
                </label>
                <textarea
                  value={fixData}
                  onChange={(e) => setFixData(e.target.value)}
                  rows={15}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter corrected JSON data..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Document what you fixed..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleFixSession}
                  disabled={isFixing}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl"
                >
                  {isFixing ? 'Fixing & Resuming...' : 'Fix & Resume Pipeline'}
                </button>
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setFixData('');
                    setAdminNotes('');
                  }}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
