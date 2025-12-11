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
