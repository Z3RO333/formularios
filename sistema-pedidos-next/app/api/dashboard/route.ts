import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { supabase } = ctx;

    // Total de pedidos
    const { count: totalPedidos } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true });

    // Pedidos por status
    const { data: pedidosPorStatus } = await supabase
      .from('pedidos')
      .select('status')
      .then(async (res) => {
        if (res.error) throw res.error;
        const stats = {
          PENDENTE_APROVACAO: 0,
          APROVADO: 0,
          RECUSADO: 0
        };
        res.data?.forEach((p: any) => {
          if (stats.hasOwnProperty(p.status)) {
            stats[p.status as keyof typeof stats]++;
          }
        });
        return { data: stats };
      });

    // Pedidos por prioridade
    const { data: pedidosPorPrioridade } = await supabase
      .from('pedidos')
      .select('prioridade')
      .then(async (res) => {
        if (res.error) throw res.error;
        const stats = {
          BAIXA: 0,
          MEDIA: 0,
          ALTA: 0,
          URGENTE: 0
        };
        res.data?.forEach((p: any) => {
          if (stats.hasOwnProperty(p.prioridade)) {
            stats[p.prioridade as keyof typeof stats]++;
          }
        });
        return { data: stats };
      });

    // Pedidos criados nos últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const { count: pedidosRecentes } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .gte('data_criacao', seteDiasAtras.toISOString());

    // Pedidos criados nos últimos 30 dias
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const { count: pedidosMes } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .gte('data_criacao', trintaDiasAtras.toISOString());

    // Top 5 fornecedores mais frequentes
    const { data: topFornecedores } = await supabase
      .from('pedidos')
      .select('fornecedor_id, fornecedores:fornecedor_id(nome_canonico)')
      .not('fornecedor_id', 'is', null)
      .then(async (res) => {
        if (res.error) throw res.error;
        const counts: Record<string, { id: string; nome: string; count: number }> = {};
        res.data?.forEach((p: any) => {
          const id = p.fornecedor_id;
          const nome = p.fornecedores?.nome_canonico || 'Desconhecido';
          if (!counts[id]) {
            counts[id] = { id, nome, count: 0 };
          }
          counts[id].count++;
        });
        return {
          data: Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        };
      });

    // Taxa de aprovação
    const totalComStatus = (pedidosPorStatus?.APROVADO || 0) + (pedidosPorStatus?.RECUSADO || 0);
    const taxaAprovacao = totalComStatus > 0
      ? Math.round(((pedidosPorStatus?.APROVADO || 0) / totalComStatus) * 100)
      : 0;

    return NextResponse.json({
      resumo: {
        total: totalPedidos || 0,
        pedidosRecentes: pedidosRecentes || 0,
        pedidosMes: pedidosMes || 0,
        taxaAprovacao
      },
      porStatus: pedidosPorStatus,
      porPrioridade: pedidosPorPrioridade,
      topFornecedores: topFornecedores || []
    });
  } catch (error: any) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar métricas' },
      { status: 500 }
    );
  }
}
