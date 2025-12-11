import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 4000,
  storageDir: process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage/comprovantes'),
  db: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true'
  },
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:3000']
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  },
  uploads: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024), // 10MB
    allowedMime: (process.env.ALLOWED_MIME || 'application/pdf,image/png,image/jpeg').split(',').map(m => m.trim())
  },
  matching: {
    similaridadeAceite: Number(process.env.MATCH_THRESHOLD || 0.85),
    similaridadeSuspeita: Number(process.env.MATCH_DUP_THRESHOLD || 0.8)
  }
};
