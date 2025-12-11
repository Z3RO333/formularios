// Script de teste para configuração de email SMTP
// Execute: node test-email.js

require('dotenv').config({ path: '.env' });
const nodemailer = require('nodemailer');

console.log('🧪 Testando configuração de email SMTP...\n');

// Configurações do .env
const config = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

console.log('📋 Configurações:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Secure: ${config.secure}`);
console.log(`   User: ${config.auth.user}`);
console.log(`   Pass: ${config.auth.pass ? '****' + config.auth.pass.slice(-4) : 'NÃO CONFIGURADO'}\n`);

// Validação
if (!config.host || !config.auth.user || !config.auth.pass) {
  console.error('❌ ERRO: Variáveis de ambiente faltando no .env');
  console.log('\n📝 Certifique-se de configurar:');
  console.log('   EMAIL_HOST');
  console.log('   EMAIL_PORT');
  console.log('   EMAIL_USER');
  console.log('   EMAIL_PASS');
  console.log('   EMAIL_FROM\n');
  process.exit(1);
}

// Criar transporter
const transporter = nodemailer.createTransport(config);

// Email de teste
const emailTest = {
  from: process.env.EMAIL_FROM || config.auth.user,
  to: config.auth.user, // Envia para si mesmo
  subject: '✅ Teste de Email - Sistema de Pedidos Bemol',
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">✅ Teste de Email</h1>
    </div>
    <div style="padding: 24px;">
      <p>Olá!</p>
      <p>Este é um <strong>email de teste</strong> do Sistema de Pedidos Bemol.</p>

      <div style="margin: 20px 0; padding: 16px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
        <strong style="color: #16a34a;">✅ Configuração SMTP funcionando corretamente!</strong>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Informações do Teste:</strong></p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
          📧 Servidor: ${config.host}<br>
          🔌 Porta: ${config.port}<br>
          👤 Usuário: ${config.auth.user}<br>
          📅 Data: ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      <p>Se você recebeu este email, significa que:</p>
      <ul>
        <li>✅ As credenciais SMTP estão corretas</li>
        <li>✅ O servidor está acessível</li>
        <li>✅ Os emails HTML estão renderizando corretamente</li>
        <li>✅ O sistema está pronto para enviar notificações</li>
      </ul>

      <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>🎉 Próximos passos:</strong></p>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #1e40af;">
          <li>Crie um pedido de teste no sistema</li>
          <li>Aprove ou recuse o pedido</li>
          <li>Verifique se os emails são enviados automaticamente</li>
        </ol>
      </div>

      <p style="color: #6b7280; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        Este é um email automático do Sistema de Pedidos Bemol.<br>
        Para dúvidas, responda este e-mail.
      </p>
    </div>
  </div>
</body>
</html>
  `,
  text: `
✅ Teste de Email - Sistema de Pedidos Bemol

Olá!

Este é um email de teste do Sistema de Pedidos Bemol.

✅ Configuração SMTP funcionando corretamente!

Informações do Teste:
📧 Servidor: ${config.host}
🔌 Porta: ${config.port}
👤 Usuário: ${config.auth.user}
📅 Data: ${new Date().toLocaleString('pt-BR')}

Se você recebeu este email, significa que:
✅ As credenciais SMTP estão corretas
✅ O servidor está acessível
✅ Os emails estão sendo enviados
✅ O sistema está pronto para uso

Próximos passos:
1. Crie um pedido de teste no sistema
2. Aprove ou recuse o pedido
3. Verifique se os emails são enviados automaticamente

---
Sistema de Pedidos Bemol
  `
};

console.log('📤 Enviando email de teste...\n');

// Enviar email
transporter.sendMail(emailTest)
  .then(info => {
    console.log('✅ EMAIL ENVIADO COM SUCESSO!\n');
    console.log('📨 Detalhes:');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Para: ${emailTest.to}`);
    console.log(`   Assunto: ${emailTest.subject}\n`);
    console.log('🎉 Configuração SMTP está funcionando!');
    console.log('📬 Verifique sua caixa de entrada (e SPAM)\n');
  })
  .catch(err => {
    console.error('❌ ERRO AO ENVIAR EMAIL:\n');
    console.error(`   Mensagem: ${err.message}\n`);

    // Dicas de troubleshooting
    console.log('💡 Possíveis soluções:\n');

    if (err.message.includes('Invalid login')) {
      console.log('   → Verifique EMAIL_USER e EMAIL_PASS no .env');
      console.log('   → Se usar Gmail, crie um App Password');
      console.log('   → Link: https://myaccount.google.com/apppasswords\n');
    }

    if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
      console.log('   → Verifique EMAIL_HOST e EMAIL_PORT');
      console.log('   → Confirme acesso à internet');
      console.log('   → Teste com telnet: telnet smtp.gmail.com 587\n');
    }

    if (err.message.includes('self signed certificate')) {
      console.log('   → Tente com EMAIL_SECURE=false\n');
    }

    console.log('📚 Consulte GUIA_EMAIL.md para mais informações\n');
    process.exit(1);
  });
