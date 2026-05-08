import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';

// POST /api/tasks/:id/attachments
export async function upload(req, res, next) {
  try {
    const taskId = parseInt(req.params.id);
    if (!req.files?.length) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { recipients: true },
    });
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    // Verifica acesso: criador, destinatário ou admin
    const isRecipient = task.recipients.some(r => r.userId === req.user.id);
    const isOwner     = task.fromId === req.user.id;
    if (!isOwner && !isRecipient && !req.user.isAdmin && !req.user.isManager) {
      return res.status(403).json({ error: 'Sem permissão para anexar arquivos nessa tarefa' });
    }

    const saved = await Promise.all(req.files.map(async (file) => {
      return prisma.taskAttachment.create({
        data: {
          taskId,
          uploadedById: req.user.id,
          fileName:    file.originalname,
          fileSize:    file.size,
          mimeType:    file.mimetype,
          storagePath: file.path,
        },
        include: { uploadedBy: { select: { name: true, color: true, initials: true } } },
      });
    }));

    res.status(201).json(saved);
  } catch (err) { next(err); }
}

// GET /api/tasks/:id/attachments
export async function list(req, res, next) {
  try {
    const taskId = parseInt(req.params.id);
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { uploadedBy: { select: { name: true, color: true, initials: true } } },
    });
    res.json(attachments);
  } catch (err) { next(err); }
}

// GET /api/attachments/:id/download
export async function download(req, res, next) {
  try {
    const att = await prisma.taskAttachment.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!att) return res.status(404).json({ error: 'Arquivo não encontrado' });
    if (!fs.existsSync(att.storagePath)) return res.status(404).json({ error: 'Arquivo removido do servidor' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.fileName)}"`);
    res.setHeader('Content-Type', att.mimeType);
    res.sendFile(path.resolve(att.storagePath));
  } catch (err) { next(err); }
}

// DELETE /api/attachments/:id
export async function remove(req, res, next) {
  try {
    const att = await prisma.taskAttachment.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!att) return res.status(404).json({ error: 'Arquivo não encontrado' });

    // Só quem fez upload, o dono da tarefa ou admin pode remover
    const task = await prisma.task.findUnique({ where: { id: att.taskId } });
    const canDelete = att.uploadedById === req.user.id || task?.fromId === req.user.id || req.user.isAdmin;
    if (!canDelete) return res.status(403).json({ error: 'Sem permissão para remover este arquivo' });

    if (fs.existsSync(att.storagePath)) fs.unlinkSync(att.storagePath);
    await prisma.taskAttachment.delete({ where: { id: att.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
