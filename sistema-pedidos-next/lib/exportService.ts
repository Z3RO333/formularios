import ExcelJS from 'exceljs';

export interface PedidoExportData {
  id: string;
  data_criacao: string;
  area_setor: string;
  loja_unidade: string;
  tipo_pedido: string;
  descricao_detalhada: string;
  prioridade: string;
  status: string;
  solicitante_nome?: string;
  fornecedor_nome?: string;
  competencia_ano_mes?: string;
}

/**
 * Converte lista de pedidos para formato CSV
 */
export function pedidosToCSV(pedidos: PedidoExportData[]): string {
  const headers = [
    'ID',
    'Data Criação',
    'Área/Setor',
    'Loja/Unidade',
    'Tipo',
    'Descrição',
    'Prioridade',
    'Status',
    'Solicitante',
    'Fornecedor',
    'Competência'
  ];

  const rows = pedidos.map(p => [
    p.id,
    new Date(p.data_criacao).toLocaleString('pt-BR'),
    p.area_setor,
    p.loja_unidade,
    p.tipo_pedido,
    p.descricao_detalhada,
    p.prioridade,
    p.status,
    p.solicitante_nome || '-',
    p.fornecedor_nome || '-',
    p.competencia_ano_mes || '-'
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell =>
        // Escape aspas e vírgulas
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    )
  ].join('\n');

  return csv;
}

/**
 * Gera arquivo Excel com formatação
 */
export async function pedidosToExcel(pedidos: PedidoExportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pedidos');

  // Definir colunas
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Data Criação', key: 'data_criacao', width: 20 },
    { header: 'Área/Setor', key: 'area_setor', width: 20 },
    { header: 'Loja/Unidade', key: 'loja_unidade', width: 20 },
    { header: 'Tipo', key: 'tipo_pedido', width: 15 },
    { header: 'Descrição', key: 'descricao_detalhada', width: 40 },
    { header: 'Prioridade', key: 'prioridade', width: 12 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Solicitante', key: 'solicitante_nome', width: 25 },
    { header: 'Fornecedor', key: 'fornecedor_nome', width: 25 },
    { header: 'Competência', key: 'competencia_ano_mes', width: 12 }
  ];

  // Estilizar cabeçalho
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Adicionar dados
  pedidos.forEach(pedido => {
    const row = worksheet.addRow({
      id: pedido.id,
      data_criacao: new Date(pedido.data_criacao).toLocaleString('pt-BR'),
      area_setor: pedido.area_setor,
      loja_unidade: pedido.loja_unidade,
      tipo_pedido: pedido.tipo_pedido,
      descricao_detalhada: pedido.descricao_detalhada,
      prioridade: pedido.prioridade,
      status: pedido.status,
      solicitante_nome: pedido.solicitante_nome || '-',
      fornecedor_nome: pedido.fornecedor_nome || '-',
      competencia_ano_mes: pedido.competencia_ano_mes || '-'
    });

    // Colorir status
    const statusCell = row.getCell('status');
    if (pedido.status === 'APROVADO') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else if (pedido.status === 'RECUSADO') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' }
      };
      statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else if (pedido.status === 'PENDENTE_APROVACAO') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF59E0B' }
      };
      statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    }

    // Colorir prioridade
    const prioridadeCell = row.getCell('prioridade');
    if (pedido.prioridade === 'URGENTE') {
      prioridadeCell.font = { color: { argb: 'FFEF4444' }, bold: true };
    } else if (pedido.prioridade === 'ALTA') {
      prioridadeCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
    }
  });

  // Adicionar bordas
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });
  });

  // Gerar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Gera nome de arquivo com timestamp
 */
export function generateFilename(prefix: string, extension: 'csv' | 'xlsx'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.${extension}`;
}
