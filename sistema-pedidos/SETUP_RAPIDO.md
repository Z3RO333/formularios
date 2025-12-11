# ⚡ Setup Rápido

## 1) Configurar ambiente

1. Abra `config.js` e ajuste:
   - `storageMode`: `local` (dev) ou `api` (produção com backend/N8N/SharePoint/SQL).
   - `apiBaseUrl` + `apiPaths` (endereços reais de `/pedidos`, `/aprovar`, `/recusar`).
   - Webhooks `onPedidoCriado` e `onStatusAlterado` (Power Automate/N8N).
   - Azure AD: `clientId`, `authority`, `redirectUri`; liste e-mails em `gestoresAutorizados` ou domínios em `dominiosPermitidos`.
   - Catálogos: status, áreas, lojas, fornecedores, prioridades, unidades.

## 2) Testar tela pública

1. Abra `index.html`.
2. Preencha dados, itens (obrigatório pelo menos 1) e anexos (opcional).
3. Envie. O pedido é salvo com status `PENDENTE_APROVACAO` e histórico inicial.

## 3) Testar painel restrito

1. Abra `painel.html`.
2. Clique em **Entrar com Microsoft** (MSAL) usando conta autorizada.
3. Veja listagem, aplique filtros e abra detalhes.
4. Aprove ou recuse (justificativa obrigatória na recusa). Histórico e webhook são disparados.
5. Gere PDF por fornecedor ou loja.

## 4) Integração com backend/N8N/PA

- Troque `storageMode` para `api` e aponte `apiBaseUrl`.
- Implemente endpoints:
  - `POST /pedidos`
  - `GET /pedidos?...` (filtros)
  - `PATCH /pedidos/{id}/aprovar`
  - `PATCH /pedidos/{id}/recusar`
  - `GET /relatorios/fornecedor` / `loja`
- Use os webhooks para notificações e auditoria.

## 5) SharePoint/Dataverse/SQL (exemplo de campos)

**Pedidos**: id, data_criacao, criado_por, area_setor, loja_unidade, tipo_pedido, prioridade, descricao_detalhada, justificativa, fornecedor_sugerido, status, data_aprovacao, aprovado_por, data_recusa, justificativa_recusa.

**ItensPedido**: id, pedido_id, material, quantidade, unidade, fornecedor_sugerido, preco_unitario_estimado, observacao.

**HistoricoStatus**: id, pedido_id, status_antigo, status_novo, data_hora, usuario_responsavel, observacao.

## 6) Deploy

- **Vercel / estático**: suba os arquivos da pasta `sistema-pedidos/` (garanta caminhos de redirect do Azure AD apontando para `painel.html`).
- **SharePoint**: publique os HTMLs e atualize redirect no Azure AD.
- **Servidor próprio**: sirva os arquivos estáticos e habilite HTTPS para MSAL.

Pronto: formulário público + painel de aprovação com controle de acesso, histórico e PDFs.
