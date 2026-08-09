import React, { useState, useEffect } from 'react';
import { GovtJob, ExamResult, AdmitCard, AnswerKey, AgentLog, SourceRegistry, AdCampaign, GovtJobDraft } from './types';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import { OfflineStatusBanner } from './components/public/OfflineStatusBanner';

// Public Components
import { Navbar } from './components/public/Navbar';
import { Footer } from './components/public/Footer';
import { HomeView } from './components/public/HomeView';
import { JobsListView } from './components/public/JobsListView';
import { JobDetailView } from './components/public/JobDetailView';
import { ResultsView } from './components/public/ResultsView';
import { AdmitCardsView } from './components/public/AdmitCardsView';
import { AnswerKeysView } from './components/public/AnswerKeysView';
import { StaticPages } from './components/public/StaticPages';

// Admin Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminContentManager } from './components/admin/AdminContentManager';
import { AdminDraftReviewModal } from './components/admin/AdminDraftReviewModal';
import { AdminPipelineRunner } from './components/admin/AdminPipelineRunner';
import { AdminSourcesManager } from './components/admin/AdminSourcesManager';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';
import AdminFinalQAPanel from './components/admin/AdminFinalQAPanel';
import AdminSystemHealth from './components/admin/AdminSystemHealth';
import { AdminScraperDashboard } from './components/admin/AdminScraperDashboard';

