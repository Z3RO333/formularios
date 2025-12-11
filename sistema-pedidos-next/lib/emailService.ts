import nodemailer from 'nodemailer';

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Template HTML base
function emailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .info-row { margin: 12px 0; padding: 12px; background: #f9fafb; border-radius: 4px; }
    .info-label { font-weight: 600; color: #374151; margin-right: 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-urgent { background: #fef2f2; color: #dc2626; }
    .badge-high { background: #fef3c7; color: #f59e0b; }
    .badge-medium { background: #dbeafe; color: #2563eb; }
    .badge-low { background: #f0fdf4; color: #16a34a; }
    .footer { background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      Sistema de Pedidos - Para dúvidas, responda este e-mail.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Email de pedido aprovado para fornecedor
export async function enviarEmailFornecedor(pedido: any, fornecedor: any) {
  if (!fornecedor?.email_contato) return { skipped: true, reason: 'Sem email do fornecedor' };

  const prioridadeBadge = {
    URGENTE: 'badge-urgent',
    ALTA: 'badge-high',
    MEDIA: 'badge-medium',
    BAIXA: 'badge-low'
  }[pedido.prioridade] || 'badge-medium';

  const content = `
    <p>Olá, <strong>${fornecedor.nome_canonico}</strong>!</p>
    <p>Temos um novo pedido aprovado para você:</p>

    <div class="info-row">
      <span class="info-label">ID do Pedido:</span> ${pedido.id}
    </div>
    <div class="info-row">
      <span class="info-label">Loja/Unidade:</span> ${pedido.loja_unidade}
    </div>
    <div class="info-row">
      <span class="info-label">Área/Setor:</span> ${pedido.area_setor}
    </div>
    <div class="info-row">
      <span class="info-label">Prioridade:</span> <span class="badge ${prioridadeBadge}">${pedido.prioridade}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Descrição:</span><br>${pedido.descricao_detalhada}
    </div>
    <div class="info-row">
      <span class="info-label">Justificativa:</span><br>${pedido.justificativa}
    </div>

    ${(pedido.itens && pedido.itens.length > 0) ? `
      <h3>Itens do Pedido:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Material</th>
            <th style="padding: 8px; text-align: center;">Qtd</th>
            <th style="padding: 8px; text-align: left;">Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${pedido.itens.map((i: any) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i.descricao_item || i.material}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i.quantidade}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i.unidade}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <p style="margin-top: 24px;">Por favor, responda este e-mail confirmando o recebimento e prazo de entrega.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'pedidos@empresa.com',
      to: fornecedor.email_contato,
      subject: `✅ Pedido Aprovado - ${pedido.loja_unidade} - Ref #${pedido.id.slice(0, 8)}`,
      html: emailTemplate('Pedido Aprovado', content)
    });
    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail para fornecedor:', error.message);
    return { ok: false, error: error.message };
  }
}

// Email para solicitante quando pedido é aprovado
export async function enviarEmailAprovacao(pedido: any, solicitante: any, aprovador: any) {
  if (!solicitante?.email) return { skipped: true, reason: 'Sem email do solicitante' };

  const content = `
    <p>Olá, <strong>${solicitante.nome}</strong>!</p>
    <p>Seu pedido foi <strong style="color: #16a34a;">APROVADO</strong>! 🎉</p>

    <div class="info-row">
      <span class="info-label">ID do Pedido:</span> ${pedido.id}
    </div>
    <div class="info-row">
      <span class="info-label">Aprovado por:</span> ${aprovador.nome}
    </div>
    <div class="info-row">
      <span class="info-label">Data de Aprovação:</span> ${new Date().toLocaleString('pt-BR')}
    </div>
    <div class="info-row">
      <span class="info-label">Descrição:</span><br>${pedido.descricao_detalhada}
    </div>

    <p>O pedido será encaminhado ao fornecedor para providências.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'pedidos@empresa.com',
      to: solicitante.email,
      subject: `✅ Pedido Aprovado - #${pedido.id.slice(0, 8)}`,
      html: emailTemplate('Pedido Aprovado', content)
    });
    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de aprovação:', error.message);
    return { ok: false, error: error.message };
  }
}

// Email para solicitante quando pedido é recusado
export async function enviarEmailRecusa(pedido: any, solicitante: any, reprovador: any, justificativa: string) {
  if (!solicitante?.email) return { skipped: true, reason: 'Sem email do solicitante' };

  const content = `
    <p>Olá, <strong>${solicitante.nome}</strong>,</p>
    <p>Infelizmente seu pedido foi <strong style="color: #dc2626;">RECUSADO</strong>.</p>

    <div class="info-row">
      <span class="info-label">ID do Pedido:</span> ${pedido.id}
    </div>
    <div class="info-row">
      <span class="info-label">Recusado por:</span> ${reprovador.nome}
    </div>
    <div class="info-row">
      <span class="info-label">Data:</span> ${new Date().toLocaleString('pt-BR')}
    </div>
    <div class="info-row">
      <span class="info-label">Justificativa:</span><br>${justificativa}
    </div>

    <p>Se tiver dúvidas sobre a recusa, entre em contato com ${reprovador.nome} (${reprovador.email}).</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'pedidos@empresa.com',
      to: solicitante.email,
      subject: `❌ Pedido Recusado - #${pedido.id.slice(0, 8)}`,
      html: emailTemplate('Pedido Recusado', content)
    });
    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de recusa:', error.message);
    return { ok: false, error: error.message };
  }
}

// Email para gestor quando novo pedido é criado
export async function enviarEmailNovoPedido(pedido: any, solicitante: any, gestorEmail: string) {
  if (!gestorEmail) return { skipped: true, reason: 'Sem email do gestor' };

  const prioridadeBadge = {
    URGENTE: 'badge-urgent',
    ALTA: 'badge-high',
    MEDIA: 'badge-medium',
    BAIXA: 'badge-low'
  }[pedido.prioridade] || 'badge-medium';

  const content = `
    <p>Um novo pedido aguarda sua aprovação!</p>

    <div class="info-row">
      <span class="info-label">Solicitante:</span> ${solicitante.nome}
    </div>
    <div class="info-row">
      <span class="info-label">Loja/Unidade:</span> ${pedido.loja_unidade}
    </div>
    <div class="info-row">
      <span class="info-label">Prioridade:</span> <span class="badge ${prioridadeBadge}">${pedido.prioridade}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Descrição:</span><br>${pedido.descricao_detalhada.substring(0, 200)}${pedido.descricao_detalhada.length > 200 ? '...' : ''}
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/painel" class="button">
        Ver Pedido no Sistema
      </a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'pedidos@empresa.com',
      to: gestorEmail,
      subject: `🔔 Novo Pedido Aguardando Aprovação - ${pedido.loja_unidade}`,
      html: emailTemplate('Novo Pedido', content)
    });
    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de novo pedido:', error.message);
    return { ok: false, error: error.message };
  }
}
