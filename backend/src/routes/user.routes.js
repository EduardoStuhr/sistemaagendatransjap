import { Router } from 'express';
import { listUsers, updateUser, deleteUser } from '../controllers/user.controller.js';
import { authMiddleware, adminOnly } from '../middlewares/auth.middleware.js';

export const userRoutes = Router();

userRoutes.use(authMiddleware);
userRoutes.get('/',        listUsers);
userRoutes.put('/:id',     adminOnly, updateUser);
userRoutes.delete('/:id',  adminOnly, deleteUser);
