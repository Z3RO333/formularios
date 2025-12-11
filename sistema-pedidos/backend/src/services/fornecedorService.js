import { query } from '../db.js';
import { config } from '../config/env.js';
import { normalizeName, similarity } from '../utils/normalize.js';
import { v4 as uuid } from 'uuid';

// Tenta localizar fornecedor por CNPJ, fuzzy por nome e cria se não existir.
export async function matchOrCreateFornecedor(nomeDigitado, cnpj) {
  const nomeOriginal = (nomeDigitado || '').trim();
  const nomeNorm = normalizeName(nomeOriginal);
  const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;

  // 1) CNPJ
  if (cnpjLimpo) {
    const byCnpj = await query('SELECT * FROM fornecedores WHERE cnpj = $1 AND mesclado_em IS NULL LIMIT 1', [cnpjLimpo]);
    if (byCnpj.rows.length) {
      const fornecedor = byCnpj.rows[0];
      await registrarAlias(fornecedor.id_fornecedor, nomeOriginal);
      return fornecedor;
    }
  }

  // 2) Fuzzy por nome/apelidos
  const fornecedores = await query('SELECT * FROM fornecedores WHERE mesclado_em IS NULL');
  let melhor = { score: 0, fornecedor: null };
  for (const f of fornecedores.rows) {
    const candidatos = [f.nome_canonico, ...(f.apelidos_variantes || [])];
    const scoreMax = Math.max(...candidatos.map(c => similarity(nomeNorm, normalizeName(c))));
    if (scoreMax > melhor.score) melhor = { score: scoreMax, fornecedor: f };
  }
  if (melhor.fornecedor && melhor.score >= config.matching.similaridadeAceite) {
    await registrarAlias(melhor.fornecedor.id_fornecedor, nomeOriginal);
    return melhor.fornecedor;
  }

  // 3) Não encontrado: cria
  const id_fornecedor = uuid();
  const novo = await query(
    `INSERT INTO fornecedores (id_fornecedor, nome_canonico, nome_canonico_normalizado, cnpj, apelidos_variantes, data_cadastro)
     VALUES ($1,$2,$3,$4,$5, NOW()) RETURNING *`,
    [id_fornecedor, nomeOriginal, nomeNorm, cnpjLimpo, nomeOriginal ? [nomeOriginal] : []]
  );
  return novo.rows[0];
}

export async function registrarAlias(id_fornecedor, alias) {
  if (!alias) return;
  await query(
    `UPDATE fornecedores SET apelidos_variantes = (
        SELECT ARRAY(SELECT DISTINCT UNNEST(COALESCE(apelidos_variantes, ARRAY[]::text[]) || $2))
      ) WHERE id_fornecedor = $1`,
    [id_fornecedor, alias]
  );
}

export async function listarPossiveisDuplicados() {
  const fornecedores = await query('SELECT * FROM fornecedores WHERE mesclado_em IS NULL');
  const suspeitos = [];
  for (let i = 0; i < fornecedores.rows.length; i++) {
    for (let j = i + 1; j < fornecedores.rows.length; j++) {
      const a = fornecedores.rows[i];
      const b = fornecedores.rows[j];
      const score = similarity(normalizeName(a.nome_canonico), normalizeName(b.nome_canonico));
      if (score >= config.matching.similaridadeSuspeita) suspeitos.push({ a, b, score });
    }
  }
  return suspeitos;
}

export async function mesclarFornecedores(primaryId, secondaryId) {
  // Marca fornecedor secundário como mesclado e migra apelidos; pedidos/comprovantes devem ser atualizados por FK
  const client = await query('BEGIN');
  try {
    const primary = await query('SELECT * FROM fornecedores WHERE id_fornecedor=$1', [primaryId]);
    const secondary = await query('SELECT * FROM fornecedores WHERE id_fornecedor=$1', [secondaryId]);
    if (!primary.rows.length || !secondary.rows.length) throw new Error('Fornecedor não encontrado');
    await query(
      `UPDATE fornecedores SET apelidos_variantes = (
        SELECT ARRAY(SELECT DISTINCT UNNEST(COALESCE(f.apelidos_variantes, ARRAY[]::text[]) || COALESCE($2, ARRAY[]::text[])))
      ) FROM fornecedores f WHERE fornecedores.id_fornecedor = $1 AND f.id_fornecedor = $1`,
      [primaryId, secondary.rows[0].apelidos_variantes]
    );
    await query('UPDATE fornecedores SET mesclado_em=$1 WHERE id_fornecedor=$2', [primaryId, secondaryId]);
    await query('UPDATE pedidos SET id_fornecedor=$1 WHERE id_fornecedor=$2', [primaryId, secondaryId]);
    await query('UPDATE arquivos_comprovantes SET id_fornecedor=$1 WHERE id_fornecedor=$2', [primaryId, secondaryId]);
    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }
}
