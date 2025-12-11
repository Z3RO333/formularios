import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Returns a Supabase client bound to the incoming user token so RLS applies.
export function getRlsClient(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }
  });
  return { supabase, token };
}

// Service-role client for privileged server-side operations (never exposed to the browser).
export function getServiceRoleClient() {
  if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Fetches authenticated Supabase user + profile row from usuarios table.
export async function getAuthContext(req: NextRequest) {
  const { supabase, token } = getRlsClient(req);
  if (!token) return null;
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth?.user) return null;
  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', auth.user.id)
    .single();
  if (perfilError || !perfil) return null;
  return { supabase, token, authUser: auth.user, profile: perfil };
}
