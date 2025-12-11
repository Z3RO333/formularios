import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { createPedido, listarPedidos, registrarHistorico, validatePedido } from '@/lib/pedidosService';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = (await req.json()) as any;
    validatePedido(body);
    const id = await createPedido(ctx.supabase, ctx.profile, body);
    await registrarHistorico(ctx.supabase, id, null, 'PENDENTE_APROVACAO', ctx.profile.id, 'Criado via formulário público');
    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar pedido' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filtros = {
    status: searchParams.get('status') || undefined,
    dataInicio: searchParams.get('dataInicio') || undefined,
    dataFim: searchParams.get('dataFim') || undefined,
    loja: searchParams.get('loja') || undefined,
    area: searchParams.get('area') || undefined,
    fornecedorId: searchParams.get('fornecedorId') || undefined
  };
  try {
    const pedidos = await listarPedidos(ctx.supabase, filtros);
    return NextResponse.json(pedidos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao listar pedidos' }, { status: 400 });
  }
}
