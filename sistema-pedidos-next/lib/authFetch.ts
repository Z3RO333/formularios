import { getSupabaseBrowserClient } from './supabaseClient';

// Wrapper to call API routes including the Supabase access token so RLS applies.
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
