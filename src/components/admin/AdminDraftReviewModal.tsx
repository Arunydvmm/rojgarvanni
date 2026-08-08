import React, { useState } from 'react';
import { GovtJob } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface AdminDraftReviewModalProps {
  draft: GovtJob;
  token: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const AdminDraftReviewModal: React.FC<AdminDraftReviewModalProps> = ({
  draft,
  token,
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const report = draft.verificationReport;
  const isFailed = report?.verificationStatus === 'FAILED';

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Government Job verified and published to public portal successfully!');
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Approval failed.');
      }
    } catch (err) {
      setError('Server error while approving draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject and delete this draft?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        onRefresh();
        onClose();
      } else {
        setError(data.message || 'Reject failed.');
      }
    } catch (err) {
      setError('Server error while rejecting draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                Draft Inspection
              </span>
              <span className="text-xs text-slate-400">{draft.organization}</span>
            </div>
            <h2 className="text-xl font-bold font-serif text-white mt-1">{draft.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold text-center">
            {success}
          </div>
        )}

        {/* Verification Report Hard Gate Notice */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isFailed
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {isFailed ? (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          )}

          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Verification Status:{' '}
              <span className={isFailed ? 'text-rose-400' : 'text-emerald-400'}>
                {report?.verificationStatus || 'PASSED'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (Confidence: {((report?.overallConfidence || 0.95) * 100).toFixed(0)}%)
              </span>
            </h3>

            {isFailed ? (
              <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                <strong>HARD GATE BLOCKED:</strong> This draft failed automated factual verification (mismatch detected between AI extraction and official PDF evidence). It <strong>CANNOT</strong> be published to candidates until resolved or re-processed.
              </p>
            ) : (
              <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                <strong>VERIFICATION PASSED:</strong> AI extracted facts match the official government PDF evidence. Administrator approval is granted.
              </p>
            )}
          </div>
        </div>

        {/* Evidence Mismatch Comparison Table */}
        {report && report.mismatches && report.mismatches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Field Comparison & Mismatches
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">AI Extracted Value</th>
                    <th className="p-2.5">Source Evidence</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {report.mismatches.map((m, idx) => (
                    <tr key={idx} className={m.match ? 'bg-slate-900/50' : 'bg-rose-950/20'}>
                      <td className="p-2.5 font-mono font-bold text-slate-200">{m.field}</td>
                      <td className="p-2.5 font-medium text-slate-100">{m.extractedValue}</td>
                      <td className="p-2.5 font-medium text-slate-300">{m.sourceEvidence}</td>
                      <td className="p-2.5">
                        {m.match ? (
                          <span className="text-emerald-400 font-bold">MATCH ✓</span>
                        ) : (
                          <span className="text-rose-400 font-bold">MISMATCH ✕</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Extracted Details Summary */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
          <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
            Extracted Job Information Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
            <div>
              <span className="text-slate-500 block">Total Vacancies</span>
              <strong className="text-white text-sm">{draft.totalVacancies.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Qualification</span>
              <strong className="text-white text-sm">{draft.qualification}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">App Start Date</span>
              <strong className="text-emerald-400 text-sm">{draft.applicationStart}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">App End Date</span>
              <strong className="text-rose-400 text-sm">{draft.applicationEnd}</strong>
            </div>
          </div>
          <div>
            <span className="text-slate-500 block">Application Fee (Gen/OBC)</span>
            <strong className="text-white">{draft.applicationFee.generalObc}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Official Source URL</span>
            <a
              href={draft.links.officialWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1 mt-0.5"
            >
              {draft.links.officialWebsiteUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Controls */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleReject}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold rounded-xl text-xs transition-colors"
          >
            Reject & Delete Draft
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApprove}
              disabled={loading || isFailed}
              className={`w-1/2 sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isFailed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {isFailed ? (
                <>
                  <Lock className="w-4 h-4" />
                  Hard Gate Blocked
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Publish Job
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
