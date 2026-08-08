import React from 'react';
import { ShieldCheck, Landmark, CheckCircle, FileText, Info } from 'lucide-react';

interface FooterProps {
  onNavClick: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavClick }) => {
  return (
    <footer id="public-footer" className="bg-[#0b1f33] text-slate-300 text-sm border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <Landmark className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white font-serif tracking-tight">RozgarVaani</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              India's authentic government job information portal. Providing structured alerts, official notifications, admit cards, and results verified against government press releases.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Official Notifications Authority Verified</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4 border-b border-slate-800 pb-2">
              Recruitment Categories
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavClick('jobs')} className="hover:text-amber-400 transition-colors">
                  Central Government Jobs
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('jobs')} className="hover:text-amber-400 transition-colors">
                  SSC CGL & CHSL Recruitment
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('jobs')} className="hover:text-amber-400 transition-colors">
                  UPSC Civil Services 2026
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('jobs')} className="hover:text-amber-400 transition-colors">
                  Railway Recruitment Board (RRB)
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('jobs')} className="hover:text-amber-400 transition-colors">
                  SBI & IBPS Bank PO / Clerk
                </button>
              </li>
            </ul>
          </div>

          {/* Verification & Source Policy */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4 border-b border-slate-800 pb-2">
              Official Resources
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavClick('results')} className="hover:text-amber-400 transition-colors">
                  Latest Exam Results
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('admit-cards')} className="hover:text-amber-400 transition-colors">
                  Download Hall Tickets & Admit Cards
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('answer-keys')} className="hover:text-amber-400 transition-colors">
                  Official Answer Keys & Objections
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('source-policy')} className="hover:text-amber-400 transition-colors">
                  Government Source Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Information & Disclaimer */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4 border-b border-slate-800 pb-2">
              Legal & Disclaimers
            </h3>
            <ul className="space-y-2 text-xs text-slate-400 mb-4">
              <li>
                <button onClick={() => onNavClick('about')} className="hover:text-amber-400 transition-colors">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('privacy')} className="hover:text-amber-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('terms')} className="hover:text-amber-400 transition-colors">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('disclaimer')} className="hover:text-amber-400 transition-colors">
                  Government Disclaimer
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-4 rounded-lg">
          <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Important Disclaimer:
          </p>
          RozgarVaani is an independent information service portal for government job notifications, results, admit cards, and answer keys. We gather information from official government notifications, gazettes, and official employment news portals. Candidates are strongly advised to always verify all details on the respective official government board website before applying.
        </div>

        {/* Copyright */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} RozgarVaani Portal. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 text-[11px]">Designed for Indian Students & Government Job Applicants</p>
        </div>
      </div>
    </footer>
  );
};
