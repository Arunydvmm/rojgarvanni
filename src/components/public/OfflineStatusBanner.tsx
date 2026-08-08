import React, { useState } from 'react';
import { WifiOff, Wifi, DownloadCloud, RefreshCw, CheckCircle, Database, SignalLow, X, Smartphone } from 'lucide-react';
import { UseOfflineStatusResult } from '../../hooks/useOfflineStatus';

interface OfflineStatusBannerProps {
  offlineState: UseOfflineStatusResult;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ offlineState }) => {
  const {
    isOnline,
    isOffline,
    isWeakConnection,
    stats,
    isSyncing,
    lastSyncedAt,
    triggerOfflineSync,
    dismissOfflineBanner,
    setDismissOfflineBanner,
  } = offlineState;

  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSync = async () => {
    await triggerOfflineSync();
    setToastMessage('✅ All active government notifications saved for offline use!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <>
      {/* Toast Banner when sync completes */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-emerald-100 border border-emerald-500/50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Offline Alert Banner when Network Disconnects */}
      {isOffline && !dismissOfflineBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-600 transition-all">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <span className="p-1 bg-slate-950/10 rounded-lg">
                <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
              </span>
              <div>
                <span className="font-bold">Offline Mode Active:</span> You are currently offline. RozgarVaani is serving cached Sarkari job notifications & results.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetailsModal(true)}
                className="px-2.5 py-1 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-lg text-[11px] font-bold shadow-xs transition-colors"
              >
                View Offline Vault ({stats.cachedApiCount} endpoints cached)
              </button>
              <button
                onClick={() => setDismissOfflineBanner(true)}
                className="p-1 hover:bg-slate-950/10 rounded-lg text-slate-950"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weak Connection (2G/3G) Alert Banner */}
      {isOnline && isWeakConnection && !dismissOfflineBanner && (
        <div className="bg-sky-900 text-sky-100 px-4 py-2 text-xs border-b border-sky-800 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <SignalLow className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">Slow 2G/3G Network Detected:</strong> Stale-While-Revalidate caching is speeding up job rendering.
            </span>
            <button
              onClick={() => handleSync()}
              disabled={isSyncing}
              className="ml-auto px-2.5 py-1 bg-sky-800 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              Pre-fetch All
            </button>
          </div>
        </div>
      )}

      {/* Offline Status floating indicator badge at bottom-left */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowDetailsModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-lg transition-all ${
            isOffline
              ? 'bg-amber-950 text-amber-300 border-amber-600/60 ring-2 ring-amber-500/30'
              : 'bg-slate-900/90 hover:bg-slate-900 text-slate-200 border-slate-700/80 backdrop-blur-md'
          }`}
          title="Offline & Cache Controls"
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">PWA Offline Sync</span>
            </>
          )}
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-amber-400 border border-slate-700">
            {stats.cachedApiCount} Saved
          </span>
        </button>
      </div>

      {/* Offline Management & Cache Vault Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-white">RozgarVaani Offline Vault</h3>
                <p className="text-xs text-slate-400">
                  Service Worker caching for reliable access across rural & tier-2/3 Indian networks.
                </p>
              </div>
            </div>

            {/* Network Status Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium">Connectivity Status</div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isOnline ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-emerald-400">Online</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span className="text-amber-400">Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium">Cached Endpoints</div>
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>{stats.cachedApiCount} Data Collections</span>
                </div>
              </div>
            </div>

            {/* Details Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="font-bold text-amber-400 text-xs uppercase tracking-wider">
                Cached Content Available Offline:
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                <li>Latest Central & State Govt Job Listings (/api/jobs)</li>
                <li>Exam Results & Merit Lists (/api/results)</li>
                <li>Admit Cards & Hall Tickets (/api/admit-cards)</li>
                <li>Answer Keys & Objections (/api/answer-keys)</li>
                <li>Search Index & Site Preferences (/api/site-settings)</li>
              </ul>
              {lastSyncedAt && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 mt-2">
                  Last full offline sync: {new Date(lastSyncedAt).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isSyncing || !isOnline
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Caching All Job Notifications...' : 'Sync & Save All Data Now'}
              </button>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
