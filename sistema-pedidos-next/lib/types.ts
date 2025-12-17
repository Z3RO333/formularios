export type PedidoStatus = 'PENDENTE_APROVACAO' | 'APROVADO' | 'RECUSADO';
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type PedidoItemInput = {
  id?: string;
  descricao_item: string;
  quantidade: number;
  unidade: string;
  fornecedor_item?: string | null;
  preco_unitario_estimado?: number | null;
  observacao?: string | null;
};

export type PedidoInput = {
  id?: string;
  area_setor: string;
  loja_unidade: string;
  tipo_pedido: string;
  descricao_detalhada: string;
  justificativa: string;
  prioridade: Prioridade;
  colaborador_nome?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string | null;
  fornecedor_email?: string | null;
  itens?: PedidoItemInput[];
};

export type ImportPdfResponse = {
  tipo_documento: string;
  fornecedor?: {
    nome?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
  };
  itens?: {
    descricao: string;
    quantidade: number;
    unidade: string;
    preco_unitario?: number;
    observacao?: string;
  }[];
};

// Tipos retornados pelo N8N ao importar PDF
export type N8nItem = {
  descricao: string;
  quantidade: number;
  unidade: string | null;
  preco_unitario: number | null;
  preco_total: number | null;
};

export type N8nFornecedor = {
  nome: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
};

export type N8nDocumento = {
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
};

export type N8nPdfResponse = {
  modelo_documento: string | null;
  fornecedor: N8nFornecedor | null;
  documento: N8nDocumento | null;
  loja_unidade: string | null;
  itens: N8nItem[];
  observacoes: string | null;
  _raw?: string;
  _erro_parse?: string;
};
