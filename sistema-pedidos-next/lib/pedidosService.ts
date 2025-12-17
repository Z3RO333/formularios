import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { matchOrCreateFornecedor } from './fornecedorMatching';
import type { ImportPdfResponse, PedidoInput, PedidoItemInput } from './types';

const competenciaNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

type Profile = { id: string; perfil: string; nome: string; email: string };

// Resolve supplier using CNPJ or fuzzy name; uses service role because suppliers are globais.
export async function resolveFornecedorId(input?: { nome?: string; cnpj?: string | null; email?: string | null }) {
  if (!input?.nome && !input?.cnpj && !input?.email) return null;
  const fornecedor = await matchOrCreateFornecedor({
    nomeDigitado: input.nome || input.cnpj || input.email || 'Fornecedor',
    cnpj: input.cnpj,
    emailDigitado: input.email
  });
  return fornecedor.id;
}

// Creates a new pedido (header) for the authenticated solicitante.
export async function createPedido(supabase: SupabaseClient, profile: Profile, payload: PedidoInput) {
  const fornecedorId = await resolveFornecedorId({
    nome: payload.fornecedor_nome,
    cnpj: payload.fornecedor_cnpj,
    email: payload.fornecedor_email
  });

  const id = payload.id || randomUUID();
  const { error } = await supabase.from('pedidos').insert({
    id,
    solicitante_id: profile.id,
    solicitante_nome: payload.colaborador_nome || profile.nome,
    solicitante_email: profile.email,
    area_setor: payload.area_setor,
    loja_unidade: payload.loja_unidade,
    tipo_pedido: payload.tipo_pedido,
    descricao_detalhada: payload.descricao_detalhada,
    justificativa: payload.justificativa,
    prioridade: payload.prioridade,
    status: 'PENDENTE_APROVACAO',
    fornecedor_id: fornecedorId,
    fornecedor_nome_digitado: payload.fornecedor_nome || null,
    fornecedor_cnpj: payload.fornecedor_cnpj || null,
    competencia_ano_mes: competenciaNow(),
    data_criacao: new Date().toISOString()
  });
  if (error) throw error;

  if (payload.itens?.length) {
    await replaceItens(supabase, id, payload.itens);
  }
  return id;
}

// Updates pedido header + replaces itens_pedido.
export async function updatePedido(supabase: SupabaseClient, profile: Profile, id: string, payload: PedidoInput) {
  const fornecedorId = await resolveFornecedorId({
    nome: payload.fornecedor_nome,
    cnpj: payload.fornecedor_cnpj,
    email: payload.fornecedor_email
  });

  const { error } = await supabase
    .from('pedidos')
    .update({
      solicitante_nome: payload.colaborador_nome || profile.nome,
      solicitante_email: profile.email,
      area_setor: payload.area_setor,
      loja_unidade: payload.loja_unidade,
      tipo_pedido: payload.tipo_pedido,
      descricao_detalhada: payload.descricao_detalhada,
      justificativa: payload.justificativa,
      prioridade: payload.prioridade,
      fornecedor_id: fornecedorId,
      fornecedor_nome_digitado: payload.fornecedor_nome || null,
      fornecedor_cnpj: payload.fornecedor_cnpj || null
    })
    .eq('id', id);
  if (error) throw error;

  await replaceItens(supabase, id, payload.itens || []);

  // Register status history if needed (only on first save we already inserted creation elsewhere)
  return id;
}

/**
 * ✅ REFATORADO: Agora usa UPSERT ao invés de DELETE+INSERT
 * Isso previne perda de dados se o INSERT falhar
 */
export async function replaceItens(supabase: SupabaseClient, pedidoId: string, itens: PedidoItemInput[]) {
  // Se não há itens, deletar todos existentes
  if (!itens.length) {
    const { error } = await supabase.from('itens_pedido').delete().eq('pedido_id', pedidoId);
    if (error) throw error;
    return;
  }

  // 1. Buscar itens existentes para identificar quais deletar
  const { data: existentes, error: fetchError } = await supabase
    .from('itens_pedido')
    .select('id')
    .eq('pedido_id', pedidoId);

  if (fetchError) throw fetchError;

  const existenteIds = new Set((existentes || []).map(e => e.id));
  const novosItensIds = new Set(itens.filter(i => i.id).map(i => i.id!));

  // 2. Deletar apenas itens que não estão mais na lista
  const idsParaRemover = Array.from(existenteIds).filter(id => !novosItensIds.has(id));
  if (idsParaRemover.length > 0) {
    const { error: deleteError } = await supabase
      .from('itens_pedido')
      .delete()
      .in('id', idsParaRemover);

    if (deleteError) throw deleteError;
  }

  // 3. UPSERT (insert ou update) dos itens atuais
  // Isso garante atomicidade: se um item já existe, é atualizado; senão, é inserido
  const rows = itens.map((i) => ({
    id: i.id || randomUUID(),
    pedido_id: pedidoId,
    descricao_item: i.descricao_item,
    quantidade: i.quantidade,
    unidade: i.unidade,
    fornecedor_item: i.fornecedor_item || null,
    preco_unitario_estimado: i.preco_unitario_estimado ?? null,
    observacao: i.observacao || null
  }));

  const { error: upsertError } = await supabase
    .from('itens_pedido')
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) throw upsertError;
}

