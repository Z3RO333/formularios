import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { pedidosToCSV, pedidosToExcel, generateFilename, PedidoExportData } from '@/lib/exportService';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv'; // csv ou xlsx
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    // Buscar pedidos com filtros
    let query = ctx.supabase
      .from('pedidos')
      .select(`
        id,
        data_criacao,
        area_setor,
        loja_unidade,
        tipo_pedido,
        descricao_detalhada,
        prioridade,
        status,
        competencia_ano_mes,
        usuarios:solicitante_id(nome),
        fornecedores:fornecedor_id(nome_canonico)
      `)
      .order('data_criacao', { ascending: false });

    if (status) query = query.eq('status', status);
    if (dataInicio) query = query.gte('data_criacao', dataInicio);
    if (dataFim) query = query.lte('data_criacao', dataFim);

    const { data: pedidos, error } = await query;
    if (error) throw error;

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido encontrado para exportar' },
        { status: 404 }
      );
    }

    // Formatar dados para exportação
    const exportData: PedidoExportData[] = pedidos.map((p: any) => ({
      id: p.id,
      data_criacao: p.data_criacao,
      area_setor: p.area_setor,
      loja_unidade: p.loja_unidade,
      tipo_pedido: p.tipo_pedido,
      descricao_detalhada: p.descricao_detalhada,
      prioridade: p.prioridade,
      status: p.status,
      solicitante_nome: p.usuarios?.nome,
      fornecedor_nome: p.fornecedores?.nome_canonico,
      competencia_ano_mes: p.competencia_ano_mes
    }));

    // Gerar arquivo baseado no formato
    if (format === 'xlsx') {
      const buffer = await pedidosToExcel(exportData);
      const filename = generateFilename('pedidos', 'xlsx');

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else {
      // CSV
      const csv = pedidosToCSV(exportData);
      const filename = generateFilename('pedidos', 'csv');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
  } catch (error: any) {
    console.error('Erro ao exportar pedidos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao exportar pedidos' },
      { status: 500 }
    );
  }
}