export default function App() {
  // Offline & PWA State
  const offlineState = useOfflineStatus();

  // Public State
  const [publicTab, setPublicTab] = useState<string>('home');
  const [selectedJob, setSelectedJob] = useState<GovtJob | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [inspectDraft, setInspectDraft] = useState<GovtJob | null>(null);

  // Data Collections
  const [jobs, setJobs] = useState<GovtJob[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [sources, setSources] = useState<SourceRegistry[]>([]);
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(false);
  const [drafts, setDrafts] = useState<GovtJobDraft[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Check URL Hash or path for admin access
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#admin' || path === '/admin') {
        setIsAdminMode(true);
      }
    };
    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  // Fetch initial public data from API endpoints with offline local storage backing
  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      const [jobsRes, resultsRes, admitRes, answerRes, logsRes, sourcesRes, adsRes, draftsRes] = await Promise.all([
        fetch('/api/jobs').then((r) => r.json()).catch(() => null),
        fetch('/api/results').then((r) => r.json()).catch(() => null),
        fetch('/api/admit-cards').then((r) => r.json()).catch(() => null),
        fetch('/api/answer-keys').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/logs').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/sources').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/ads').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/drafts').then((r) => r.json()).catch(() => null),
      ]);

      const jobsData = Array.isArray(jobsRes) ? jobsRes : jobsRes?.data;
      const resultsData = Array.isArray(resultsRes) ? resultsRes : resultsRes?.data;
      const admitData = Array.isArray(admitRes) ? admitRes : admitRes?.data;
      const answerData = Array.isArray(answerRes) ? answerRes : answerRes?.data;
      const logsData = Array.isArray(logsRes) ? logsRes : logsRes?.data;
      const sourcesData = Array.isArray(sourcesRes) ? sourcesRes : sourcesRes?.data;

      if (Array.isArray(jobsData) && jobsData.length > 0) {
        setJobs(jobsData);
        localStorage.setItem('rozgar_cache_jobs', JSON.stringify(jobsData));
      } else {
        const cached = localStorage.getItem('rozgar_cache_jobs');
        if (cached) setJobs(JSON.parse(cached));
      }

      if (Array.isArray(resultsData) && resultsData.length > 0) {
        setResults(resultsData);
        localStorage.setItem('rozgar_cache_results', JSON.stringify(resultsData));
      } else {
        const cached = localStorage.getItem('rozgar_cache_results');
        if (cached) setResults(JSON.parse(cached));
      }

      if (Array.isArray(admitData) && admitData.length > 0) {
        setAdmitCards(admitData);
        localStorage.setItem('rozgar_cache_admit', JSON.stringify(admitData));
      } else {
        const cached = localStorage.getItem('rozgar_cache_admit');
        if (cached) setAdmitCards(JSON.parse(cached));
      }

      if (Array.isArray(answerData) && answerData.length > 0) {
        setAnswerKeys(answerData);
        localStorage.setItem('rozgar_cache_answer', JSON.stringify(answerData));
      } else {
        const cached = localStorage.getItem('rozgar_cache_answer');
        if (cached) setAnswerKeys(JSON.parse(cached));
      }

      if (Array.isArray(logsData)) setAgentLogs(logsData);
      if (Array.isArray(sourcesData)) setSources(sourcesData);

      if (adsRes && Array.isArray(adsRes.ads)) {
        setAds(adsRes.ads);
        setAdsEnabled(!!adsRes.enabled);
      }

      const draftsData = Array.isArray(draftsRes) ? draftsRes : draftsRes?.data;
      if (Array.isArray(draftsData)) setDrafts(draftsData);
    } catch (err) {
      console.error('Failed fetching data from Express backend; attempting offline fallback:', err);
      // Offline fallback from LocalStorage
      const cachedJobs = localStorage.getItem('rozgar_cache_jobs');
      if (cachedJobs) setJobs(JSON.parse(cachedJobs));
      const cachedResults = localStorage.getItem('rozgar_cache_results');
      if (cachedResults) setResults(JSON.parse(cachedResults));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Navigation handlers
  const handleNavigatePublicTab = (tab: string, query?: string) => {
    setPublicTab(tab);
    setSelectedJob(null);
    if (query !== undefined) {
      setSearchQuery(query);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectJob = (job: GovtJob) => {
    setSelectedJob(job);
    setPublicTab('job-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch to admin view via hidden command (e.g. key combo or URL hash)
  const toggleAdminView = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      window.location.hash = '';
    } else {
      setIsAdminMode(true);
      window.location.hash = 'admin';
    }
  };

  // RENDER ADMIN MODE
  if (isAdminMode) {
    if (!adminToken) {
      return (
        <AdminLogin
          onLoginSuccess={(token) => setAdminToken(token)}
          onExit={() => {
            setIsAdminMode(false);
            window.location.hash = '';
          }}
        />
      );
    }

    const pendingDrafts = jobs.filter((j) => j.isDraft && j.verificationReport?.verificationStatus === 'PASSED');

    return (
      <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
        {/* Admin Sidebar Navigation */}
        <AdminSidebar
          currentTab={adminTab}
          setCurrentTab={(t) => {
            setAdminTab(t);
            window.scrollTo({ top: 0 });
          }}
          pendingDraftCount={pendingDrafts.length}
          onLogout={() => setAdminToken(null)}
        />

        {/* Main Admin Content Area */}
        <main className="flex-1 overflow-y-auto">
          {adminTab === 'dashboard' && (
            <AdminDashboard
              jobs={jobs}
              agentLogs={agentLogs}
              onNavigate={(t) => setAdminTab(t)}
              onSelectDraft={(d) => setInspectDraft(d)}
            />
          )}

          {adminTab === 'system-health' && <AdminSystemHealth />}

          {(adminTab === 'content-jobs' || adminTab === 'content-results' || adminTab === 'verification-queue') && (
            <AdminContentManager
              jobs={jobs}
              token={adminToken}
              onRefresh={fetchAllData}
              onSelectDraft={(d) => setInspectDraft(d)}
            />
          )}

          {adminTab === 'pipeline-runner' && (
            <AdminPipelineRunner token={adminToken} onRefreshJobs={fetchAllData} />
          )}

          {adminTab === 'agent-monitor' && <AdminAuditLogs logs={agentLogs} />}

          {adminTab === 'final-qa' && (
            <AdminFinalQAPanel
              drafts={drafts}
              onApproveDraft={(draftId) => {
                // POST approval reuses existing approve-draft endpoint
                fetch(`/api/admin/drafts/${draftId}/approve`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                }).then(() => fetchAllData());
              }}
            />
          )}

          {adminTab === 'sources' && (
            <AdminSourcesManager sources={sources} token={adminToken} onRefresh={fetchAllData} />
          )}

          {adminTab === 'scraper' && (
            <AdminScraperDashboard />
          )}

          {adminTab === 'monetization' || adminTab === 'settings' ? (
            <AdminSettings adsEnabled={adsEnabled} setAdsEnabled={setAdsEnabled} token={adminToken} />
          ) : null}
        </main>

        {/* Draft Inspection Modal */}
        {inspectDraft && (
          <AdminDraftReviewModal
            draft={inspectDraft}
            token={adminToken}
            onClose={() => setInspectDraft(null)}
            onRefresh={fetchAllData}
          />
        )}
      </div>
    );
  }

  // RENDER PUBLIC WEBSITE
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Offline Status & Sync Control Banner */}
      <OfflineStatusBanner offlineState={offlineState} />

      {/* Public Navbar */}
      <Navbar
        currentTab={publicTab}
        setCurrentTab={(t) => handleNavigatePublicTab(t)}
        onSearchClick={() => handleNavigatePublicTab('jobs')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {publicTab === 'home' && (
          <HomeView
            jobs={jobs}
            results={results}
            admitCards={admitCards}
            answerKeys={answerKeys}
            adsEnabled={adsEnabled}
            ads={ads}
            onSelectJob={handleSelectJob}
            onNavigateTab={handleNavigatePublicTab}
          />
        )}

        {publicTab === 'jobs' && (
          <JobsListView
            jobs={jobs}
            onSelectJob={handleSelectJob}
            initialQuery={searchQuery}
          />
        )}

        {publicTab === 'job-detail' && selectedJob && (
          <JobDetailView job={selectedJob} onBack={() => handleNavigatePublicTab('jobs')} />
        )}

        {publicTab === 'results' && <ResultsView results={results} />}

        {publicTab === 'admit-cards' && <AdmitCardsView admitCards={admitCards} />}

        {publicTab === 'answer-keys' && <AnswerKeysView answerKeys={answerKeys} />}

        {(publicTab === 'about' ||
          publicTab === 'privacy' ||
          publicTab === 'terms' ||
          publicTab === 'disclaimer' ||
          publicTab === 'source-policy') && (
          <StaticPages
            pageType={publicTab as any}
            onBack={() => handleNavigatePublicTab('home')}
          />
        )}
      </main>

      {/* Public Footer */}
      <Footer onNavClick={(t) => handleNavigatePublicTab(t)} />

      {/* Secret Floating Admin Switcher Button for Testing/Demo Access */}
      <div className="fixed bottom-4 right-4 z-40 opacity-30 hover:opacity-100 transition-opacity">
        <button
          onClick={toggleAdminView}
          className="bg-slate-900 text-amber-400 font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-lg flex items-center gap-1"
          title="Open Admin Portal"
        >
          🔐 Admin Panel
        </button>
      </div>
    </div>
  );
}
