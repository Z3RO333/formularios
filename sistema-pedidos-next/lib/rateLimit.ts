import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Store em memória (simples, para produção considere Redis)
const store: RateLimitStore = {};

// Limpar entradas expiradas periodicamente (a cada 1 hora)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, 60 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Número máximo de requisições permitidas */
  maxRequests: number;
  /** Janela de tempo em segundos */
  windowSeconds: number;
  /** Mensagem de erro personalizada */
  message?: string;
}

/**
 * Middleware de rate limiting
 *
 * @example
 * const limited = rateLimit({ maxRequests: 10, windowSeconds: 60 });
 * if (limited) return limited;
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: NextRequest, identifier?: string): NextResponse | null => {
    // Identificador único (IP ou identificador customizado)
    const key = identifier || getClientIdentifier(req);
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    // Inicializar ou recuperar dados do cliente
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return null; // Permitir requisição
    }

    // Incrementar contador
    store[key].count++;

    // Verificar se excedeu o limite
    if (store[key].count > config.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: config.message || 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
          }
        }
      );
    }

    // Requisição permitida
    return null;
  };
}

/**
 * Obter identificador único do cliente (IP ou user-agent como fallback)
 */
function getClientIdentifier(req: NextRequest): string {
  // Tentar obter IP real (considerando proxies e load balancers)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  // Adicionar user-agent para tornar mais específico
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return `${ip}-${hashString(userAgent)}`;
}

/**
 * Hash simples de string (para user-agent)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Configurações de rate limit predefinidas
 */
export const RateLimitPresets = {
  /** Rate limit estrito para criação de recursos (5 req/min) */
  strict: { maxRequests: 5, windowSeconds: 60 },

  /** Rate limit moderado para operações críticas (10 req/min) */
  moderate: { maxRequests: 10, windowSeconds: 60 },

  /** Rate limit relaxado para leitura (30 req/min) */
  relaxed: { maxRequests: 30, windowSeconds: 60 },

  /** Rate limit para autenticação (3 tentativas / 5 min) */
  auth: { maxRequests: 3, windowSeconds: 300 }
};

/**
 * Helper para criar rate limiter com preset
 */
export function createRateLimiter(preset: keyof typeof RateLimitPresets, message?: string) {
  return rateLimit({ ...RateLimitPresets[preset], message });
}
