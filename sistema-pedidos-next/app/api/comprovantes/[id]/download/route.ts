import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { getSignedUrl } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from('arquivos_comprovantes')
    .select('*, pedidos(solicitante_id)')
    .eq('id', params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });

  if (!['GESTOR', 'FINANCEIRO'].includes(ctx.profile.perfil) && data.pedidos?.solicitante_id !== ctx.profile.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const signedUrl = await getSignedUrl(data.storage_key);
  return NextResponse.json({ url: signedUrl });
}
