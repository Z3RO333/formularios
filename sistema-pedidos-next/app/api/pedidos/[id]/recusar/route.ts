import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { atualizarStatusComHistorico } from '@/lib/pedidosService';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!['GESTOR', 'FINANCEIRO'].includes(ctx.profile.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await req.json();
  if (!body?.justificativa_recusa) return NextResponse.json({ error: 'Justificativa obrigatória' }, { status: 400 });

  try {
    await atualizarStatusComHistorico(ctx.supabase, {
      pedidoId: params.id,
      status: 'RECUSADO',
      usuarioId: ctx.profile.id,
      justificativa: body.justificativa_recusa
    });
    return NextResponse.json({ status: 'RECUSADO' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao recusar' }, { status: 400 });
  }
}
