import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { obterPedidoDetalhe, updatePedido, validatePedido } from '@/lib/pedidosService';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  try {
    const pedido = await obterPedidoDetalhe(ctx.supabase, params.id);
    return NextResponse.json(pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar pedido' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  try {
    const body = (await req.json()) as any;
    validatePedido(body);
    await updatePedido(ctx.supabase, ctx.profile, params.id, body);
    return NextResponse.json({ id: params.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar pedido' }, { status: 400 });
  }
}
