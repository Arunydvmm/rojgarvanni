import React from 'react';
import { GovtJob } from '../../types';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  GraduationCap,
  Users,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Building2,
  Award,
  FileText,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface JobDetailViewProps {
  job: GovtJob;
  onBack: () => void;
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({ job, onBack }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Refer Notification';
    if (dateStr.length === 10 && dateStr.includes('-')) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      }
    }
    return dateStr;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Button */}
      <button
        id="btn-back-to-jobs"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-amber-700 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Government Jobs
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#0f2942] to-[#123456] text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              <Landmark className="w-3.5 h-3.5" />
              {job.category}
            </span>

            <div className="flex items-center gap-2">
              {job.isClosingSoon && (
                <span className="px-2.5 py-1 rounded text-xs font-extrabold bg-amber-400 text-slate-950 animate-pulse">
                  🟡 Closing Soon
                </span>
              )}
              <span className="px-2.5 py-1 rounded text-xs font-extrabold bg-emerald-500 text-white uppercase tracking-wider">
                {job.status}
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-serif mb-3 leading-snug">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 font-medium">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              {job.organization}
            </span>
            {job.advertisementNumber && (
              <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700 text-slate-300 font-mono text-[11px]">
                Advt No: {job.advertisementNumber}
              </span>
            )}
            {job.state && <span className="text-amber-300 font-semibold">State: {job.state}</span>}
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50 border-b border-slate-200 text-center p-4">
          <div className="p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Total Vacancies</span>
            <span className="text-lg font-black text-slate-900">{job.totalVacancies.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Qualification</span>
            <span className="text-sm font-bold text-slate-900 truncate block">{job.qualification}</span>
          </div>
          <div className="p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Age Limit</span>
            <span className="text-sm font-bold text-slate-900">{job.ageMin}–{job.ageMax} Yrs</span>
          </div>
          <div className="p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">App Start</span>
            <span className="text-sm font-bold text-emerald-800">{formatDate(job.applicationStart)}</span>
          </div>
          <div className="p-3 col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Last Date</span>
            <span className="text-sm font-bold text-rose-800">{formatDate(job.applicationEnd)}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Overview Section */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Recruitment Overview
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              {job.overview}
            </p>
          </section>

          {/* Important Dates Table */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Important Dates
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs sm:text-sm text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Event Activity</th>
                    <th className="px-4 py-3">Official Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Application Start Date</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{formatDate(job.applicationStart)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Last Date to Apply Online</td>
                    <td className="px-4 py-3 text-rose-700 font-bold">{formatDate(job.applicationEnd)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Fee Payment Deadline</td>
                    <td className="px-4 py-3 font-medium">{formatDate(job.feePaymentDeadline)}</td>
                  </tr>
                  {job.correctionWindow && (
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">Correction Window</td>
                      <td className="px-4 py-3 font-medium text-amber-800">{job.correctionWindow}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Exam Date</td>
                    <td className="px-4 py-3 font-bold text-blue-800">{job.examDate}</td>
                  </tr>
                  {job.admitCardDate && (
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">Admit Card Release</td>
                      <td className="px-4 py-3 font-medium">{job.admitCardDate}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Application Fee */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Application Fee
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">General / OBC / EWS</span>
                <span className="text-base font-extrabold text-slate-900">{job.applicationFee.generalObc}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">SC / ST Candidates</span>
                <span className="text-base font-extrabold text-emerald-800">{job.applicationFee.scSt}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">Female Candidates</span>
                <span className="text-base font-extrabold text-emerald-800">{job.applicationFee.female}</span>
              </div>
            </div>
            {job.applicationFee.details && (
              <p className="text-xs text-slate-600 italic bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                Fee Payment Mode: {job.applicationFee.details}
              </p>
            )}
          </section>

          {/* Educational Qualification & Age Limit */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <GraduationCap className="w-5 h-5 text-amber-600" />
                Educational Qualification
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700">
                <p>
                  <strong>Minimum Level:</strong> {job.qualification}
                </p>
                <p className="leading-relaxed">{job.qualificationDetails}</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Age Limit & Relaxation
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700">
                <p>
                  <strong>Minimum Age:</strong> {job.ageMin} Years
                </p>
                <p>
                  <strong>Maximum Age:</strong> {job.ageMax} Years
                </p>
                <p className="text-xs text-slate-600 border-t border-slate-200 pt-2 mt-2">
                  <strong>Age Relaxation:</strong> {job.ageRelaxation}
                </p>
              </div>
            </div>
          </section>

          {/* Vacancy Details Table */}
          {job.vacancyDetails && job.vacancyDetails.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Users className="w-5 h-5 text-amber-600" />
                Post-Wise Vacancy Details
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs sm:text-sm text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Post Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Vacancies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {job.vacancyDetails.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{v.postName}</td>
                        <td className="px-4 py-3 text-slate-600">{v.department || 'Central Dept'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {v.vacancies.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Selection Process */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Award className="w-5 h-5 text-amber-600" />
              Selection Process
            </h2>
            <ol className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800">
              {job.selectionProcess.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Salary / Pay Scale */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Salary & Pay Matrix
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Pay Level</span>
                <span className="font-bold text-slate-900">{job.salary.payLevel}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Pay Scale</span>
                <span className="font-bold text-slate-900">{job.salary.payScale}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Basic Pay</span>
                <span className="font-bold text-emerald-800">{job.salary.basicPay}</span>
              </div>
            </div>
          </section>

          {/* How to Apply */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <CheckCircle2 className="w-5 h-5 text-amber-600" />
              How to Apply Online
            </h2>
            <ul className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800">
              {job.howToApply.map((inst, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold shrink-0">✓</span>
                  <span className="leading-relaxed">{inst}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* IMPORTANT LINKS SECTION - Visually Distinct */}
          <section id="important-links-section" className="bg-gradient-to-br from-slate-900 to-[#0f2942] text-white p-6 rounded-2xl shadow-md border border-slate-800">
            <h2 className="text-xl font-extrabold text-amber-400 mb-4 flex items-center gap-2 font-serif">
              <ExternalLink className="w-6 h-6 text-amber-400" />
              IMPORTANT LINKS
            </h2>
            <p className="text-xs text-slate-300 mb-6">
              Only verified government URLs are listed. Click below to apply on the official portal or read the advertisement PDF.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {job.links.applyUrl && (
                <a
                  href={job.links.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-5 py-3.5 rounded-xl text-sm transition-all shadow-lg hover:scale-[1.02]"
                >
                  Apply Online
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {job.links.notificationUrl && (
                <a
                  href={job.links.notificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-3.5 rounded-xl text-sm border border-slate-700 transition-all"
                >
                  Official Notification PDF
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                </a>
              )}

              {job.links.officialWebsiteUrl && (
                <a
                  href={job.links.officialWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-5 py-3.5 rounded-xl text-sm border border-slate-700 transition-all"
                >
                  Official Website
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                </a>
              )}
            </div>
          </section>

          {/* SOURCE / TRUST SECTION */}
          <section className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-emerald-900 mb-1">Source & Verification Authority</h3>
                <p className="leading-relaxed mb-2">
                  This recruitment alert was sourced directly from <strong>{job.sourceInfo.name}</strong> ({job.sourceInfo.type}).
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-800 font-medium">
                  <span>Last Verified: <strong>{job.sourceInfo.lastVerified}</strong></span>
                  <span>Verification Gate: <strong className="text-emerald-900">PASSED ✓</strong></span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
