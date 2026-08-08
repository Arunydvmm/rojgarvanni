/**
 * Service Worker Registration and Offline Data Management
 * Enables PWA capabilities and offline job browsing for RozgarVaani
 */

export interface OfflineCacheStats {
  isSupported: boolean;
  isRegistered: boolean;
  cachedApiCount: number;
  lastUpdated: string | null;
}

export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW Registration] Service Worker not supported in this browser environment.');
    return;
  }

  // Register SW on load
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW Registration] ServiceWorker registered with scope:', registration.scope);

        // Check for updates periodically
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[SW Registration] New content is available; please refresh.');
                if (onUpdate) onUpdate();
              } else {
                console.log('[SW Registration] Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.warn('[SW Registration] ServiceWorker registration failed:', error);
      });
  });
}

/**
 * Pre-caches all main public API endpoints into SW Cache and LocalStorage backup
 */
export async function precacheAllJobData(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    // If SW is not active yet, do client-side fetch and cache in Cache API directly
    try {
      const endpoints = ['/api/jobs', '/api/results', '/api/admit-cards', '/api/answer-keys', '/api/site-settings'];
      const cache = await caches.open('rozgar-api-v1');
      await Promise.all(
        endpoints.map(async (url) => {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res.clone());
          }
        })
      );
      return true;
    } catch (e) {
      console.warn('Fallback pre-caching failed:', e);
      return false;
    }
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data && event.data.success) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    navigator.serviceWorker.controller?.postMessage(
      { type: 'PRECACHE_ALL_JOBS' },
      [messageChannel.port2]
    );
  });
}

/**
 * Clears the API cache
 */
export async function clearOfflineApiCache(): Promise<boolean> {
  try {
    if ('caches' in window) {
      await caches.delete('rozgar-api-v1');
      return true;
    }
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
  return false;
}

/**
 * Returns statistics about offline cache status
 */
export async function getOfflineStats(): Promise<OfflineCacheStats> {
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  const isRegistered = Boolean(isSupported && navigator.serviceWorker.controller);

  let cachedApiCount = 0;
  if ('caches' in window) {
    try {
      const cache = await caches.open('rozgar-api-v1');
      const keys = await cache.keys();
      cachedApiCount = keys.length;
    } catch (e) {
      cachedApiCount = 0;
    }
  }

  return {
    isSupported,
    isRegistered,
    cachedApiCount,
    lastUpdated: localStorage.getItem('rozgar_last_offline_sync') || null,
  };
}
