import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Autenticação via JWT (Authorization: Bearer <token>).
 * O token deve conter { sub, email, role }. Roles: SOLICITANTE, GESTOR, FINANCEIRO.
 * Garante que o painel/comprovantes nunca sejam públicos.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token ausente' });
  const [, token] = authHeader.split(' ');
  try {
    const payload = jwt.verify(token, config.security.jwtSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Autorização baseada em perfil. Apenas roles permitidas prosseguem.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

// Atalho para rotas de aprovação/financeiro
export const authGestor = [authenticate, requireRole('GESTOR', 'FINANCEIRO')];
export const authSolicitante = [authenticate, requireRole('SOLICITANTE', 'GESTOR', 'FINANCEIRO')];
