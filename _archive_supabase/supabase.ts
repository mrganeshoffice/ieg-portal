import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const REMEMBER_KEY = 'ieg.admin.remember';

/**
 * Session storage that honours the admin's "remember me" choice:
 * remembered sessions live in localStorage, otherwise in sessionStorage (cleared when the tab closes).
 */
const adminStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => {
    try {
      const persist = localStorage.getItem(REMEMBER_KEY) !== '0';
      (persist ? localStorage : sessionStorage).setItem(k, v);
      (persist ? sessionStorage : localStorage).removeItem(k);
    } catch { /* storage unavailable */ }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

let client: SupabaseClient | null = null;

/** Only the public anon key is used here; all write access is enforced by Row Level Security in the database. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ieg.admin.auth', storage: adminStorage },
    });
  }
  return client;
}
