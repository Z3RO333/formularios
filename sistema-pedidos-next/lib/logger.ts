type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Campos que devem ser mascarados nos logs
const SENSITIVE_FIELDS = ['cnpj', 'email', 'cpf', 'senha', 'token', 'password', 'authorization'];

/**
 * Mascara dados sensíveis em objetos para logging seguro
 * Exemplo: "12345678901234" → "12***34"
 */
function maskSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    // Verificar se o campo é sensível
    if (SENSITIVE_FIELDS.some(field => keyLower.includes(field))) {
      // Mascarar o valor
      if (typeof value === 'string' && value.length > 4) {
        masked[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
      } else {
        masked[key] = '***';
      }
    } else if (typeof value === 'object') {
      // Recursivamente mascarar objetos aninhados
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Função de logging segura que mascara dados sensíveis
 */
export function safeLog(level: LogLevel, message: string, data?: any) {
  // ✅ Não logar debug/info em produção (apenas errors)
  if (process.env.NODE_ENV === 'production' && level !== 'error' && level !== 'warn') {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    const safeData = maskSensitiveData(data);
    console[level](`${prefix} ${message}`, safeData);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

/**
 * Logger com request ID para correlacionar logs
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (msg: string, data?: any) =>
      safeLog('info', `[${requestId}] ${msg}`, data),
    warn: (msg: string, data?: any) =>
      safeLog('warn', `[${requestId}] ${msg}`, data),
    error: (msg: string, data?: any) =>
      safeLog('error', `[${requestId}] ${msg}`, data),
    debug: (msg: string, data?: any) =>
      safeLog('debug', `[${requestId}] ${msg}`, data)
  };
}

/**
 * Logger simples sem request ID
 */
export const logger = {
  info: (msg: string, data?: any) => safeLog('info', msg, data),
  warn: (msg: string, data?: any) => safeLog('warn', msg, data),
  error: (msg: string, data?: any) => safeLog('error', msg, data),
  debug: (msg: string, data?: any) => safeLog('debug', msg, data)
};

/**
 * Gera um request ID único para correlação de logs
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
