import React from 'react';
import { Briefcase, FileCheck, Ticket, Key, ArrowUpRight } from 'lucide-react';

interface QuickCategoryCardsProps {
  onCategorySelect: (tab: string) => void;
  counts: {
    jobs: number;
    results: number;
    admitCards: number;
    answerKeys: number;
  };
}

export const QuickCategoryCards: React.FC<QuickCategoryCardsProps> = ({ onCategorySelect, counts }) => {
  const categories = [
    {
      id: 'jobs',
      title: 'Government Jobs',
      subtitle: 'Active Recruitment Notices',
      count: counts.jobs,
      icon: Briefcase,
      color: 'from-blue-600 to-indigo-700',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      id: 'results',
      title: 'Exam Results',
      subtitle: 'Merit Lists & Cut Offs',
      count: counts.results,
      icon: FileCheck,
      color: 'from-emerald-600 to-teal-700',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      id: 'admit-cards',
      title: 'Admit Cards',
      subtitle: 'Hall Tickets & Call Letters',
      count: counts.admitCards,
      icon: Ticket,
      color: 'from-amber-600 to-orange-700',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      id: 'answer-keys',
      title: 'Answer Keys',
      subtitle: 'Provisional & Final Keys',
      count: counts.answerKeys,
      icon: Key,
      color: 'from-purple-600 to-indigo-800',
      badgeBg: 'bg-purple-50 text-purple-900 border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <div
            key={cat.id}
            id={`quick-cat-${cat.id}`}
            onClick={() => onCategorySelect(cat.id)}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${cat.color} text-white shadow-xs`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeBg}`}>
                {cat.count} Active
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  {cat.title}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{cat.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
