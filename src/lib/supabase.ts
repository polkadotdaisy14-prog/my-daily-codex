/* Supabase client bootstrap.
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent the app runs in
 * "local beta mode": no login, profile + logs persist in localStorage.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase credentials are present. */
export function isConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

/** The shared Supabase client. Throws when the app runs in local beta mode. */
export function getSupabase(): SupabaseClient {
  if (!isConfigured() || !url || !anonKey) {
    throw new Error('Supabase is not configured — running in local beta mode');
  }
  if (!client) client = createClient(url, anonKey);
  return client;
}
