import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity via the online/offline events. Not perfect —
 * `navigator.onLine` only means "attached to a network," not "the API is
 * reachable" — but it catches the common case (airplane mode, no signal,
 * wifi dropped) that matters most for a mobile PA app, without the cost of
 * actively polling a health endpoint.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
