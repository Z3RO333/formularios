import { supabaseAdmin } from './supabaseAdmin';
import { sanitizeFilename, isAllowedMimeType } from './security';

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
];

// Tamanho máximo: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadAnexos({ files, fornecedorId, pedidoId, competencia }: { files: File[]; fornecedorId: string; pedidoId: string; competencia: string; }) {
  const uploads: any[] = [];

  for (const file of files) {
    // 1. Validar MIME type
    if (!isAllowedMimeType(file.type, ALLOWED_MIME_TYPES)) {
      throw new Error(`Tipo de arquivo não permitido: ${file.type}. Permitidos: PDF, imagens, Excel, Word.`);
    }

    // 2. Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo "${file.name}" excede o tamanho máximo de 10MB (${Math.round(file.size / 1024 / 1024)}MB).`);
    }

    // 3. Sanitizar nome do arquivo (remove path traversal)
    const safeFilename = sanitizeFilename(file.name);
    if (!safeFilename || safeFilename.length === 0) {
      throw new Error(`Nome de arquivo inválido: ${file.name}`);
    }

    // 4. Construir path seguro (sem usar input do usuário diretamente)
    const arrayBuffer = await file.arrayBuffer();
    const path = `comprovantes/${competencia}/${fornecedorId}/${pedidoId}/${safeFilename}`;

    // 5. Upload com validação
    const { error } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET as string)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false, // Não sobrescrever (previne race conditions)
        cacheControl: '3600',
      });

    if (error) {
      // Log sem vazar informações sensíveis
      console.error(`[STORAGE] Erro ao fazer upload: ${error.message}`);
      throw new Error(`Erro ao fazer upload do arquivo: ${safeFilename}`);
    }

    uploads.push({ path, file: { name: safeFilename, size: file.size, type: file.type } });
  }

  return uploads;
}

export async function getSignedUrl(path: string) {
  // Validar que path não contém traversal
  if (path.includes('..') || path.includes('//') || !path.startsWith('comprovantes/')) {
    throw new Error('Path inválido');
  }

  const { data, error } = await supabaseAdmin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET as string)
    .createSignedUrl(path, 60 * 5);

  if (error) {
    console.error(`[STORAGE] Erro ao gerar URL: ${error.message}`);
    throw error;
  }

  return data.signedUrl;
}
