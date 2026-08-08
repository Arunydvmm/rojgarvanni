import React from 'react';
import { ShieldCheck, Info, FileText, CheckCircle2, Landmark, ArrowLeft } from 'lucide-react';

interface StaticPagesProps {
  pageType: 'about' | 'privacy' | 'terms' | 'disclaimer' | 'source-policy';
  onBack: () => void;
}

export const StaticPages: React.FC<StaticPagesProps> = ({ pageType, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-amber-700 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-slate-800 text-sm leading-relaxed">
        {pageType === 'about' && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <Landmark className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">About RozgarVaani Portal</h1>
                <p className="text-xs text-slate-500">Authentic Indian Government Job Alerts & Recruitment Information</p>
              </div>
            </div>
            <p>
              RozgarVaani is a dedicated government recruitment information aggregator designed for Indian students, job aspirants, and career seekers. Our mission is to eliminate confusion caused by fake job rumors by delivering verified, structured notifications directly from official government gazettes, recruitment boards, and public feeds.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-base">Key Principles</h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                <li>100% Free for all candidates</li>
                <li>Zero fabricated or unverified job claims</li>
                <li>Strict verification gate comparing all details against official PDF notifications</li>
                <li>Direct links to official apply portals (e.g. ssc.gov.in, upsc.gov.in, indianrailways.gov.in)</li>
              </ul>
            </div>
          </>
        )}

        {pageType === 'privacy' && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">Privacy Policy</h1>
                <p className="text-xs text-slate-500">Last updated: August 2026</p>
              </div>
            </div>
            <p>
              RozgarVaani values the privacy of every candidate visiting our portal. We do not require registration or personal identity information to browse public government notifications, results, admit cards, or answer keys.
            </p>
            <h3 className="font-bold text-slate-900 text-base">Data Usage & Cookies</h3>
            <p>
              We may collect standard, non-personally identifiable web telemetry (e.g., browser type, mobile screen size, page views) solely to optimize portal loading speed and low-bandwidth performance on mobile devices across India.
            </p>
          </>
        )}

        {pageType === 'terms' && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">Terms & Conditions</h1>
                <p className="text-xs text-slate-500">Usage Terms for Candidates</p>
              </div>
            </div>
            <p>
              By accessing RozgarVaani, you agree that the portal serves purely as an informational service summarizing public government job advertisements. While we perform rigorous verification, final application submissions and fee payments must always take place on the official government website linked on each job detail page.
            </p>
          </>
        )}

        {pageType === 'disclaimer' && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <Info className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">Government Disclaimer</h1>
                <p className="text-xs text-slate-500">Non-Government Entity Declaration</p>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-950 font-medium">
              RozgarVaani is NOT affiliated with, authorized by, or an official entity of any Central or State Government Department, Staff Selection Commission (SSC), Union Public Service Commission (UPSC), Railway Recruitment Board (RRB), or Banking Institute (IBPS/SBI).
            </div>
            <p>
              All trademarks, government logos, department names, and official notification PDFs belong exclusively to their respective government commissions. We reproduce permitted public recruitment information for public educational awareness and convenience.
            </p>
          </>
        )}

        {pageType === 'source-policy' && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">Government Source & Verification Policy</h1>
                <p className="text-xs text-slate-500">How we source and verify government recruitment data</p>
              </div>
            </div>
            <p>
              To maintain absolute factual integrity, RozgarVaani adheres to a strict 11-step AI and administrative verification pipeline before publishing any government job:
            </p>
            <ol className="list-decimal list-inside space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800">
              <li>
                <strong>Permitted Source Ingestion:</strong> Data is crawled only from official government websites (`.gov.in`, `.nic.in`, `.in`), public gazettes, and authorized feeds.
              </li>
              <li>
                <strong>Factual Evidence Extraction:</strong> Vacancies, age criteria, qualification, application fees, and deadlines are extracted directly from official advertisement PDFs.
              </li>
              <li>
                <strong>Verification Hard Gate:</strong> An automated verification agent compares extracted values against source PDF evidence. Any critical error or mismatch causes an immediate <span className="text-rose-700 font-bold">VERIFICATION FAILURE</span>.
              </li>
              <li>
                <strong>Human Administrator Approval:</strong> Even after passing AI verification, every draft requires manual human review and approval before publication on the public portal.
              </li>
            </ol>
          </>
        )}
      </div>
    </div>
  );
};
