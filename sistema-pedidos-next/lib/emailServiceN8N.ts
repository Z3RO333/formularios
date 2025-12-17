/**
 * Serviço de Email usando N8N Webhooks
 * Alternativa mais simples ao SMTP direto
 */

interface EmailPayload {
  tipo: 'novo_pedido' | 'aprovado_solicitante' | 'aprovado_fornecedor' | 'recusado';
  para: string;
  pedido: any;
  dados_adicionais?: any;
}

/**
 * Envia email via webhook N8N
 */
async function enviarViaWebhook(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('N8N_EMAIL_WEBHOOK_URL não configurado, pulando envio de email');
    return { ok: false, error: 'Webhook não configurado' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`N8N retornou status ${response.status}`);
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar email via N8N:', error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Email de pedido aprovado para fornecedor
 */
export async function enviarEmailFornecedor(pedido: any, fornecedor: any) {
  if (!fornecedor?.email_contato) {
    return { skipped: true, reason: 'Sem email do fornecedor' };
  }

  return enviarViaWebhook({
    tipo: 'aprovado_fornecedor',
    para: fornecedor.email_contato,
    pedido: {
      id: pedido.id,
      loja_unidade: pedido.loja_unidade,
      area_setor: pedido.area_setor,
      prioridade: pedido.prioridade,
      descricao_detalhada: pedido.descricao_detalhada,
      justificativa: pedido.justificativa,
      itens: pedido.itens || []
    },
    dados_adicionais: {
      fornecedor_nome: fornecedor.nome_canonico
    }
  });
}

/**
 * Email para solicitante quando pedido é aprovado
 */
export async function enviarEmailAprovacao(pedido: any, solicitante: any, aprovador: any) {
  if (!solicitante?.email) {
    return { skipped: true, reason: 'Sem email do solicitante' };
  }

  return enviarViaWebhook({
    tipo: 'aprovado_solicitante',
    para: solicitante.email,
    pedido: {
      id: pedido.id,
      descricao_detalhada: pedido.descricao_detalhada,
      data_aprovacao: new Date().toISOString()
    },
    dados_adicionais: {
      solicitante_nome: solicitante.nome,
      aprovador_nome: aprovador.nome
    }
  });
}

/**
 * Email para solicitante quando pedido é recusado
 */
export async function enviarEmailRecusa(
  pedido: any,
  solicitante: any,
  reprovador: any,
  justificativa: string
) {
  if (!solicitante?.email) {
    return { skipped: true, reason: 'Sem email do solicitante' };
  }

  return enviarViaWebhook({
    tipo: 'recusado',
    para: solicitante.email,
    pedido: {
      id: pedido.id,
      descricao_detalhada: pedido.descricao_detalhada,
      data_recusa: new Date().toISOString()
    },
    dados_adicionais: {
      solicitante_nome: solicitante.nome,
      reprovador_nome: reprovador.nome,
      reprovador_email: reprovador.email,
      justificativa_recusa: justificativa
    }
  });
}

/**
 * Email para gestor quando novo pedido é criado
 */
export async function enviarEmailNovoPedido(pedido: any, solicitante: any, gestorEmail: string) {
  if (!gestorEmail) {
    return { skipped: true, reason: 'Sem email do gestor' };
  }

  return enviarViaWebhook({
    tipo: 'novo_pedido',
    para: gestorEmail,
    pedido: {
      id: pedido.id,
      loja_unidade: pedido.loja_unidade,
      prioridade: pedido.prioridade,
      descricao_detalhada: pedido.descricao_detalhada,
      data_criacao: pedido.data_criacao || new Date().toISOString()
    },
    dados_adicionais: {
      solicitante_nome: solicitante.nome,
      url_sistema: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  });
}
