import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserProfileFromRequest, requireRole } from '@/lib/auth';
import { normalizeName, similarity } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const profile = await getUserProfileFromRequest(req);
  if (!profile || !requireRole(profile, ['GESTOR', 'FINANCEIRO'])) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const { data: fornecedores } = await supabaseAdmin.from('fornecedores').select('*').is('mesclado_em', null);
  const suspeitos: any[] = [];
  for (let i = 0; i < (fornecedores?.length || 0); i++) {
    for (let j = i + 1; j < (fornecedores?.length || 0); j++) {
      const a = fornecedores![i];
      const b = fornecedores![j];
      const score = similarity(normalizeName(a.nome_canonico), normalizeName(b.nome_canonico));
      if (score >= 0.8) suspeitos.push({ a, b, score });
    }
  }
  return NextResponse.json(suspeitos);
}
