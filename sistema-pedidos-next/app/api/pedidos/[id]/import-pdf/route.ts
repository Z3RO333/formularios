import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabaseServer';
import { createRateLimiter } from '@/lib/rateLimit';
import { logger, generateRequestId } from '@/lib/logger';

const N8N_IMPORT_PDF_URL = process.env.N8N_IMPORT_PDF_URL!;

// TIPAGEM DO JSON QUE O N8N DEVOLVE
type N8nItem = {
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number | null;
  preco_total: number | null;
};

type N8nFornecedor = {
  nome: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
};

type N8nDocumento = {
  numero: string | null;
  serie: string | null;
  data_emissao: string | null; // YYYY-MM-DD ou null
};

type N8nPdfResponse = {
  modelo_documento: string | null;
  fornecedor: N8nFornecedor | null;
  documento: N8nDocumento | null;
  loja_unidade: string | null;
  itens: N8nItem[];
  observacoes: string | null;
  _raw?: string;
  _erro_parse?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId();
  const pedidoId = params.id;

  logger.info(`[${requestId}] Iniciando importação de PDF para pedido ${pedidoId}`);

  if (!N8N_IMPORT_PDF_URL) {
    logger.error(`[${requestId}] N8N_IMPORT_PDF_URL não configurada`);
    return NextResponse.json(
      { error: 'N8N_IMPORT_PDF_URL não configurada' },
      { status: 500 }
    );
  }

  // ✅ AUTENTICAÇÃO OBRIGATÓRIA
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // ✅ VALIDAR QUE PEDIDO EXISTE E USUÁRIO TEM PERMISSÃO
  const { data: pedido, error: pedidoErr } = await ctx.supabase
    .from('pedidos')
    .select('id, solicitante_id, status')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  // Apenas o solicitante ou admin pode importar PDF
  const isOwner = pedido.solicitante_id === ctx.profile.id;
  const isAdmin = ['GESTOR', 'FINANCEIRO'].includes(ctx.profile.perfil);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão para importar PDF neste pedido' }, { status: 403 });
  }

  // ✅ RATE LIMITING
  const rateLimiter = createRateLimiter('strict', 'Muitas importações de PDF. Aguarde.');
  const rateLimitResponse = rateLimiter(req);
  if (rateLimitResponse) return rateLimitResponse;

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    const entries = Array.from(formData.entries());
    logger.error(`[${requestId}] Campo "file" não encontrado`, {
      campos_disponiveis: entries.map(([k]) => k)
    });
    return NextResponse.json(
      { error: 'Campo "file" obrigatório no formulário' },
      { status: 400 }
    );
  }

  logger.info(`[${requestId}] Arquivo recebido`, {
    nome: file.name,
    tamanho_bytes: file.size,
    tipo: file.type
  });

  // Monta um FormData novo pra mandar pro n8n
  const fd = new FormData();
  // o campo TEM QUE se chamar "file" (Binary Property Name = "file" no n8n)
  fd.append('file', file, file.name);
  // opcional: mandar o id do pedido pro n8n, se você quiser usar lá
  fd.append('pedido_id', pedidoId);

  let n8nRes: Response;
  try {
    logger.info(`[${requestId}] Enviando PDF para N8N`);
    n8nRes = await fetch(N8N_IMPORT_PDF_URL, {
      method: 'POST',
      body: fd
    });
  } catch (e) {
    logger.error(`[${requestId}] Erro ao chamar N8N`, { erro: e });
    return NextResponse.json(
      { error: 'Falha ao conectar no n8n' },
      { status: 502 }
    );
  }

  const rawText = await n8nRes.text();

  if (!n8nRes.ok) {
    logger.error(`[${requestId}] N8N retornou erro`, {
      status: n8nRes.status,
      tamanho_resposta: rawText.length
    });
    return NextResponse.json(
      { error: 'Falha ao processar PDF no n8n', detalhe: rawText },
      { status: 502 }
    );
  }

  let parsed: N8nPdfResponse;
  try {
    parsed = JSON.parse(rawText) as N8nPdfResponse;

    // ✅ Log seguro: apenas metadados, SEM dados sensíveis (CNPJ, email)
    logger.info(`[${requestId}] PDF processado com sucesso`, {
      modelo_documento: parsed.modelo_documento,
      tem_fornecedor: !!parsed.fornecedor,
      total_itens: parsed.itens?.length || 0,
      loja: parsed.loja_unidade
    });
  } catch (e) {
    logger.error(`[${requestId}] Erro ao parsear resposta do N8N`, {
      erro: e,
      tamanho_resposta: rawText.length
    });
    return NextResponse.json(
      {
        error: 'Resposta do n8n não é um JSON válido',
        raw: rawText
      },
      { status: 500 }
    );
  }

  // Retorna a resposta do N8N diretamente (já no formato N8nPdfResponse)
  // O pdfImportService.ts vai normalizar usando mapN8nResponseToImportResult
  logger.info(`[${requestId}] Enviando resultado para frontend`);
  return NextResponse.json(parsed);

  // 🔁 Versão avançada (opcional):
  // aqui você poderia chamar o pdfImportService pra já gravar no Supabase:
  //
  // const resultado = await importarPdfParaPedido({
  //   pedidoId,
  //   dadosImportados: parsed,
  //   usuarioId: user.id,
  // });
  // return NextResponse.json(resultado);
}
