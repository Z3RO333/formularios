import { query } from '../db.js';
import { matchOrCreateFornecedor } from './fornecedorService.js';
import { v4 as uuid } from 'uuid';

function competenciaFromDate(dateStr) {
  const d = new Date(dateStr || Date.now());
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

export async function criarPedido(payload, anexos = []) {
  const id_pedido = uuid();
  const data_criacao = new Date().toISOString();
  const competencia = competenciaFromDate(payload.data_pedido || data_criacao);

  const fornecedor = await matchOrCreateFornecedor(payload.fornecedor_nome_digitado, payload.fornecedor_cnpj);

  const pedido = await query(
    `INSERT INTO pedidos (
      id_pedido, status, data_criacao, criado_por, solicitante_nome, solicitante_email,
      area_setor, loja_unidade, tipo_pedido, prioridade, descricao_detalhada, justificativa,
      fornecedor_nome_digitado, fornecedor_cnpj, id_fornecedor, competencia_ano_mes
    ) VALUES ($1,'PENDENTE_APROVACAO',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *`,
    [
      id_pedido, data_criacao, payload.criado_por, payload.solicitante_nome, payload.solicitante_email,
      payload.area_setor, payload.loja_unidade, payload.tipo_pedido, payload.prioridade,
      payload.descricao_detalhada, payload.justificativa, payload.fornecedor_nome_digitado,
      payload.fornecedor_cnpj, fornecedor.id_fornecedor, competencia
    ]
  );

  if (payload.itens && payload.itens.length) {
    const values = payload.itens.flatMap((item) => [uuid(), id_pedido, item.material, item.quantidade, item.unidade, item.fornecedor_sugerido, item.preco_unitario_estimado, item.observacao]);
    const rows = payload.itens.length;
    const placeholders = Array.from({ length: rows }, (_, i) => `($${i * 8 + 1},$${i * 8 + 2},$${i * 8 + 3},$${i * 8 + 4},$${i * 8 + 5},$${i * 8 + 6},$${i * 8 + 7},$${i * 8 + 8})`).join(',');
    await query(
      `INSERT INTO itens_pedido (id_item, id_pedido, material, quantidade, unidade, fornecedor_sugerido, preco_unitario_estimado, observacao)
       VALUES ${placeholders}`,
      values
    );
  }

  await query(
    `INSERT INTO historico_status (id_historico, id_pedido, status_anterior, status_novo, data_hora, usuario_responsavel, observacao)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uuid(), id_pedido, null, 'PENDENTE_APROVACAO', data_criacao, payload.criado_por, 'Criado via formulário público']
  );

  return pedido.rows[0];
}

export async function listarPedidos(filtros = {}) {
  const clauses = [];
  const params = [];
  if (filtros.status) { params.push(filtros.status); clauses.push(`status = $${params.length}`); }
  if (filtros.area) { params.push(filtros.area); clauses.push(`area_setor = $${params.length}`); }
  if (filtros.loja) { params.push(filtros.loja); clauses.push(`loja_unidade = $${params.length}`); }
  if (filtros.fornecedor) { params.push(filtros.fornecedor); clauses.push(`id_fornecedor = $${params.length}`); }
  if (filtros.competencia) { params.push(filtros.competencia); clauses.push(`competencia_ano_mes = $${params.length}`); }
  if (filtros.solicitante_email) { params.push(filtros.solicitante_email); clauses.push(`solicitante_email = $${params.length}`); }
  if (filtros.solicitante) { params.push(`%${filtros.solicitante}%`); clauses.push(`solicitante_nome ILIKE $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(`SELECT * FROM pedidos ${where} ORDER BY data_criacao DESC`, params);
  return result.rows;
}

export async function obterPedido(id_pedido) {
  const pedido = await query('SELECT * FROM pedidos WHERE id_pedido=$1', [id_pedido]);
  if (!pedido.rows.length) return null;
  const itens = await query('SELECT * FROM itens_pedido WHERE id_pedido=$1', [id_pedido]);
  const anexos = await query('SELECT * FROM arquivos_comprovantes WHERE id_pedido=$1', [id_pedido]);
  return { ...pedido.rows[0], itens: itens.rows, anexos: anexos.rows };
}

async function registrarHistorico(id_pedido, status_anterior, status_novo, usuario, observacao) {
  await query(
    'INSERT INTO historico_status (id_historico, id_pedido, status_anterior, status_novo, data_hora, usuario_responsavel, observacao) VALUES ($1,$2,$3,$4,NOW(),$5,$6)',
    [uuid(), id_pedido, status_anterior, status_novo, usuario, observacao]
  );
}

export async function atualizarStatus(id_pedido, novoStatus, usuario, observacao, camposExtras = {}) {
  const atual = await query('SELECT status FROM pedidos WHERE id_pedido=$1', [id_pedido]);
  if (!atual.rows.length) throw new Error('Pedido não encontrado');
  await query(`UPDATE pedidos SET status=$1, ${novoStatus === 'APROVADO' ? 'data_aprovacao=NOW(), aprovado_por=$2' : 'data_recusa=NOW(), recusado_por=$2, justificativa_recusa=$3'} WHERE id_pedido=$4`,
    novoStatus === 'APROVADO'
      ? [novoStatus, usuario, null, id_pedido]
      : [novoStatus, usuario, camposExtras.justificativa_recusa || null, id_pedido]
  );
  await registrarHistorico(id_pedido, atual.rows[0].status, novoStatus, usuario, observacao || camposExtras.justificativa_recusa);
}
