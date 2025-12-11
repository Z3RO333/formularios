import { authFetch } from './authFetch';
import type { ImportPdfResponse } from './types';

// Chama o webhook do n8n via API interna para importar itens de um PDF.
export async function importarItensDoPdf(pedidoId: string, file: File): Promise<ImportPdfResponse> {
  const form = new FormData();
  form.append('pedido_id', pedidoId);
  form.append('data', file);

  const res = await authFetch(`/api/pedidos/${pedidoId}/import-pdf`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg || 'Falha ao importar PDF');
  }

  return (await res.json()) as ImportPdfResponse;
}

async function safeMessage(res: Response) {
  try {
    const j = await res.json();
    return j.error || j.message;
  } catch (e) {
    return res.statusText;
  }
}