// Builds filters for painel listing respecting RLS (client token).
export async function listarPedidos(
  supabase: SupabaseClient,
  filtros: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    loja?: string;
    area?: string;
    fornecedorId?: string;
    page?: number;
    limit?: number;
  }
) {
  // Paginação (padrão: página 1, limite 50 - aumentado de 20)
  const page = filtros.page || 1;
  const limit = Math.min(filtros.limit || 50, 100); // Máximo 100
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Query otimizada com select específico (apenas campos necessários)
  let query = supabase
    .from('pedidos')
    .select(
      `
      id,
      area_setor,
      loja_unidade,
      tipo_pedido,
      descricao_detalhada,
      prioridade,
      status,
      data_criacao,
      competencia_ano_mes,
      fornecedores:fornecedor_id(id, nome_canonico),
      usuarios:solicitante_id(id, nome)
      `,
      { count: 'exact' }
    )
    .order('data_criacao', { ascending: false })
    .range(from, to);

  // Aplicar filtros
  if (filtros.status) query = query.eq('status', filtros.status);
  if (filtros.loja) query = query.ilike('loja_unidade', `%${filtros.loja}%`);
  if (filtros.area) query = query.ilike('area_setor', `%${filtros.area}%`);
  if (filtros.fornecedorId) query = query.eq('fornecedor_id', filtros.fornecedorId);
  if (filtros.dataInicio) query = query.gte('data_criacao', filtros.dataInicio);
  if (filtros.dataFim) query = query.lte('data_criacao', filtros.dataFim);

  const { data, error, count } = await query;
  if (error) throw error;

  // Retornar com metadados de paginação
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: to < (count || 0) - 1
    }
  };
}

export async function obterPedidoDetalhe(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*), arquivos_comprovantes(*), fornecedores:fornecedor_id(*), usuarios:solicitante_id(nome, email)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Persists historico_status row when status changes.
export async function registrarHistorico(
  supabase: SupabaseClient,
  pedidoId: string,
  anterior: string | null,
  novo: string,
  usuarioId: string,
  observacao: string
) {
  const { error } = await supabase.from('historico_status').insert({
    pedido_id: pedidoId,
    status_anterior: anterior,
    status_novo: novo,
    usuario_responsavel_id: usuarioId,
    data_hora: new Date().toISOString(),
    observacao
  });
  if (error) throw error;
}

// Placeholder for future email/SAP integrations.
export async function sendFornecedorApprovalEmail(_pedidoId: string) {
  // TODO: plug supplier approval integration (email/SAP) here.
  return Promise.resolve();
}

// Converte resposta do n8n em itens do pedido.
export function mapPdfItemsToPedido(itens: ImportPdfResponse['itens']): PedidoItemInput[] {
  return (
    itens?.map((i) => ({
      descricao_item: i.descricao,
      quantidade: Number(i.quantidade) || 0,
      unidade: i.unidade || '',
      preco_unitario_estimado: i.preco_unitario ?? null,
      observacao: i.observacao || ''
    })) || []
  );
}

// ❌ REMOVIDO: validatePedido() - Agora usamos pedidoCreateSchema (Zod) em todas as rotas
// para garantir validação consistente entre POST e PUT

// Usa service role para atualizar status (aprovação/recusa) com histórico.
export async function atualizarStatusComHistorico(
  supabase: SupabaseClient,
  {
    pedidoId,
    status,
    usuarioId,
    justificativa
  }: {
    pedidoId: string;
    status: 'APROVADO' | 'RECUSADO';
    usuarioId: string;
    justificativa?: string;
  }
) {
  const { data: pedido, error: pedidoErr } = await supabase.from('pedidos').select('*').eq('id', pedidoId).single();
  if (pedidoErr || !pedido) throw pedidoErr || new Error('Pedido não encontrado');

  const patch: Record<string, any> = {
    status,
    status_novo: status
  };
  if (status === 'APROVADO') {
    patch.aprovado_por_id = usuarioId;
    patch.data_aprovacao = new Date().toISOString();
  } else {
    patch.recusado_por_id = usuarioId;
    patch.data_recusa = new Date().toISOString();
    patch.justificativa_recusa = justificativa || null;
  }

  const { error } = await supabase.from('pedidos').update(patch).eq('id', pedidoId);
  if (error) throw error;

  await registrarHistorico(supabase, pedidoId, pedido.status, status, usuarioId, justificativa || (status === 'APROVADO' ? 'Aprovado' : 'Recusado'));
}
