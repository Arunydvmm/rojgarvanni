import React from 'react';
import { GovtJob, ExamResult, AdmitCard, AnswerKey } from '../../types';
import { HeroSearch } from './HeroSearch';
import { QuickCategoryCards } from './QuickCategoryCards';
import { JobCard } from './JobCard';
import { AdBanner } from './AdBanner';
import {
  ArrowRight,
  Briefcase,
  FileCheck,
  Ticket,
  Key,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Download,
  ExternalLink,
} from 'lucide-react';

interface HomeViewProps {
  jobs: GovtJob[];
  results: ExamResult[];
  admitCards: AdmitCard[];
  answerKeys: AnswerKey[];
  adsEnabled: boolean;
  ads: any[];
  onSelectJob: (job: GovtJob) => void;
  onNavigateTab: (tab: string, query?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  jobs,
  results,
  admitCards,
  answerKeys,
  adsEnabled,
  ads,
  onSelectJob,
  onNavigateTab,
}) => {
  const publishedJobs = jobs.filter((j) => !j.isDraft);
  const latestJobs = publishedJobs.slice(0, 6);
  const closingSoonJobs = publishedJobs.filter((j) => j.isClosingSoon || j.status === 'CLOSING_SOON').slice(0, 3);

  const popularExams = [
    { name: 'SSC CGL 2026', category: 'SSC' },
    { name: 'UPSC IAS / IPS 2026', category: 'UPSC' },
    { name: 'RRB NTPC Railway', category: 'Railway' },
    { name: 'SBI PO & Clerk', category: 'Banking' },
    { name: 'UP Police Constable', category: 'Police' },
    { name: 'Indian Navy Agniveer', category: 'Defence' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Search Section */}
      <HeroSearch
        onSearchSubmit={(q) => {
          onNavigateTab('jobs', q);
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Quick Category Cards */}
        <QuickCategoryCards
          onCategorySelect={(tab) => onNavigateTab(tab)}
          counts={{
            jobs: publishedJobs.length,
            results: results.length,
            admitCards: admitCards.length,
            answerKeys: answerKeys.length,
          }}
        />

        {/* Optional Top Ad Banner Placement */}
        <AdBanner adsEnabled={adsEnabled} placement="HOME_TOP" ads={ads} />

        {/* Closing Soon Section */}
        {closingSoonJobs.length > 0 && (
          <section className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-1.5">
                  <Clock className="w-5 h-5 text-amber-700" />
                  Government Applications Closing Soon!
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('jobs')}
                className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {closingSoonJobs.map((job) => (
                <JobCard key={job.id} job={job} onSelect={onSelectJob} />
              ))}
            </div>
          </section>
        )}

        {/* Latest Government Jobs Section */}
        <section>
          <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-amber-600" />
                Latest Government Recruitment Notifications
              </h2>
              <p className="text-xs text-slate-500">Verified official gazettes and vacancy notifications</p>
            </div>
            <button
              onClick={() => onNavigateTab('jobs')}
              className="text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
            >
              View All Jobs ({publishedJobs.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={onSelectJob} />
            ))}
          </div>
        </section>

        {/* Grid Section for Results, Admit Cards & Answer Keys */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Results Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 font-serif text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  Latest Exam Results
                </h3>
                <button
                  onClick={() => onNavigateTab('results')}
                  className="text-xs font-bold text-emerald-800 hover:underline"
                >
                  More
                </button>
              </div>

              <div className="space-y-3">
                {results.slice(0, 3).map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onNavigateTab('results')}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{res.organization}</span>
                      <span className="text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">DECLARED</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{res.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Date: {res.resultDate}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('results')}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-lg text-center transition-colors"
            >
              Check All Results →
            </button>
          </div>

          {/* Latest Admit Cards Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 font-serif text-base flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-600" />
                  Latest Admit Cards
                </h3>
                <button
                  onClick={() => onNavigateTab('admit-cards')}
                  className="text-xs font-bold text-amber-900 hover:underline"
                >
                  More
                </button>
              </div>

              <div className="space-y-3">
                {admitCards.slice(0, 3).map((adm) => (
                  <div
                    key={adm.id}
                    onClick={() => onNavigateTab('admit-cards')}
                    className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{adm.organization}</span>
                      <span className="text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{adm.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Exam: {adm.examDate}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('admit-cards')}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-lg text-center transition-colors"
            >
              Download Admit Cards →
            </button>
          </div>

          {/* Latest Answer Keys Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 font-serif text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  Latest Answer Keys
                </h3>
                <button
                  onClick={() => onNavigateTab('answer-keys')}
                  className="text-xs font-bold text-indigo-800 hover:underline"
                >
                  More
                </button>
              </div>

              <div className="space-y-3">
                {answerKeys.slice(0, 3).map((ak) => (
                  <div
                    key={ak.id}
                    onClick={() => onNavigateTab('answer-keys')}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{ak.organization}</span>
                      <span className="text-indigo-800 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">{ak.status}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{ak.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Objection Deadline: {ak.objectionDeadline}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('answer-keys')}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-lg text-center transition-colors"
            >
              View All Answer Keys →
            </button>
          </div>
        </div>

        {/* Popular Recruitment Commissions Bar */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 font-serif flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Popular Government Recruitment Boards
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {popularExams.map((item) => (
              <button
                key={item.name}
                onClick={() => onNavigateTab('jobs', item.category)}
                className="p-3 bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 rounded-xl border border-slate-200 text-xs font-bold text-center transition-all hover:scale-[1.02]"
              >
                <div className="text-slate-500 text-[10px] uppercase font-mono mb-0.5">{item.category}</div>
                <div className="truncate">{item.name}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
