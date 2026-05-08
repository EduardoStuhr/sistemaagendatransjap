import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { upload, list, download, remove } from '../controllers/attachment.controller.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/tasks/'),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024, files: 10 }, // 30 MB por arquivo, máx 10
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
});

export const attachmentRoutes = Router();

// Rotas em /api/tasks/:id/attachments
attachmentRoutes.post('/tasks/:id/attachments',    authMiddleware, uploader.array('files', 10), upload);
attachmentRoutes.get('/tasks/:id/attachments',     authMiddleware, list);

// Rotas em /api/attachments/:id
attachmentRoutes.get('/attachments/:id/download',  authMiddleware, download);
attachmentRoutes.delete('/attachments/:id',        authMiddleware, remove);
