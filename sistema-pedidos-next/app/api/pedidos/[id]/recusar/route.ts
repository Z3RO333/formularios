import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { atualizarStatusComHistorico } from '@/lib/pedidosService';
import { validateAndParse, recusarPedidoSchema } from '@/lib/validations';
import { createRateLimiter } from '@/lib/rateLimit';
import { z } from 'zod';

// Rate limit: 10 requisições por minuto para recusas
const rateLimiter = createRateLimiter('moderate', 'Você está recusando pedidos muito rapidamente.');

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Rate limiting
  const rateLimitResponse = rateLimiter(req);
  if (rateLimitResponse) return rateLimitResponse;

  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  if (!['GESTOR', 'FINANCEIRO'].includes(ctx.profile.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    // Validar UUID do pedido
    const pedidoId = z.string().uuid('ID do pedido inválido').parse(params.id);

    // Validar body (justificativa é obrigatória na recusa)
    const body = await req.json();
    const validatedData = validateAndParse(recusarPedidoSchema, body);

    await atualizarStatusComHistorico(ctx.supabase, {
      pedidoId,
      status: 'RECUSADO',
      usuarioId: ctx.profile.id,
      justificativa: validatedData.justificativa_recusa
    });

    return NextResponse.json({ status: 'RECUSADO' });
  } catch (error: any) {
    console.error('Erro ao recusar pedido:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao recusar' },
      { status: 400 }
    );
  }
}
