import { useState, useEffect, useCallback } from 'react';
import { precacheAllJobData, getOfflineStats, OfflineCacheStats } from '../utils/serviceWorkerRegistration';

export interface UseOfflineStatusResult {
  isOnline: boolean;
  isOffline: boolean;
  isWeakConnection: boolean;
  stats: OfflineCacheStats;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  triggerOfflineSync: () => Promise<void>;
  dismissOfflineBanner: boolean;
  setDismissOfflineBanner: (dismiss: boolean) => void;
}

export function useOfflineStatus(): UseOfflineStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isWeakConnection, setIsWeakConnection] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dismissOfflineBanner, setDismissOfflineBanner] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('rozgar_last_offline_sync') : null
  );

  const [stats, setStats] = useState<OfflineCacheStats>({
    isSupported: true,
    isRegistered: false,
    cachedApiCount: 0,
    lastUpdated: lastSyncedAt,
  });

  const refreshStats = useCallback(async () => {
    const newStats = await getOfflineStats();
    setStats(newStats);
  }, []);

  const triggerOfflineSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await precacheAllJobData();
      const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const nowIso = new Date().toISOString();
      localStorage.setItem('rozgar_last_offline_sync', nowIso);
      setLastSyncedAt(nowIso);
      await refreshStats();
    } catch (e) {
      console.error('Offline sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissOfflineBanner(false);
      // Auto-refresh stats when coming back online
      refreshStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissOfflineBanner(false);
      refreshStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API check if available (e.g., 2g, slow-2g, 3g)
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const checkConn = () => {
          if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData) {
            setIsWeakConnection(true);
          } else {
            setIsWeakConnection(false);
          }
        };
        checkConn();
        conn.addEventListener('change', checkConn);
      }
    }

    refreshStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStats]);

  return {
    isOnline,
    isOffline: !isOnline,
    isWeakConnection,
    stats,
    isSyncing,
    lastSyncedAt,
    triggerOfflineSync,
    dismissOfflineBanner,
    setDismissOfflineBanner,
  };
}
