import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://upzgqdnrtikceqjqxvas.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w7Qhvc5xAxsYjxwSgvraiw_HMaVQaHJ';

// Web-only: use the browser's native localStorage so sessions are correctly
// persisted and restored across page refreshes. AsyncStorage (the React Native
// equivalent) does NOT work in a browser environment and was causing the
// auth-drop + infinite loading-spinner bug.
const localStorageAdapter = {
  getItem: (key) => {
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota errors
    }
    return Promise.resolve();
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    return Promise.resolve();
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
