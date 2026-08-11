import React, { useEffect, useState } from 'react';
import {
  Globe,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Download,
  Zap,
} from 'lucide-react';

interface ScraperStats {
  isRunning: boolean;
  lastRun?: string;
  lastSuccess?: string;
  lastError?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalJobsScraped: number;
  totalJobsProcessed: number;
  nextRun?: string;
}

interface ScraperInfo {
  enabled: boolean;
  interval: string;
  isRunning: boolean;
  isProcessing: boolean;
  stats: ScraperStats;
}

export const AdminScraperDashboard: React.FC = () => {
  const [scraperInfo, setScraperInfo] = useState<ScraperInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch scraper status
  const fetchScraperStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/scraper/status', {
        headers: { 'Authorization': `Bearer jwt-rozgarvaani-admin-authenticated-session-2026` },
      });
      const data = await response.json();
      if (data.success) {
        setScraperInfo(data.data);
      } else {
        setError(data.message || 'Failed to fetch scraper status');
      }
    } catch (err) {
      setError(`Error fetching scraper status: ${err}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScraperStatus();
    const interval = setInterval(fetchScraperStatus, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Manual trigger scraper
  const handleManualRun = async () => {
    setRunning(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/admin/scraper/run', {
        method: 'POST',
        headers: { 'Authorization': `Bearer jwt-rozgarvaani-admin-authenticated-session-2026` },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`✓ API fetch complete! Found ${data.data.jobsFound} jobs, published ${data.data.jobsProcessed} articles via AI pipeline.`);
        setTimeout(() => fetchScraperStatus(), 1000);
      } else {
        setError(data.message || 'Failed to run scraper');
      }
    } catch (err) {
      setError(`Error running scraper: ${err}`);
    } finally {
      setRunning(false);
    }
  };

  // Start scheduler
  const handleStart = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/admin/scraper/start', {
        method: 'POST',
        headers: { 'Authorization': `Bearer jwt-rozgarvaani-admin-authenticated-session-2026` },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('✓ Scraper scheduler started');
        setTimeout(() => fetchScraperStatus(), 500);
      } else {
        setError(data.message || 'Failed to start scheduler');
      }
    } catch (err) {
      setError(`Error starting scheduler: ${err}`);
    }
  };

  // Stop scheduler
  const handleStop = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/admin/scraper/stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer jwt-rozgarvaani-admin-authenticated-session-2026` },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('✓ Scraper scheduler stopped');
        setTimeout(() => fetchScraperStatus(), 500);
      } else {
        setError(data.message || 'Failed to stop scheduler');
      }
    } catch (err) {
      setError(`Error stopping scheduler: ${err}`);
    }
  };

  // Reset stats
  const handleResetStats = async () => {
    if (!window.confirm('Are you sure you want to reset all scraper statistics? This cannot be undone.')) return;
    
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/admin/scraper/reset-stats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer jwt-rozgarvaani-admin-authenticated-session-2026` },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('✓ Scraper statistics reset');
        setTimeout(() => fetchScraperStatus(), 500);
      } else {
        setError(data.message || 'Failed to reset statistics');
      }
    } catch (err) {
      setError(`Error resetting statistics: ${err}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-spin" />
          <p className="text-slate-400">Loading scraper status...</p>
        </div>
      </div>
    );
  }

  const stats = scraperInfo?.stats;
  const successRate = stats && stats.totalRuns > 0 
    ? Math.round((stats.successfulRuns / stats.totalRuns) * 100)
    : 0;

  const lastRunFormatted = stats?.lastRun 
    ? new Date(stats.lastRun).toLocaleString()
    : 'Never';
  
  const lastSuccessFormatted = stats?.lastSuccess
    ? new Date(stats.lastSuccess).toLocaleString()
    : 'Never';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">RapidAPI Scraper Dashboard</h1>
            <p className="text-sm text-slate-400">API: RapidAPI → 5-Stage AI Pipeline → Direct Publication (Every 15 minutes)</p>
          </div>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchScraperStatus();
          }}
          disabled={refreshing}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-300 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Scheduler Status</h3>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${scraperInfo?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-lg font-bold ${scraperInfo?.isRunning ? 'text-green-400' : 'text-slate-400'}`}>
              {scraperInfo?.isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {scraperInfo?.isProcessing ? 'Currently processing...' : 'Idle, awaiting next run'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={scraperInfo?.isRunning || running}
              className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>
            <button
              onClick={handleStop}
              disabled={!scraperInfo?.isRunning}
              className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="w-3.5 h-3.5" />
              Stop
            </button>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Success Rate</h3>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </div>
          <div className="mb-4">
            <div className="text-3xl font-bold text-amber-400">{successRate}%</div>
            <p className="text-xs text-slate-500 mt-1">{stats?.successfulRuns || 0} / {stats?.totalRuns || 0} runs</p>
          </div>
          {stats?.failedRuns && stats.failedRuns > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              <p className="text-xs text-red-300 font-semibold">{stats.failedRuns} failed run(s)</p>
            </div>
          )}
        </div>

        {/* Data Processed Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Articles Published</h3>
            <Download className="w-5 h-5 text-slate-500" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-400">Total Jobs Found</p>
              <p className="text-2xl font-bold text-blue-400">{stats?.totalJobsScraped || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Articles Published</p>
              <p className="text-2xl font-bold text-green-400">{stats?.totalJobsPublished || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline & Last Runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last Run Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Last Run Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Last Run Attempt</p>
              <p className="text-sm text-slate-300 font-mono">{lastRunFormatted}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Last Successful Run</p>
              <p className="text-sm text-slate-300 font-mono">{lastSuccessFormatted}</p>
            </div>
            {stats?.lastError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Last Error</p>
                <p className="text-xs text-red-300 font-mono break-words">{stats.lastError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-500" />
            Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Run Interval</p>
              <p className="text-sm text-slate-300 font-mono">{scraperInfo?.interval || '*/15 * * * *'}</p>
              <p className="text-xs text-slate-500 mt-1">Every 15 minutes</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Source</p>
              <p className="text-sm text-slate-300 font-mono">https://www.sarkariresult.com/</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              <p className={`text-sm font-semibold ${scraperInfo?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                {scraperInfo?.enabled ? 'ENABLED' : 'DISABLED'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleManualRun}
          disabled={running || !scraperInfo?.enabled}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Zap className="w-5 h-5" />
          {running ? 'Running Scraper...' : 'Run Scraper Now'}
        </button>

        <button
          onClick={handleResetStats}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Reset Statistics
        </button>
      </div>

      {/* Statistics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-6 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Scraper Statistics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Runs</p>
              <p className="text-2xl font-bold text-slate-200">{stats?.totalRuns || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Successful</p>
              <p className="text-2xl font-bold text-green-400">{stats?.successfulRuns || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-400">{stats?.failedRuns || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Articles Published</p>
              <p className="text-2xl font-bold text-blue-400">{stats?.totalJobsPublished || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>ℹ️ About RapidAPI Scraper:</strong> Fetches jobs from RapidAPI Sarkari Result API every 15 minutes (1000 requests/month limit).
          Jobs are sent through a simplified 5-stage AI pipeline (DISCOVERY → EXTRACTION → CONTENT → SEO → FINAL_QA) with automatic fallbacks.
          Each job is published directly as a live article - no manual admin review needed. All articles appear instantly to candidates.
        </p>
      </div>
    </div>
  );
};
