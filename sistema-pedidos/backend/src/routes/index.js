import { Router } from 'express';
import pedidoRoutes from './pedidos.js';
import fornecedorRoutes from './fornecedores.js';
import comprovanteRoutes from './comprovantes.js';

const router = Router();
router.use('/pedidos', pedidoRoutes);
router.use('/fornecedores', fornecedorRoutes);
router.use('/comprovantes', comprovanteRoutes);
export default router;
