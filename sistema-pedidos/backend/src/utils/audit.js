import { query } from '../db.js';

// Registra ações sensíveis para auditoria (download, merge, aprovação, recusa, criação).
export async function auditLog({ acao, objeto_tipo, objeto_id, usuario_email, detalhes }) {
  try {
    await query(
      'INSERT INTO audit_logs (acao, objeto_tipo, objeto_id, usuario_email, detalhes) VALUES ($1,$2,$3,$4,$5)',
      [acao, objeto_tipo || null, objeto_id || null, usuario_email || null, detalhes ? JSON.stringify(detalhes) : null]
    );
  } catch (err) {
    // Não quebra fluxo principal; apenas loga em console se falhar.
    console.warn('Falha ao registrar auditoria', err.message);
  }
}
