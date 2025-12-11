# 📧 Guia de Configuração de Email - Sistema de Pedidos Bemol

## 🔧 Configuração Inicial

### 1. Editar o arquivo `.env`

Abra o arquivo `.env` na raiz do projeto e preencha as credenciais de email:

```env
EMAIL_HOST=smtp.gmail.com          # ou smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=pedidos@bemol.com.br    # Seu email
EMAIL_PASS=sua-senha-aqui          # Senha ou App Password
EMAIL_FROM=Sistema de Pedidos Bemol <pedidos@bemol.com.br>
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL do sistema
```

### 2. Configurações por Provedor

#### 📨 Gmail / Google Workspace
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@bemol.com.br
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx   # App Password (recomendado)
```

**⚠️ IMPORTANTE para Gmail:**
- Habilite **2FA (verificação em 2 etapas)**
- Crie um **App Password** em: https://myaccount.google.com/apppasswords
- Use o App Password no lugar da senha normal

#### 📨 Office 365 / Outlook
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@bemol.com.br
EMAIL_PASS=sua-senha-normal
```

#### 📨 Servidor SMTP Customizado
```env
EMAIL_HOST=smtp.seuprovedor.com.br
EMAIL_PORT=587 ou 465
EMAIL_SECURE=false  # ou true se porta 465
EMAIL_USER=usuario
EMAIL_PASS=senha
```

---

## 📬 Tipos de Emails Enviados

O sistema envia 4 tipos de emails automaticamente:

### 1. 🆕 **Novo Pedido Criado** (para Gestores)
- **Quando:** Um solicitante cria um novo pedido
- **Para:** Email do gestor responsável
- **Conteúdo:**
  - Nome do solicitante
  - Loja/Unidade
  - Prioridade (com badge colorido)
  - Descrição resumida
  - Botão para acessar o sistema

### 2. ✅ **Pedido Aprovado** (para Solicitante)
- **Quando:** Gestor aprova um pedido
- **Para:** Email do solicitante
- **Conteúdo:**
  - ID do pedido
  - Nome do aprovador
  - Data de aprovação
  - Descrição do pedido

### 3. ✅ **Pedido Aprovado** (para Fornecedor)
- **Quando:** Gestor aprova um pedido
- **Para:** Email do fornecedor
- **Conteúdo:**
  - Dados completos do pedido
  - Loja, área, prioridade
  - Tabela com todos os itens
  - Quantidades e unidades
  - Solicitação de confirmação

### 4. ❌ **Pedido Recusado** (para Solicitante)
- **Quando:** Gestor recusa um pedido
- **Para:** Email do solicitante
- **Conteúdo:**
  - ID do pedido
  - Nome do gestor que recusou
  - Justificativa da recusa
  - Dados de contato do gestor

---

## 🧪 Como Testar

### Teste Manual via API

```bash
# Criar um pedido (envia email para gestor)
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "area_setor": "TI",
    "loja_unidade": "Matriz",
    "tipo_pedido": "Material",
    "descricao_detalhada": "Teste de email",
    "justificativa": "Testar sistema de notificações",
    "prioridade": "ALTA",
    "itens": [
      {
        "descricao_item": "Mouse USB",
        "quantidade": 5,
        "unidade": "UN"
      }
    ]
  }'

# Aprovar pedido (envia email para solicitante e fornecedor)
curl -X PATCH http://localhost:3000/api/pedidos/[ID]/aprovar \
  -H "Authorization: Bearer SEU_TOKEN_GESTOR"

# Recusar pedido (envia email para solicitante)
curl -X PATCH http://localhost:3000/api/pedidos/[ID]/recusar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_GESTOR" \
  -d '{
    "justificativa_recusa": "Falta de orçamento"
  }'
```

### Verificar Logs

```bash
# Ver logs do Next.js
cd sistema-pedidos-next
npm run dev

# Procurar por:
# ✅ "Email enviado com sucesso"
# ❌ "Erro ao enviar e-mail"
```

---

## 🎨 Exemplo Visual dos Emails

Todos os emails são **HTML responsivos** com:
- 📱 Design mobile-friendly
- 🎨 Cores da marca (azul primário #2563eb)
- 🏷️ Badges coloridos para status e prioridade
- 📊 Tabelas formatadas para itens
- 🔘 Botões CTA para ações

---

## 🔍 Troubleshooting

### ❌ "Erro: Invalid login"
**Solução:** Verifique usuário e senha no `.env`

### ❌ "Connection timeout"
**Solução:** Verifique `EMAIL_HOST` e `EMAIL_PORT`

### ❌ "Username and Password not accepted" (Gmail)
**Solução:** Use App Password em vez da senha normal

### ❌ Email não chega
**Possíveis causas:**
1. Verifique caixa de SPAM
2. Verifique se `EMAIL_FROM` é válido
3. Teste com outro email de destino
4. Verifique logs do servidor

### 🧪 Teste rápido de SMTP

```javascript
// Criar arquivo test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'seu-email@bemol.com.br',
    pass: 'sua-senha'
  }
});

transporter.sendMail({
  from: 'pedidos@bemol.com.br',
  to: 'seu-email@bemol.com.br',
  subject: 'Teste SMTP',
  text: 'Email de teste do sistema de pedidos'
})
.then(info => console.log('✅ Email enviado:', info.messageId))
.catch(err => console.error('❌ Erro:', err.message));
```

```bash
node test-email.js
```

---

## 📋 Checklist de Configuração

- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] App Password criado (se Gmail)
- [ ] `EMAIL_FROM` com formato correto
- [ ] `NEXT_PUBLIC_APP_URL` configurado
- [ ] Teste manual de SMTP funcionando
- [ ] Criar pedido de teste
- [ ] Aprovar pedido de teste
- [ ] Verificar recebimento dos emails
- [ ] Verificar formatação HTML dos emails
- [ ] Testar em diferentes clientes (Gmail, Outlook)

---

## 🚀 Em Produção

Quando subir para produção:

1. Atualizar `NEXT_PUBLIC_APP_URL`:
```env
NEXT_PUBLIC_APP_URL=https://pedidos.bemol.com.br
```

2. Usar credenciais de produção
3. Configurar SPF/DKIM/DMARC no domínio
4. Monitorar taxa de entrega
5. Implementar retry em caso de falha

---

## 📧 Emails de Gestores

Para configurar quais gestores recebem notificações de novos pedidos, você pode:

1. **Por área/setor**: Criar tabela de gestores por área
2. **Global**: Enviar para todos os gestores
3. **Por loja**: Gestor específico por loja

Editar `lib/pedidosService.ts` para implementar a lógica desejada.

---

## 💡 Dicas

- Use **App Passwords** para maior segurança
- Monitore os logs para detectar problemas
- Teste em ambiente de desenvolvimento primeiro
- Configure rate limiting para evitar spam
- Mantenha templates HTML simples e responsivos
- Adicione footer com opção de descadastramento (se necessário)

---

**✅ Sistema de email configurado e pronto para uso!**
