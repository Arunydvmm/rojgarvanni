import React, { useState } from 'react';
import { Search, Menu, X, Landmark, Bell } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onSearchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'jobs', label: 'Government Jobs' },
    { id: 'results', label: 'Results' },
    { id: 'admit-cards', label: 'Admit Cards' },
    { id: 'answer-keys', label: 'Answer Keys' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header id="public-header" className="sticky top-0 z-40 bg-[#0f2942] text-white shadow-md border-b border-slate-700">
      {/* Top Notification Bar */}
      <div className="bg-[#0b1f33] border-b border-slate-800 text-xs py-1.5 px-4 text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Verified</span>
            <span className="text-slate-200 truncate">Official Indian Government Recruitment Notifications Portal - Updated Daily</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Last Checked: Today</span>
            <span>100% Free Service</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-inner">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white font-serif">RozgarVaani</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">GOVT</span>
            </div>
            <p className="text-[11px] text-slate-300 tracking-wide font-medium">India Government Job Alerts</p>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <button
            id="btn-trigger-search"
            onClick={onSearchClick}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm border border-slate-700 transition-colors"
            title="Search Government Jobs"
          >
            <Search className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-xs font-medium text-slate-300">Search SSC, UPSC, Railway...</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0b1f33] border-t border-slate-800 px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-md text-base font-medium ${
                currentTab === item.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
