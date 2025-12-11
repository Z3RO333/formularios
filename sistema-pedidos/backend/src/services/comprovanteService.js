import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { query } from '../db.js';
import { config } from '../config/env.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export async function salvarComprovantes({ files, id_pedido, id_fornecedor, competencia_ano_mes }) {
  if (!files?.length) return [];
  const saved = [];
  for (const file of files) {
    const storagePath = path.join(config.storageDir, competencia_ano_mes, id_fornecedor, id_pedido);
    ensureDir(storagePath);
    const storageKey = path.join(competencia_ano_mes, id_fornecedor, id_pedido, file.originalname); // caminho lógico armazenado
    const fullPath = path.join(config.storageDir, storageKey);
    fs.writeFileSync(fullPath, file.buffer);
    const id_arquivo = uuid();
    const tipo = inferTipo(file.originalname);
    const inserted = await query(
      `INSERT INTO arquivos_comprovantes (
        id_arquivo, id_pedido, id_fornecedor, tipo_documento, nome_arquivo_original,
        storage_key, tamanho_bytes, content_type, data_upload, competencia_ano_mes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9) RETURNING *`,
      [id_arquivo, id_pedido, id_fornecedor, tipo, file.originalname, storageKey, file.size, file.mimetype, competencia_ano_mes]
    );
    saved.push(inserted.rows[0]);
  }
  return saved;
}

function inferTipo(nome) {
  const lower = nome.toLowerCase();
  if (lower.includes('nf') || lower.includes('nota')) return 'NOTA_FISCAL';
  if (lower.includes('pag') || lower.includes('comp')) return 'COMPROVANTE_PAGAMENTO';
  if (lower.includes('orc')) return 'ORCAMENTO';
  return 'OUTRO';
}

export async function listarComprovantes(filtros = {}) {
  const clauses = []; const params = [];
  if (filtros.competencia) { params.push(filtros.competencia); clauses.push(`ac.competencia_ano_mes = $${params.length}`); }
  if (filtros.id_fornecedor) { params.push(filtros.id_fornecedor); clauses.push(`ac.id_fornecedor = $${params.length}`); }
  if (filtros.loja_unidade) { params.push(filtros.loja_unidade); clauses.push(`p.loja_unidade = $${params.length}`); }
  if (filtros.solicitante_email) { params.push(filtros.solicitante_email); clauses.push(`p.solicitante_email = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT ac.*, p.loja_unidade, p.descricao_detalhada, p.solicitante_email
               FROM arquivos_comprovantes ac
               JOIN pedidos p ON p.id_pedido = ac.id_pedido
               ${where}
               ORDER BY ac.data_upload DESC`;
  const result = await query(sql, params);
  return result.rows;
}
