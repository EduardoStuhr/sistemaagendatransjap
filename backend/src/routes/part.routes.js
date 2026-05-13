import { Router } from 'express';
import { listParts, createPart, updatePart, deletePart } from '../controllers/part.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const partRoutes = Router();

partRoutes.use(authMiddleware);
partRoutes.get('/',     listParts);
partRoutes.post('/',    createPart);
partRoutes.put('/:id',  updatePart);
partRoutes.delete('/:id', deletePart);
