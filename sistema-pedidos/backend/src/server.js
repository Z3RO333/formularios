import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from './config/env.js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

const app = express();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.cors.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting básico em rotas sensíveis
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(['/pedidos/:id/aprovar', '/pedidos/:id/recusar', '/fornecedores', '/comprovantes'], sensitiveLimiter);

// Saúde
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/', routes);

app.listen(config.port, () => console.log(`API rodando na porta ${config.port}`));
