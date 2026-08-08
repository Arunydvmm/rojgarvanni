import React from 'react';
import { GovtJob } from '../../types';
import { Calendar, GraduationCap, Users, Clock, ArrowRight, ShieldCheck, Landmark } from 'lucide-react';

interface JobCardProps {
  job: GovtJob;
  onSelect: (job: GovtJob) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSelect }) => {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CLOSING_SOON':
        return 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
      case 'TODAY':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formattedDeadline = new Date(job.applicationEnd).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      id={`job-card-${job.id}`}
      onClick={() => onSelect(job)}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group relative"
    >
      <div>
        {/* Top Header: Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Landmark className="w-3 h-3 text-slate-600" />
            {job.category}
          </span>

          <div className="flex items-center gap-1.5">
            {job.isClosingSoon && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950">
                🟡 Closing Soon
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getBadgeStyle(
                job.status
              )}`}
            >
              {job.status === 'CLOSING_SOON' ? 'CLOSING SOON' : job.status}
            </span>
          </div>
        </div>

        {/* Title & Organization */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2 leading-snug mb-1">
          {job.title}
        </h3>
        <p className="text-xs font-medium text-slate-600 mb-4 flex items-center gap-1">
          <span>{job.organization}</span>
          {job.state && <span className="text-slate-400">({job.state})</span>}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-100 mb-4">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Vacancies: <strong className="text-slate-900">{job.totalVacancies.toLocaleString('en-IN')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              Qual: <strong className="text-slate-900">{job.qualification}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Age: <strong className="text-slate-900">{job.ageMin}–{job.ageMax} Yrs</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Fee: <strong className="text-slate-900">{job.applicationFee.generalObc}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Last Date Action */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="text-slate-600">
          Last Date: <span className="font-bold text-slate-900">{formattedDeadline}</span>
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-blue-800 group-hover:translate-x-0.5 transition-transform">
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
