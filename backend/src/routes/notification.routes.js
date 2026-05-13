import { Router } from 'express';
import { listNotifications, markRead, markAllRead } from '../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);
notificationRoutes.get('/',         listNotifications);
notificationRoutes.patch('/:id',    markRead);
notificationRoutes.patch('/',       markAllRead);
