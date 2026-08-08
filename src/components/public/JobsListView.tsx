import React, { useState } from 'react';
import { GovtJob, JobCategory, QualificationLevel } from '../../types';
import { JobCard } from './JobCard';
import { Search, Filter, X, RefreshCw, Briefcase } from 'lucide-react';

interface JobsListViewProps {
  jobs: GovtJob[];
  onSelectJob: (job: GovtJob) => void;
  initialQuery?: string;
  initialCategory?: string;
}

export const JobsListView: React.FC<JobsListViewProps> = ({
  jobs,
  onSelectJob,
  initialQuery = '',
  initialCategory = 'All',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedQualification, setSelectedQualification] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');

  const categories: (JobCategory | 'All')[] = [
    'All',
    'SSC',
    'UPSC',
    'Railway',
    'Banking',
    'Defence',
    'Police',
    'Teaching',
    'Healthcare',
    'Engineering',
    'State Government',
    'Central Government',
    'Other',
  ];

  const qualifications: (QualificationLevel | 'All')[] = [
    'All',
    '10th',
    '12th',
    'ITI',
    'Diploma',
    'Graduation',
    'Post Graduation',
    'Engineering',
    'Medical',
    'Other',
  ];

  const filteredJobs = jobs.filter((job) => {
    if (job.isDraft) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchOrg = job.organization.toLowerCase().includes(q);
      const matchCategory = job.category.toLowerCase().includes(q);
      const matchQual = job.qualification.toLowerCase().includes(q);
      const matchPost = job.postNames.some((p) => p.toLowerCase().includes(q));
      if (!matchTitle && !matchOrg && !matchCategory && !matchQual && !matchPost) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'All' && job.category !== selectedCategory) {
      return false;
    }

    // Qualification filter
    if (selectedQualification !== 'All' && job.qualification !== selectedQualification) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'All' && job.status !== selectedStatus) {
      return false;
    }

    // State filter
    if (selectedState !== 'All' && job.state !== selectedState) {
      return false;
    }

    return true;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedQualification('All');
    setSelectedStatus('All');
    setSelectedState('All');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-8 h-8 text-amber-600" />
            Government Job Notifications 2026
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Browse verified job alerts across SSC, UPSC, Railways, Banking, Defence, and State Public Service Commissions.
          </p>
        </div>

        <div className="bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-bold self-start md:self-auto">
          Showing {filteredJobs.length} Verified Jobs
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-8 space-y-4">
        {/* Top Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            id="input-jobs-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by keyword (e.g. Inspector, Assistant, Station Master, 10th Pass)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Select Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Category / Board</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Qualification */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Qualification</label>
            <select
              value={selectedQualification}
              onChange={(e) => setSelectedQualification(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {qualifications.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSING_SOON">Closing Soon</option>
              <option value="NEW">New</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Job Cards Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <p className="text-slate-700 font-bold text-base">No government jobs match your selected filters.</p>
          <p className="text-xs text-slate-500">Try broadening your search query or clicking "Reset All Filters".</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-600 shadow-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </div>
      )}
    </div>
  );
};
