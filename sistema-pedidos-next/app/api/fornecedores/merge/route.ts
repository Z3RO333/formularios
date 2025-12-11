import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserProfileFromRequest, requireRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const profile = await getUserProfileFromRequest(req);
  if (!profile || !requireRole(profile, ['GESTOR', 'FINANCEIRO'])) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const { primaryId, secondaryId } = await req.json();
  if (!primaryId || !secondaryId) return NextResponse.json({ error: 'Informe primaryId e secondaryId' }, { status: 400 });

  // Mescla apelidos e redireciona pedidos/comprovantes
  const { data: secondary } = await supabaseAdmin.from('fornecedores').select('apelidos_variantes').eq('id', secondaryId).single();
  await supabaseAdmin.from('fornecedores').update({
    apelidos_variantes: secondary?.apelidos_variantes,
    mesclado_em: primaryId
  }).eq('id', secondaryId);
  await supabaseAdmin.from('pedidos').update({ fornecedor_id: primaryId }).eq('fornecedor_id', secondaryId);
  await supabaseAdmin.from('arquivos_comprovantes').update({ fornecedor_id: primaryId }).eq('fornecedor_id', secondaryId);

  return NextResponse.json({ ok: true });
}
