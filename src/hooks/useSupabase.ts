import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GlobalData } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const USER_ID = 'samuel';

function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Singleton client — created once
const supabase = getClient();

export function useSupabase(
  globalData: GlobalData,
  setGlobalData: Dispatch<SetStateAction<GlobalData>>
) {
  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: pull from Supabase, merge with localStorage (newest wins)
  useEffect(() => {
    if (!supabase || isInitialized.current) return;
    isInitialized.current = true;

    supabase
      .from('goalflow_data')
      .select('data, updated_at')
      .eq('user_id', USER_ID)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setSyncError(error.message);
          return;
        }
        if (!data) return; // No remote data yet, localStorage is source of truth

        const localTs = localStorage.getItem('goalflow_synced_at');
        const remoteTs = new Date(data.updated_at).getTime();
        const localTime = localTs ? new Date(localTs).getTime() : 0;

        if (remoteTs > localTime) {
          setGlobalData(data.data as GlobalData);
          localStorage.setItem('goalflow_synced_at', data.updated_at);
        }
        setIsSynced(true);
      });
  }, [setGlobalData]);

  // Debounced push to Supabase whenever globalData changes (after init)
  useEffect(() => {
    if (!supabase || !isInitialized.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(async () => {
      const now = new Date().toISOString();
      const { error } = await supabase!
        .from('goalflow_data')
        .upsert(
          { user_id: USER_ID, data: globalData, updated_at: now },
          { onConflict: 'user_id' }
        );

      if (error) {
        setSyncError(error.message);
      } else {
        localStorage.setItem('goalflow_synced_at', now);
        setIsSynced(true);
        setSyncError(null);
      }
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [globalData]);

  return { isSynced, syncError, isEnabled: !!supabase };
}
