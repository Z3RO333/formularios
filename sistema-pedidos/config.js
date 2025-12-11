// Configuração centralizada para telas pública e administrativa
// Ajuste os valores conforme seu ambiente (N8N/Power Automate/SharePoint/API própria)
window.APP_CONFIG = {
  appName: 'Sistema de Pedidos',
  storageMode: 'local', // 'local' (localStorage para desenvolvimento) ou 'api' (usa fetch no backend)
  apiBaseUrl: 'https://sua-api.com',
  apiPaths: {
    pedidos: '/pedidos',
    aprovacao: (id) => `/pedidos/${id}/aprovar`,
    recusa: (id) => `/pedidos/${id}/recusar`,
    fornecedores: '/fornecedores',
    relatorioFornecedor: '/relatorios/fornecedor',
    relatorioLoja: '/relatorios/loja'
  },
  webhooks: {
    onPedidoCriado: 'https://bemol.app.n8n.cloud/webhook/f88b088b-395b-4e39-b718-dbd3c423734b',
    onStatusAlterado: 'https://bemol.app.n8n.cloud/webhook/f88b088b-395b-4e39-b718-dbd3c423734b'
  },
  azureAd: {
    clientId: '96f27d59-af7b-4a9d-b6a3-bbbfab088207',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: `${window.location.origin}/sistema-pedidos/painel.html`
  },
  roles: {
    solicitante: 'ROLE_SOLICITANTE',
    gestor: 'ROLE_GESTOR'
  },
  gestoresAutorizados: [
    'gestor@empresa.com',
    'admin@empresa.com'
  ],
  dominiosPermitidos: ['empresa.com'],
  matching: {
    similaridadeAceite: 0.85, // limiar para considerar mesmo fornecedor
    similaridadeSuspeita: 0.8  // limiar para alertar possível duplicidade
  },
  catalogs: {
    status: ['PENDENTE_APROVACAO', 'EM_COTACAO', 'APROVADO', 'RECUSADO', 'ENVIADO_SAP'],
    prioridades: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
    tipos: ['MATERIAL', 'SERVICO', 'OUTRO'],
    unidades: ['UN', 'CX', 'KG', 'M', 'L', 'PCT'],
    areas: ['Administrativo', 'Facilities', 'TI', 'Manutenção', 'Compras', 'RH', 'Financeiro', 'Operações', 'Outros'],
    lojas: ['Loja Central', 'Loja Norte', 'CD São Paulo', 'CD Rio de Janeiro', 'Unidade Porto Alegre'],
    fornecedores: ['Fornecedor Padrão', 'Fornecedor Alpha', 'Fornecedor Beta']
  }
};
