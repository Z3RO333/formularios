import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  return NextResponse.json({ user: ctx.authUser, profile: ctx.profile });
}
