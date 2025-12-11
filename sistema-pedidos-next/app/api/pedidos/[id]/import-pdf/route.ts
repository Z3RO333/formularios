import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const n8nUrl = process.env.N8N_IMPORT_PDF_URL;
  if (!n8nUrl) return NextResponse.json({ error: 'N8N_IMPORT_PDF_URL não configurada' }, { status: 500 });

  const form = await req.formData();
  const pedidoId = form.get('pedido_id') as string;
  const file = form.get('data');

  if (!pedidoId || pedidoId !== params.id) {
    return NextResponse.json({ error: 'pedido_id inválido' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo PDF é obrigatório (campo data)' }, { status: 400 });
  }

  // Garante que o usuário tem acesso ao pedido (RLS cuidará, mas evitamos chamada desnecessária ao n8n).
  const { error: pedidoError } = await ctx.supabase.from('pedidos').select('id').eq('id', pedidoId).single();
  if (pedidoError) return NextResponse.json({ error: 'Pedido não encontrado ou sem permissão' }, { status: 403 });

  const forward = new FormData();
  forward.append('pedido_id', pedidoId);
  forward.append('data', file);

  const resp = await fetch(n8nUrl, { method: 'POST', body: forward });
  if (!resp.ok) {
    let message = 'Falha ao processar PDF';
    try {
      const j = await resp.json();
      message = j.error || j.message || message;
    } catch (e) {
      message = `${message}: ${resp.statusText}`;
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const json = await resp.json();
  return NextResponse.json(json);
}
