import { listarComprovantes, salvarComprovantes } from '../services/comprovanteService.js';
import fs from 'fs';
import path from 'path';
import { query } from '../db.js';
import { config } from '../config/env.js';
import { auditLog } from '../utils/audit.js';

export async function uploadComprovante(req, res) {
  try {
    const { id_pedido, id_fornecedor, competencia_ano_mes } = req.body;
    if (!id_pedido || !id_fornecedor) return res.status(400).json({ error: 'id_pedido e id_fornecedor são obrigatórios' });
    const saved = await salvarComprovantes({ files: req.files, id_pedido, id_fornecedor, competencia_ano_mes });
    await auditLog({ acao: 'UPLOAD_COMPROVANTE', objeto_tipo: 'pedido', objeto_id: id_pedido, usuario_email: req.user?.email, detalhes: { qtd: saved.length } });
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getComprovantes(req, res) {
  try {
    // RLS em nível de app: solicitante só vê os próprios (via email do pedido).
    const filtros = { ...req.query };
    if (req.user?.role === 'SOLICITANTE') {
      filtros.solicitante_email = req.user.email;
    }
    const data = await listarComprovantes(filtros);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Download protegido: verifica permissão antes de entregar o arquivo.
export async function downloadComprovante(req, res) {
  try {
    const { id } = req.params;
    const result = await query('SELECT ac.*, p.solicitante_email FROM arquivos_comprovantes ac JOIN pedidos p ON p.id_pedido = ac.id_pedido WHERE ac.id_arquivo=$1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Arquivo não encontrado' });
    const file = result.rows[0];

    // Autorização: gestor/financeiro pode tudo; solicitante só se for dele.
    if (req.user?.role === 'SOLICITANTE' && req.user.email !== file.solicitante_email) {
      return res.status(403).json({ error: 'Sem permissão para este comprovante' });
    }

    const storagePath = path.join(config.storageDir, file.storage_key);
    if (!storagePath || !fs.existsSync(storagePath) || !storagePath.startsWith(config.storageDir)) {
      return res.status(410).json({ error: 'Arquivo indisponível' });
    }

    res.setHeader('Content-Type', file.content_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=\"${path.basename(file.nome_arquivo_original || 'comprovante')}\"`);
    await auditLog({ acao: 'DOWNLOAD_COMPROVANTE', objeto_tipo: 'arquivo', objeto_id: file.id_arquivo, usuario_email: req.user?.email, detalhes: { pedido: file.id_pedido } });
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
