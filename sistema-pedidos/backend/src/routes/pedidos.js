import { Router } from 'express';
import multer from 'multer';
import { postPedido, getPedidos, getPedidoById, patchAprovar, patchRecusar } from '../controllers/pedidoController.js';
import { uploadComprovante } from '../controllers/comprovanteController.js';
import { authenticate, requireRole } from '../services/security.js';
import { config } from '../config/env.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (config.uploads.allowedMime.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Tipo de arquivo não permitido'), false);
  }
});

// Pública: criar pedido (pode ser anônimo/convidado)
router.post('/', upload.array('anexos'), postPedido);

// Autenticadas: listagem e detalhe (solicitante vê só dele; gestores/financeiro veem tudo)
router.get('/', authenticate, requireRole('GESTOR', 'FINANCEIRO', 'SOLICITANTE'), getPedidos);
router.get('/:id', authenticate, requireRole('GESTOR', 'FINANCEIRO', 'SOLICITANTE'), getPedidoById);

// Aprovar/Recusar: somente gestor/financeiro
router.patch('/:id/aprovar', authenticate, requireRole('GESTOR', 'FINANCEIRO'), patchAprovar);
router.patch('/:id/recusar', authenticate, requireRole('GESTOR', 'FINANCEIRO'), patchRecusar);

// Upload adicional de comprovantes: gestor/financeiro
router.post('/upload-comprovante', authenticate, requireRole('GESTOR', 'FINANCEIRO'), upload.array('anexos'), uploadComprovante);

export default router;
