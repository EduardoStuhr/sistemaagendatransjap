import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { taskRoutes } from './routes/task.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { partRoutes } from './routes/part.routes.js';
import { despesaRoutes } from './routes/despesa.routes.js';
import { attachmentRoutes } from './routes/attachment.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { initSocket } from './socket/socket.js';
import { setIo } from './lib/io.js';

const app = express();
const httpServer = createServer(app);

/* ── Segurança: headers HTTP ──────────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/* ── CORS ─────────────────────────────────────────── */
const allowedOrigins = config.clientUrl
  ? config.clientUrl.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Em dev permite qualquer localhost (http ou https, qualquer porta)
    if (!config.isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));

/* ── Rate limiting global ─────────────────────────── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
}));

/* ── Rate limiting específico para login ──────────── */
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  skipSuccessfulRequests: true,
}));

/* ── Body parser com limite ───────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

/* ── Socket.IO ───────────────────────────────────── */
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
setIo(io);
initSocket(io);

/* ── Rotas ───────────────────────────────────────── */
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parts',         partRoutes);
app.use('/api/despesas',      despesaRoutes);
app.use('/api',               attachmentRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: config.isProd ? 'production' : 'development' }));

/* ── 404 ─────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use(errorMiddleware);

httpServer.listen(config.port, () => {
  console.log(`🚀 Transjap API rodando em http://localhost:${config.port} [${config.isProd ? 'PRODUÇÃO' : 'desenvolvimento'}]`);
});
