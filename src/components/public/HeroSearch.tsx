import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, TrendingUp, X } from 'lucide-react';

interface HeroSearchProps {
  onSearchSubmit: (query: string) => void;
  initialQuery?: string;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({ onSearchSubmit, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const popularSearches = [
    'SSC CGL 2026',
    'UPSC Civil Services',
    'RRB NTPC',
    'SBI PO',
    'UP Police Constable',
    '10th Pass Jobs',
    '12th Pass Jobs',
    'Graduation Jobs',
    'Defence Jobs',
    'Railway Recruitment',
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
    onSearchSubmit(term);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearchSubmit(query);
  };

  return (
    <div className="bg-[#0f2942] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-inner">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-serif mb-3 leading-tight">
          Find Authentic Government Jobs, Exams & Results
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-6">
          Verified recruitment notifications, official admit cards, and published results from SSC, UPSC, Railways, Banking, and State Commissions.
        </p>

        {/* Search Form Box */}
        <div ref={searchRef} className="relative max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="hero-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search SSC, UPSC, Railway, Police, 10th Pass, 12th Pass, Graduation..."
              className="w-full pl-11 pr-24 py-3.5 bg-white text-slate-900 rounded-xl text-sm sm:text-base font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onSearchSubmit('');
                }}
                className="absolute right-28 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              id="btn-hero-search-submit"
              className="absolute right-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Autocomplete Overlay */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 text-left overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Popular Government Searches
                </span>
                <span className="text-[11px] text-slate-400">Press Enter</span>
              </div>
              <div className="py-2 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSelect(term)}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium hover:bg-amber-50 text-slate-800 hover:text-amber-900 flex items-center justify-between transition-colors"
                  >
                    <span>{term}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      Verified
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Tag Pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Filters:</span>
          {['10th Pass', '12th Pass', 'Graduation', 'SSC CGL', 'UPSC', 'Railway'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleSelect(tag)}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
