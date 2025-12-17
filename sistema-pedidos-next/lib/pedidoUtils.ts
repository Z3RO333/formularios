import { sanitizeText } from './security';
import type { ImportPdfResponse, N8nItem, N8nPdfResponse, PedidoItemInput } from './types';

export const emptyItem: PedidoItemInput = {
  descricao_item: '',
  quantidade: 1,
  unidade: '',
  fornecedor_item: '',
  preco_unitario_estimado: null,
  observacao: ''
};

export function mapPdfItensToPedido(itens?: ImportPdfResponse['itens']): PedidoItemInput[] {
  return (
    itens?.map((i) => ({
      descricao_item: i.descricao,
      quantidade: Number(i.quantidade) || 0,
      unidade: i.unidade || '',
      preco_unitario_estimado: i.preco_unitario ?? null,
      observacao: i.observacao || ''
    })) || []
  );
}

// Normaliza itens retornados pelo N8N
export function normalizeN8nItens(itens?: N8nItem[]): PedidoItemInput[] {
  if (!itens || !Array.isArray(itens)) return [];
  return itens
    .map((i) => ({
      descricao_item: sanitizeText(i.descricao || '').trim(),
      quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
      unidade: (i.unidade || '').trim(),
      preco_unitario_estimado: i.preco_unitario ?? null,
      observacao: ''
    }))
    .filter((i) => i.descricao_item);
}

export function mergeItensPedido(
  atuais: PedidoItemInput[],
  novos: PedidoItemInput[]
): PedidoItemInput[] {
  if (!atuais.length) return [...novos];
  const resultado = [...atuais];
  novos.forEach((novo) => {
    const idx = resultado.findIndex(
      (r) =>
        r.descricao_item.toLowerCase() === novo.descricao_item.toLowerCase() &&
        (r.unidade || '').toLowerCase() === (novo.unidade || '').toLowerCase()
    );
    if (idx >= 0) {
      const existente = resultado[idx];
      const quantidadeSomada = (existente.quantidade || 0) + (novo.quantidade || 0);
      resultado[idx] = { ...existente, quantidade: quantidadeSomada };
    } else {
      resultado.push(novo);
    }
  });
  return resultado;
}

export type NormalizedImportResult = {
  itens: PedidoItemInput[];
  fornecedor?: {
    nome?: string | null;
    cnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
  };
  observacoes?: string | null;
  loja_unidade?: string | null;
  raw?: N8nPdfResponse;
};

export function mapN8nResponseToImportResult(resp: N8nPdfResponse): NormalizedImportResult {
  const itens = normalizeN8nItens(resp?.itens);
  return {
    itens,
    fornecedor: resp?.fornecedor || undefined,
    observacoes: resp?.observacoes || undefined,
    loja_unidade: resp?.loja_unidade || undefined,
    raw: resp
  };
}
