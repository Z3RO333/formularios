import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { createPedido, listarPedidos, registrarHistorico } from '@/lib/pedidosService';
import { validateAndParse, pedidoCreateSchema, filtrosPedidosSchema } from '@/lib/validations';
import { createRateLimiter } from '@/lib/rateLimit';

// Rate limit: 5 requisições por minuto para criação de pedidos
const rateLimiter = createRateLimiter('strict', 'Você está criando pedidos muito rapidamente. Aguarde um momento.');

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimiter(req);
  if (rateLimitResponse) return rateLimitResponse;

  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = await req.json();

    // Validação robusta com Zod
    const validatedData = validateAndParse(pedidoCreateSchema, body);

    const id = await createPedido(ctx.supabase, ctx.profile, validatedData);
    await registrarHistorico(
      ctx.supabase,
      id,
      null,
      'PENDENTE_APROVACAO',
      ctx.profile.id,
      'Criado via formulário público'
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar pedido' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);

    // Converter query params para objeto de filtros
    const filtrosRaw = {
      status: searchParams.get('status') || undefined,
      dataInicio: searchParams.get('dataInicio') || undefined,
      dataFim: searchParams.get('dataFim') || undefined,
      loja: searchParams.get('loja') || undefined,
      area: searchParams.get('area') || undefined,
      fornecedorId: searchParams.get('fornecedorId') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    };

    // Validação dos filtros
    const filtros = validateAndParse(filtrosPedidosSchema, filtrosRaw);

    const pedidos = await listarPedidos(ctx.supabase, filtros);
    return NextResponse.json(pedidos);
  } catch (error: any) {
    console.error('Erro ao listar pedidos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar pedidos' },
      { status: 400 }
    );
  }
}
