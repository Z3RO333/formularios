import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitiza HTML para prevenir XSS
 * Remove scripts maliciosos e atributos perigosos
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}

/**
 * Sanitiza texto simples (remove HTML completamente)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitiza objeto recursivamente
 * Remove tags HTML de todas as strings no objeto
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as any;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item)
          : typeof item === 'string'
          ? sanitizeText(item)
          : item
      ) as any;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
}

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  // Remove caracteres perigosos mas mantém formato de email
  return sanitized.replace(/[<>;"']/g, '');
}

/**
 * Valida e sanitiza CNPJ
 */
export function sanitizeCNPJ(cnpj: string): string {
  // Remove tudo exceto números, pontos, traços e barra
  return cnpj.replace(/[^\d.\-\/]/g, '');
}

/**
 * Escape para SQL LIKE (previne SQL injection em pattern matching)
 * Nota: O Supabase já previne SQL injection, mas isso é uma camada extra
 */
export function escapeSqlLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

/**
 * Valida UUID (formato correto)
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Remove caracteres de controle perigosos
 */
export function removeControlCharacters(str: string): string {
  // Remove caracteres de controle exceto newline, carriage return e tab
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Limita tamanho de string (previne ataques de buffer)
 */
export function limitString(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Sanitiza nome de arquivo (remove path traversal)
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal e caracteres especiais
  return filename
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/\.\./g, '') // Remove ..
    .replace(/[<>:"|?*]/g, '') // Remove caracteres inválidos no Windows
    .trim();
}

/**
 * Valida MIME type contra lista de permitidos
 */
export function isAllowedMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Detecta possíveis tentativas de SQL injection (detecção básica)
 */
export function containsSqlInjection(str: string): boolean {
  const sqlKeywords = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|\bOR\b.*=|1=1)/gi
  ];

  return sqlKeywords.some(regex => regex.test(str));
}

/**
 * Detecta possíveis tentativas de XSS (detecção básica)
 */
export function containsXSS(str: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  return xssPatterns.some(regex => regex.test(str));
}

/**
 * Middleware de sanitização completa para dados de entrada
 */
export function secureSanitize<T extends Record<string, any>>(data: T): T {
  const sanitized = sanitizeObject(data);

  // Verificar cada string por SQL injection e XSS
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      if (containsSqlInjection(value)) {
        console.warn(`Possível SQL injection detectado no campo: ${key}`);
      }
      if (containsXSS(value)) {
        console.warn(`Possível XSS detectado no campo: ${key}`);
      }
    }
  }

  return sanitized;
}

/**
 * Configuração de Content Security Policy para Next.js
 */
export const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://*.n8n.cloud;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();
