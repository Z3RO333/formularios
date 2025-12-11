import { supabaseAdmin } from './supabaseAdmin';

export async function getUserProfileFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: perfil } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single();
  return perfil || null;
}

export function requireRole(profile: any, roles: string[]) {
  if (!profile) return false;
  return roles.includes(profile.perfil);
}
