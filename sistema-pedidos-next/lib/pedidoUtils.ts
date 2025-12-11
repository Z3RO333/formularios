import type { ImportPdfResponse, PedidoItemInput } from './types';

export const emptyItem: PedidoItemInput = {
  descricao_item: '',
  quantidade: 1,
  unidade: 'UN',
  fornecedor_item: '',
  preco_unitario_estimado: null,
  observacao: ''
};

export function mapPdfItensToPedido(itens?: ImportPdfResponse['itens']): PedidoItemInput[] {
  return (
    itens?.map((i) => ({
      descricao_item: i.descricao,
      quantidade: Number(i.quantidade) || 0,
      unidade: i.unidade || 'UN',
      preco_unitario_estimado: i.preco_unitario ?? null,
      observacao: i.observacao || ''
    })) || []
  );
}
