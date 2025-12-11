import { Router } from 'express';
import { getComprovantes, downloadComprovante } from '../controllers/comprovanteController.js';
import { authenticate, requireRole } from '../services/security.js';

const router = Router();
router.get('/', authenticate, requireRole('GESTOR', 'FINANCEIRO', 'SOLICITANTE'), getComprovantes);
router.get('/:id/download', authenticate, requireRole('GESTOR', 'FINANCEIRO', 'SOLICITANTE'), downloadComprovante);
export default router;
