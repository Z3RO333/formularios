import { criarPedido, listarPedidos, obterPedido, atualizarStatus } from '../services/pedidoService.js';
import { salvarComprovantes } from '../services/comprovanteService.js';
import { auditLog } from '../utils/audit.js';

export async function postPedido(req, res) {
  try {
    const required = ['solicitante_nome', 'solicitante_email', 'area_setor', 'loja_unidade', 'tipo_pedido', 'prioridade', 'descricao_detalhada', 'justificativa', 'fornecedor_nome_digitado'];
    for (const field of required) {
      if (!req.body[field]) return res.status(400).json({ error: `Campo obrigatório: ${field}` });
    }
    const pedido = await criarPedido(req.body, req.files);
    if (req.files?.length && pedido.id_fornecedor) {
      await salvarComprovantes({ files: req.files, id_pedido: pedido.id_pedido, id_fornecedor: pedido.id_fornecedor, competencia_ano_mes: pedido.competencia_ano_mes });
    }
    await auditLog({ acao: 'CRIAR_PEDIDO', objeto_tipo: 'pedido', objeto_id: pedido.id_pedido, usuario_email: req.body.criado_por || 'anon', detalhes: { solicitante: pedido.solicitante_email } });
    res.status(201).json(pedido);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
}

export async function getPedidos(req, res) {
  try {
    const filtros = { ...req.query };
    // RLS em app: solicitante só vê os próprios pedidos.
    if (req.user?.role === 'SOLICITANTE') {
      filtros.solicitante_email = req.user.email;
    }
    const pedidos = await listarPedidos(filtros);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPedidoById(req, res) {
  const pedido = await obterPedido(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
  if (req.user?.role === 'SOLICITANTE' && pedido.solicitante_email !== req.user.email) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  res.json(pedido);
}

export async function patchAprovar(req, res) {
  try {
    await atualizarStatus(req.params.id, 'APROVADO', req.user?.email || 'sistema', req.body.observacao);
    await auditLog({ acao: 'APROVAR_PEDIDO', objeto_tipo: 'pedido', objeto_id: req.params.id, usuario_email: req.user?.email, detalhes: { observacao: req.body.observacao } });
    res.json({ status: 'APROVADO' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function patchRecusar(req, res) {
  try {
    if (!req.body.justificativa_recusa) return res.status(400).json({ error: 'Justificativa é obrigatória' });
    await atualizarStatus(req.params.id, 'RECUSADO', req.user?.email || 'sistema', req.body.justificativa_recusa, { justificativa_recusa: req.body.justificativa_recusa });
    await auditLog({ acao: 'RECUSAR_PEDIDO', objeto_tipo: 'pedido', objeto_id: req.params.id, usuario_email: req.user?.email, detalhes: { justificativa: req.body.justificativa_recusa } });
    res.json({ status: 'RECUSADO' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
