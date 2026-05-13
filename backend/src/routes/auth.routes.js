import { Router } from 'express';
import { login, me, updateProfile, updateColor } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/login',        login);
authRoutes.get('/me',            authMiddleware, me);
authRoutes.put('/profile',       authMiddleware, updateProfile);
authRoutes.put('/profile/color', authMiddleware, updateColor);
