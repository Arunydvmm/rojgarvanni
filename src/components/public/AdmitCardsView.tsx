import React, { useState } from 'react';
import { AdmitCard } from '../../types';
import { Ticket, ExternalLink, Search, Filter, Download, Landmark, Calendar } from 'lucide-react';

interface AdmitCardsViewProps {
  admitCards: AdmitCard[];
}

export const AdmitCardsView: React.FC<AdmitCardsViewProps> = ({ admitCards }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<AdmitCard | null>(null);

  const categories = ['All', 'SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'Police', 'Teaching'];

  const filtered = admitCards.filter((a) => {
    const matchesCat = selectedCategory === 'All' || a.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.examName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
          <Ticket className="w-8 h-8 text-amber-600" />
          Government Admit Cards & Hall Tickets 2026
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Direct verified links to download CBT admission certificates, call letters, and exam hall tickets.
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
            placeholder="Search admit card by exam name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
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
          No admit cards found matching your query.
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
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    AVAILABLE NOW
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{item.title}</h3>
                <p className="text-xs text-slate-500 font-medium mb-3">{item.organization}</p>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 mb-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Exam Date:</span>
                    <strong className="text-slate-900">{item.examDate}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Release Date:</span>
                    <strong className="text-amber-800">{item.admitCardReleaseDate}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Official Download</span>
                <button
                  onClick={() => setSelectedCard(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Download Admit Card
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">{selectedCard.title}</h3>
              <button onClick={() => setSelectedCard(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                <strong>Organization:</strong> {selectedCard.organization}
              </p>
              <p>
                <strong>Exam Name:</strong> {selectedCard.examName}
              </p>
              <p>
                <strong>Exam Schedule Date:</strong> {selectedCard.examDate}
              </p>

              {selectedCard.instructions && selectedCard.instructions.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong className="text-amber-900 block mb-1">Important Exam Instructions:</strong>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    {selectedCard.instructions.map((inst, idx) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={selectedCard.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                Download Admit Card / Call Letter
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={selectedCard.officialWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                Official Board Website
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
