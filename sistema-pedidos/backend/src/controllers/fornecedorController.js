import { listarPossiveisDuplicados, mesclarFornecedores } from '../services/fornecedorService.js';
import { query } from '../db.js';
import { auditLog } from '../utils/audit.js';

export async function getFornecedores(req, res) {
  const result = await query('SELECT * FROM fornecedores WHERE mesclado_em IS NULL ORDER BY nome_canonico');
  res.json(result.rows);
}

export async function getFornecedoresDuplicados(req, res) {
  const suspeitos = await listarPossiveisDuplicados();
  res.json(suspeitos);
}

export async function postMerge(req, res) {
  try {
    const { primaryId, secondaryId } = req.body;
    if (!primaryId || !secondaryId) return res.status(400).json({ error: 'Informe primaryId e secondaryId' });
    await mesclarFornecedores(primaryId, secondaryId);
    await auditLog({ acao: 'MERGE_FORNECEDOR', objeto_tipo: 'fornecedor', objeto_id: `${secondaryId}->${primaryId}`, usuario_email: req.user?.email });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
