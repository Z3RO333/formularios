import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function enviarEmailFornecedor(pedido: any, fornecedor: any) {
  if (!fornecedor?.email_contato) return { skipped: true };
  const assunto = `Pedido aprovado - ${pedido.loja_unidade || ''} - Ref ${pedido.id} - ${fornecedor.nome_canonico}`;
  const corpo = `Olá,\n\nSegue pedido aprovado:\n- Loja: ${pedido.loja_unidade}\n- Área: ${pedido.area_setor}\n- Prioridade: ${pedido.prioridade}\n- Descrição: ${pedido.descricao_detalhada}\n- Justificativa: ${pedido.justificativa}\n\nItens: ${(pedido.itens || []).map((i: any) => `${i.material} (${i.quantidade}${i.unidade})`).join(', ')}\n\nPara dúvidas, responder este e-mail.`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'pedidos@empresa.com',
      to: fornecedor.email_contato,
      subject: assunto,
      text: corpo
    });
    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error.message);
    return { ok: false, error: error.message };
  }
}
