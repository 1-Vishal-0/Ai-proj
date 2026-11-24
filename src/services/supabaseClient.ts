import { createClient } from '@supabase/supabase-js';
import { authSessionStorage } from './authSessionStorage';
import { isBrowserKey } from './supabaseBrowserKey';

export const demoMode = import.meta.env.VITE_PORTAL_MODE === 'demo';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = !demoMode && url && !url.includes('your-project') && isBrowserKey(key)
  ? createClient(url, key, {
    auth: { flowType: 'pkce', detectSessionInUrl: false, storage: authSessionStorage },
  })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is unavailable. Contact your portal administrator.');
  return supabase;
}
