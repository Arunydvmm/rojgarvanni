import React, { useState } from 'react';
import { ExamResult } from '../../types';
import { FileCheck, Download, ExternalLink, Search, Filter, Landmark } from 'lucide-react';

interface ResultsViewProps {
  results: ExamResult[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  const categories = ['All', 'SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'Police', 'Teaching', 'State Government'];

  const filtered = results.filter((r) => {
    const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.examName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
          <FileCheck className="w-8 h-8 text-emerald-600" />
          Government Exam Results 2026
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Latest official merit lists, PDF result notifications, and category cut-off marks.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search result by exam or organization..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
          No government exam results found matching your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                    <Landmark className="w-3 h-3 text-slate-500" />
                    {item.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    DECLARED
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{item.title}</h3>
                <p className="text-xs text-slate-500 font-medium mb-3">{item.organization}</p>

                {item.cutOffInfo && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 mb-4">
                    <strong className="text-slate-900 block text-[11px] uppercase mb-0.5">Cut-Off / Merit Note:</strong>
                    <p className="line-clamp-2 text-[11px]">{item.cutOffInfo}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Result Date: <strong>{item.resultDate}</strong>
                </span>
                <button
                  onClick={() => setSelectedResult(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Download Result
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{selectedResult.title}</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                <strong>Organization:</strong> {selectedResult.organization}
              </p>
              <p>
                <strong>Exam Name:</strong> {selectedResult.examName}
              </p>
              <p>
                <strong>Result Date:</strong> {selectedResult.resultDate}
              </p>
              {selectedResult.cutOffInfo && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong className="text-amber-900 block mb-1">Category-wise Cutoff / Notice:</strong>
                  <p>{selectedResult.cutOffInfo}</p>
                </div>
              )}
              {selectedResult.overview && <p className="leading-relaxed bg-slate-50 p-3 rounded-lg">{selectedResult.overview}</p>}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={selectedResult.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                Download Official Result PDF
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={selectedResult.officialWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                Visit Official Government Board Portal
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
