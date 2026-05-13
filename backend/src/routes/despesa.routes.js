import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { uploadPlanilha, listar, remover, removerLote, historico } from '../controllers/despesa.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const despesaRoutes = Router();

despesaRoutes.use(authMiddleware);

despesaRoutes.post('/upload',   upload.single('file'), uploadPlanilha);
despesaRoutes.get('/',          listar);
despesaRoutes.get('/historico', historico);
despesaRoutes.delete('/lote',   removerLote);
despesaRoutes.delete('/:id',    remover);
