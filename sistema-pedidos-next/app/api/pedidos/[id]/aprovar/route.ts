import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { atualizarStatusComHistorico, sendFornecedorApprovalEmail } from '@/lib/pedidosService';
import { validateAndParse, aprovarPedidoSchema } from '@/lib/validations';
import { createRateLimiter } from '@/lib/rateLimit';
import { z } from 'zod';

// Rate limit: 10 requisições por minuto para aprovações
const rateLimiter = createRateLimiter('moderate', 'Você está aprovando pedidos muito rapidamente.');

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

    // Validar body (justificativa é opcional na aprovação)
    const body = await req.json().catch(() => ({}));
    const validatedData = validateAndParse(aprovarPedidoSchema, body);

    await atualizarStatusComHistorico(ctx.supabase, {
      pedidoId,
      status: 'APROVADO',
      usuarioId: ctx.profile.id,
      justificativa: validatedData.justificativa_aprovacao
    });

    await sendFornecedorApprovalEmail(pedidoId);

    return NextResponse.json({ status: 'APROVADO' });
  } catch (error: any) {
    console.error('Erro ao aprovar pedido:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aprovar' },
      { status: 400 }
    );
  }
}
