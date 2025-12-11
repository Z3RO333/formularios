# 📦 Sistema de Solicitação e Gestão de Pedidos

Solução pronta para uso corporativo com **duas áreas**:

- **Tela Pública (`index.html`)**: qualquer colaborador cria pedidos, com itens estruturados, anexos, status inicial `PENDENTE_APROVACAO` e histórico.
- **Painel Restrito (`painel.html`)**: apenas gestores autorizados (Azure AD) listam, filtram, aprovam/recusam e geram PDFs por fornecedor ou loja.

Persistência pode ser **local (desenvolvimento)** ou **API real** (SharePoint/Dataverse/SQL/N8N) via `config.js` + `data-layer.js`.

## 🧭 Arquivos principais

- `index.html` — formulário público com itens, anexos e histórico inicial.
- `painel.html` — painel com login MSAL, filtros, aprovação/recusa, PDF, suspeitas de fornecedores duplicados.
- `config.js` — configuração central (API, Azure AD, catálogos, webhooks, roles, limites de similaridade).
- `data-layer.js` — camada de dados (localStorage ou API) + webhooks de evento + matching/mesclagem de fornecedores.
- `SETUP_RAPIDO.md` — passo a passo resumido.

## ⚙️ Configuração rápida

1. Ajuste `config.js`:
   - `storageMode`: `local` (dev) ou `api` (backend real).
   - `apiBaseUrl` e caminhos em `apiPaths` (ex.: `/pedidos`, `/pedidos/{id}/aprovar`).
   - Webhooks `onPedidoCriado` e `onStatusAlterado` para N8N/Power Automate.
   - Azure AD: `clientId`, `authority`, `redirectUri`; liste gestores em `gestoresAutorizados`.
   - Catálogos (status, prioridades, áreas, lojas, unidades, fornecedores).
2. Abra `index.html` e envie um pedido para validar.
3. Abra `painel.html`, faça login (conta autorizada) e aprove/recuse.

## 🗄️ Modelagem recomendada

Entidades sugeridas (SharePoint/SQL/Dataverse):

- **Pedidos**: `id`, `data_criacao`, `criado_por`, `area_setor`, `loja_unidade`, `tipo_pedido`, `prioridade`, `descricao_detalhada`, `justificativa`, `fornecedor_sugerido`, `status`, `data_aprovacao`, `aprovado_por`, `data_recusa`, `justificativa_recusa`.
- **ItensPedido**: `id`, `pedido_id`, `material`, `quantidade`, `unidade`, `fornecedor_sugerido`, `preco_unitario_estimado`, `observacao`.
- **Fornecedores**: `id_fornecedor`, `nome_canonico`, `nome_canonico_normalizado`, `cnpj`, `apelidos_variantes[]`, `contatos`, `email`, `telefone`, `mesclado_em`.
- **LojasUnidades**: `id`, `nome`, `codigo`, `cidade`, `estado`.
- **HistoricoStatus**: `id`, `pedido_id`, `status_antigo`, `status_novo`, `data_hora`, `usuario_responsavel`, `observacao`.

Matching de fornecedores: normaliza texto, compara por similaridade (Levenshtein) e CNPJ; limiares ajustáveis em `config.js.matching`. Permite mesclar duplicados no painel.

## 🔗 API / Integração (Power Automate / N8N)

Endereços previstos (configure em `config.js`):

- `POST /pedidos` — cria pedido (status `PENDENTE_APROVACAO`, grava histórico inicial).
- `GET /pedidos?status=&area=&loja=&fornecedor=&dataInicial=&dataFinal=&busca=` — lista com filtros.
- `PATCH /pedidos/{id}/aprovar` — body: `{ status: "APROVADO", aprovado_por, data_aprovacao, historicoStatus[] }`.
- `PATCH /pedidos/{id}/recusar` — body: `{ status: "RECUSADO", justificativa_recusa, recusado_por, data_recusa, historicoStatus[] }`.
- `GET /relatorios/fornecedor?fornecedor=...&dataInicial=...&dataFinal=...` — lista pedidos/itens por fornecedor.
- `GET /relatorios/loja?loja=...&dataInicial=...&dataFinal=...` — lista pedidos/itens por loja.

Webhooks prontos para N8N/PA:
- `onPedidoCriado` — dispara no envio do formulário público.
- `onStatusAlterado` — dispara em aprovação/recusa.

## 🔒 Controle de acesso

- **ROLE_SOLICITANTE**: acesso apenas a `index.html` (público).
- **ROLE_GESTOR**: acesso a `painel.html`. Validação por e-mail/domínio em `config.js` + Azure AD (MSAL).
- Todas as ações de status são registradas em `historicoStatus` no payload.

## 🖨️ Relatórios / PDFs

No painel, botões "PDF por fornecedor" e "PDF por loja" usam jsPDF para gerar listagens filtradas (itens, datas, status). Para produção, ajuste para consumir seus endpoints `/relatorios/*` antes de gerar.

## 🧠 Fluxo de status sugerido

`PENDENTE_APROVACAO` → `EM_COTACAO` (opcional) → `APROVADO` → `ENVIADO_SAP`

`RECUSADO` encerra o fluxo (com justificativa obrigatória).

## ✅ Checklist de teste

- [ ] Enviar pedido pela tela pública com anexos e itens.
- [ ] Ver pedido no painel após login (gestor autorizado).
- [ ] Filtrar por status/loja/fornecedor e por intervalo de datas.
- [ ] Aprovar pedido e verificar histórico + webhook de status.
- [ ] Recusar pedido com justificativa obrigatória.
- [ ] Gerar PDF por fornecedor e por loja.

## 🛠️ Pontos de integração no código

- **Camada de dados**: `data-layer.js` (`PedidoRepository` troca entre localStorage e API real).
- **Histórico de status**: montado na submissão (`index.html`) e nas ações de aprovação/recusa (`painel.html`).
- **Controle de acesso**: `painel.html` (MSAL + lista de gestores/domínios permitidos).
- **Notificações/PA/N8N**: `NotificacaoService` em `data-layer.js` dispara `onPedidoCriado` e `onStatusAlterado`.
- **PDFs**: `PdfService` em `painel.html` (ajuste para dados de backend se necessário).

Pronto para evoluir com SharePoint/Dataverse/SQL mantendo a mesma estrutura de payloads.
