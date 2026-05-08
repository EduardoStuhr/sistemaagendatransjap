import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { taskRoutes } from './routes/task.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { partRoutes } from './routes/part.routes.js';
import { despesaRoutes } from './routes/despesa.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { initSocket } from './socket/socket.js';
import { setIo } from './lib/io.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientUrl, credentials: true },
});

setIo(io);
initSocket(io);

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parts',        partRoutes);
app.use('/api/despesas',     despesaRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorMiddleware);

httpServer.listen(config.port, () => {
  console.log(`🚀 OpsAgenda API running on http://localhost:${config.port}`);
});
