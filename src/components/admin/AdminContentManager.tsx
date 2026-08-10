import React, { useState } from 'react';
import { GovtJob } from '../../types';
import { FileText, Plus, Search, ShieldCheck, CheckCircle2, AlertTriangle, Trash2, Edit } from 'lucide-react';

interface AdminContentManagerProps {
  jobs: GovtJob[];
  token: string;
  onRefresh: () => void;
  onSelectDraft: (job: GovtJob) => void;
}

export const AdminContentManager: React.FC<AdminContentManagerProps> = ({
  jobs,
  token,
  onRefresh,
  onSelectDraft,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLISHED' | 'DRAFTS'>('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to DELETE this article?\n\n"${jobTitle}"\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsDeleting(jobId);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete article');
      }

      alert('✓ Article deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete article. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (job: GovtJob) => {
    // Convert published job to draft for editing
    onSelectDraft(job);
  };

  const filteredJobs = jobs.filter((j) => {
    if (filterType === 'PUBLISHED' && j.isDraft) return false;
    if (filterType === 'DRAFTS' && !j.isDraft) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.organization.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-amber-400" />
            Government Job Content Repository
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage live public job listings, inspect AI drafts, and manage recruitment notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('DRAFTS')}
            className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold"
          >
            Draft Queue ({jobs.filter((j) => j.isDraft).length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or organization..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg ${
              filterType === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilterType('PUBLISHED')}
            className={`px-3 py-1.5 rounded-lg ${
              filterType === 'PUBLISHED' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
            }`}
          >
            Live Published ({jobs.filter((j) => !j.isDraft).length})
          </button>
          <button
            onClick={() => setFilterType('DRAFTS')}
            className={`px-3 py-1.5 rounded-lg ${
              filterType === 'DRAFTS' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
            }`}
          >
            Verification Drafts ({jobs.filter((j) => j.isDraft).length})
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Title & Organization</th>
                <th className="p-3">Category</th>
                <th className="p-3">Vacancies</th>
                <th className="p-3">Last Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredJobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-900/50">
                  <td className="p-3">
                    <div className="font-bold text-white text-sm leading-snug">{j.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{j.organization}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-300">{j.category}</td>
                  <td className="p-3 font-mono font-bold text-white">{j.totalVacancies.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-slate-300">{j.applicationEnd}</td>
                  <td className="p-3">
                    {j.isDraft ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        VERIFICATION DRAFT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        PUBLISHED LIVE
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {j.isDraft ? (
                      <button
                        onClick={() => onSelectDraft(j)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs"
                      >
                        Inspect Draft
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(j)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1"
                          title="Edit this article"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(j.id, j.title)}
                          disabled={isDeleting === j.id}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete this article"
                        >
                          <Trash2 className="w-3 h-3" />
                          {isDeleting === j.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
