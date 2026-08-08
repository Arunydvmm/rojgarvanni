import React, { useState } from 'react';
import { AnswerKey } from '../../types';
import { Key, ExternalLink, Search, Filter, Download, Landmark } from 'lucide-react';

interface AnswerKeysViewProps {
  answerKeys: AnswerKey[];
}

export const AnswerKeysView: React.FC<AnswerKeysViewProps> = ({ answerKeys }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);

  const categories = ['All', 'SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'Police', 'Teaching'];

  const filtered = answerKeys.filter((ak) => {
    const matchesCat = selectedCategory === 'All' || ak.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      ak.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ak.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ak.examName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
          <Key className="w-8 h-8 text-indigo-600" />
          Government Exam Answer Keys 2026
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Provisional & Final Question Paper Answer Keys with official objection portal links.
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
            placeholder="Search answer key by exam name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
          No answer keys found matching your query.
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
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      item.status === 'FINAL'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    {item.status} KEY
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{item.title}</h3>
                <p className="text-xs text-slate-500 font-medium mb-3">{item.organization}</p>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 mb-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Release Date:</span>
                    <strong className="text-slate-900">{item.releaseDate}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Objection Deadline:</span>
                    <strong className="text-rose-700">{item.objectionDeadline}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Official Release</span>
                <button
                  onClick={() => setSelectedKey(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  View Answer Key
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedKey && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{selectedKey.title}</h3>
              <button onClick={() => setSelectedKey(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                <strong>Organization:</strong> {selectedKey.organization}
              </p>
              <p>
                <strong>Exam Name:</strong> {selectedKey.examName}
              </p>
              <p>
                <strong>Release Date:</strong> {selectedKey.releaseDate}
              </p>
              <p className="text-rose-700 font-bold">
                <strong>Objection Window Deadline:</strong> {selectedKey.objectionDeadline}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={selectedKey.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                Download Official Answer Key PDF
                <ExternalLink className="w-4 h-4" />
              </a>

              {selectedKey.objectionLink && (
                <a
                  href={selectedKey.objectionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  Submit Representation / Objection Online
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <a
                href={selectedKey.officialWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                Official Board Portal
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
