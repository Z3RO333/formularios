import { Router } from 'express';
import { getFornecedores, getFornecedoresDuplicados, postMerge } from '../controllers/fornecedorController.js';
import { authenticate, requireRole } from '../services/security.js';

const router = Router();

router.get('/', authenticate, requireRole('GESTOR', 'FINANCEIRO'), getFornecedores);
router.get('/possiveis-duplicados', authenticate, requireRole('GESTOR', 'FINANCEIRO'), getFornecedoresDuplicados);
router.post('/merge', authenticate, requireRole('GESTOR', 'FINANCEIRO'), postMerge);

export default router;
