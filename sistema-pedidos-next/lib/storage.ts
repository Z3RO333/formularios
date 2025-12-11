import { supabaseAdmin } from './supabaseAdmin';

export async function uploadAnexos({ files, fornecedorId, pedidoId, competencia }: { files: File[]; fornecedorId: string; pedidoId: string; competencia: string; }) {
  const uploads: any[] = [];
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const path = `comprovantes/${competencia}/${fornecedorId}/${pedidoId}/${file.name}`;
    const { error } = await supabaseAdmin.storage.from(process.env.SUPABASE_STORAGE_BUCKET as string).upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true
    });
    if (error) throw error;
    uploads.push({ path, file });
  }
  return uploads;
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(process.env.SUPABASE_STORAGE_BUCKET as string).createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
