import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { GlobalData } from '../types';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function pullData(): Promise<{ data: GlobalData | null; updated_at: string; found: boolean }> {
  const res = await fetch('/api/v1/sync/pull');
  if (!res.ok) throw new Error(`Sync pull failed: ${res.status}`);
  return res.json();
}

async function pushData(data: GlobalData): Promise<{ updated_at: string }> {
  const res = await fetch('/api/v1/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupabase(
  globalData: GlobalData,
  setGlobalData: Dispatch<SetStateAction<GlobalData>>
) {
  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount — pull from backend, merge if remote is newer
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    pullData()
      .then(({ data, updated_at, found }) => {
        if (!found || !data) return;

        const localTs = localStorage.getItem('goalflow_synced_at');
        const remoteTime = new Date(updated_at).getTime();
        const localTime = localTs ? new Date(localTs).getTime() : 0;

        if (remoteTime > localTime) {
          setGlobalData(data);
          localStorage.setItem('goalflow_synced_at', updated_at);
        }
        setIsSynced(true);
      })
      .catch(err => {
        // Backend not running yet — silent, app works offline
        console.warn('GoalFlow sync pull skipped:', err.message);
      });
  }, [setGlobalData]);

  // Debounced push whenever globalData changes
  useEffect(() => {
    if (!isInitialized.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(() => {
      pushData(globalData)
        .then(({ updated_at }) => {
          localStorage.setItem('goalflow_synced_at', updated_at);
          setIsSynced(true);
          setSyncError(null);
        })
        .catch(err => {
          // Silent — don't disrupt UX if backend is down
          setSyncError(err.message);
        });
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [globalData]);

  return { isSynced, syncError, isEnabled: true };
}
