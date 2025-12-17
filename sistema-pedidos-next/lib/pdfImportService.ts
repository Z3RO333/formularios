import { authFetch } from './authFetch';
import { mapN8nResponseToImportResult, type NormalizedImportResult } from './pedidoUtils';
import type { N8nPdfResponse } from './types';

// Chama o webhook do n8n via API interna para importar itens de um PDF e normaliza o retorno.
export async function importarItensDoPdf(pedidoId: string, file: File): Promise<NormalizedImportResult> {
  const form = new FormData();
  form.append('pedido_id', pedidoId);
  form.append('file', file);  // ✅ Corrigido: 'data' → 'file'

  console.log('📤 Enviando para API:', {
    pedidoId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const res = await authFetch(`/api/pedidos/${pedidoId}/import-pdf`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg || 'Falha ao importar PDF');
  }

  const json = (await res.json()) as N8nPdfResponse;
  return mapN8nResponseToImportResult(json);
}

async function safeMessage(res: Response) {
  try {
    const j = await res.json();
    return j.error || j.message;
  } catch (e) {
    return res.statusText;
  }
}
