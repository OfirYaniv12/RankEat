import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://upzgqdnrtikceqjqxvas.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w7Qhvc5xAxsYjxwSgvraiw_HMaVQaHJ';

// ─── Platform-safe storage adapters ──────────────────────────────────────────
// On web: use the browser's native localStorage for session persistence.
// On native (iOS/Android): return null adapter so Supabase uses its internal
// in-memory session handling (no window reference = no crash on mobile).
const localStorageAdapter = Platform.OS === 'web'
  ? {
      getItem: (key) => {
        try { return Promise.resolve(window.localStorage.getItem(key)); }
        catch { return Promise.resolve(null); }
      },
      setItem: (key, value) => {
        try { window.localStorage.setItem(key, value); } catch {}
        return Promise.resolve();
      },
      removeItem: (key) => {
        try { window.localStorage.removeItem(key); } catch {}
        return Promise.resolve();
      },
    }
  : undefined; // Let Supabase use its own default (in-memory) on native

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(localStorageAdapter ? { storage: localStorageAdapter } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
