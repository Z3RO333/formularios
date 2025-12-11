import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { atualizarStatusComHistorico, sendFornecedorApprovalEmail } from '@/lib/pedidosService';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!['GESTOR', 'FINANCEIRO'].includes(ctx.profile.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    await atualizarStatusComHistorico(ctx.supabase, { pedidoId: params.id, status: 'APROVADO', usuarioId: ctx.profile.id });
    await sendFornecedorApprovalEmail(params.id);
    return NextResponse.json({ status: 'APROVADO' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao aprovar' }, { status: 400 });
  }
}
