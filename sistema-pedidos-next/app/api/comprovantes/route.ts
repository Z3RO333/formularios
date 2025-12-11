import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!['GESTOR', 'FINANCEIRO', 'SOLICITANTE'].includes(ctx.profile.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get('competencia');
  const fornecedorId = searchParams.get('fornecedorId');
  const loja = searchParams.get('loja');

  let query = ctx.supabase.from('arquivos_comprovantes').select('*, pedidos(loja_unidade, solicitante_id)');
  if (competencia) query = query.eq('competencia_ano_mes', competencia);
  if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId);
  if (loja) query = query.eq('pedidos.loja_unidade', loja);
  if (ctx.profile.perfil === 'SOLICITANTE') query = query.eq('pedidos.solicitante_id', ctx.profile.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
