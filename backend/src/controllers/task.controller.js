import { prisma } from '../lib/prisma.js';
import { getIo } from '../lib/io.js';
import { notifyUsers, notifyUser } from '../socket/socket.js';

const TASK_INCLUDE = {
  from: { select: { id: true, name: true, initials: true, color: true, role: true } },
  recipients: { include: { user: { select: { id: true, name: true, initials: true, color: true, role: true } } } },
  comments: { include: { user: { select: { id: true, name: true, initials: true, color: true } } }, orderBy: { createdAt: 'asc' } },
  history: { orderBy: { createdAt: 'desc' } },
  views: { include: { user: { select: { id: true, name: true, initials: true } } } },
};

function canViewTask(task, userId, user) {
  if (user.isAdmin || user.isManager) return true;
  if (task.fromId === userId) return true;
  return task.recipients.some(r => r.userId === userId);
}

export async function listTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const user   = req.user;

    const where = (user.isAdmin || user.isManager)
      ? {}
      : {
          OR: [
            { fromId: userId },
            { recipients: { some: { userId } } },
          ],
        };

    const tasks = await prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    // Mark task as viewed if recipient opens list
    for (const task of tasks) {
      const alreadyViewed = task.views.some(v => v.userId === userId);
      if (!alreadyViewed && task.recipients.some(r => r.userId === userId)) {
        await prisma.taskView.upsert({
          where: { taskId_userId: { taskId: task.id, userId } },
          create: { taskId: task.id, userId },
          update: {},
        });
        if (task.status === 'nao_visualizada') {
          await prisma.task.update({ where: { id: task.id }, data: { status: 'visualizada' } });
          await prisma.taskHistory.create({ data: { taskId: task.id, action: `Visualizada por ${req.user.name}` } });
        }
      }
    }

    const refreshed = await prisma.task.findMany({ where, include: TASK_INCLUDE, orderBy: { createdAt: 'desc' } });
    res.json(refreshed);
  } catch (err) { next(err); }
}

export async function getTask(req, res, next) {
  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(req.params.id) }, include: TASK_INCLUDE });
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (!canViewTask(task, req.user.id, req.user)) return res.status(403).json({ error: 'Sem permissão' });

    const alreadyViewed = task.views.some(v => v.userId === req.user.id);
    if (!alreadyViewed) {
      await prisma.taskView.create({ data: { taskId: task.id, userId: req.user.id } });
      if (task.status === 'nao_visualizada') {
        await prisma.task.update({ where: { id: task.id }, data: { status: 'visualizada' } });
        await prisma.taskHistory.create({ data: { taskId: task.id, action: `Visualizada por ${req.user.name}` } });
      }
    }

    const refreshed = await prisma.task.findUnique({ where: { id: task.id }, include: TASK_INCLUDE });
    res.json(refreshed);
  } catch (err) { next(err); }
}

export async function createTask(req, res, next) {
  try {
    const { title, description, priority, category, dueDate, recipientIds } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });

    const ids = Array.isArray(recipientIds) && recipientIds.length > 0 ? recipientIds : [req.user.id];

    const task = await prisma.task.create({
      data: {
        title: title.trim(), description, priority: priority || 'media',
        category: category || 'manutencao',
        status: 'nao_visualizada',
        dueDate: dueDate ? new Date(dueDate) : null,
        fromId: req.user.id,
        recipients: { create: ids.map(uid => ({ userId: uid })) },
        history:    { create: [{ action: `Criada por ${req.user.name}` }] },
      },
      include: TASK_INCLUDE,
    });

    // Notify recipients via socket
    const notifTitle = `Nova tarefa: ${task.title}`;
    for (const uid of ids) {
      if (uid === req.user.id) continue;
      await prisma.notification.create({
        data: { title: notifTitle, body: task.description || '', type: 'task', userId: uid, taskId: task.id },
      });
      notifyUser(getIo(), uid, 'notification:new', { title: notifTitle, taskId: task.id });
      notifyUser(getIo(), uid, 'task:new', task);
    }

    res.status(201).json(task);
  } catch (err) { next(err); }
}

export async function updateTask(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { title, description, priority, category, dueDate } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: { title, description, priority, category, dueDate: dueDate ? new Date(dueDate) : undefined },
      include: TASK_INCLUDE,
    });

    const uids = task.recipients.map(r => r.userId);
    notifyUsers(getIo(), uids, 'task:updated', task);
    res.json(task);
  } catch (err) { next(err); }
}

export async function deleteTask(req, res, next) {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Tarefa removida' });
  } catch (err) { next(err); }
}

export async function changeStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        history: { create: [{ action: `Status alterado para "${status}" por ${req.user.name}` }] },
      },
      include: TASK_INCLUDE,
    });

    const uids = task.recipients.map(r => r.userId);
    notifyUsers(getIo(), [...uids, task.fromId], 'task:updated', task);
    res.json(task);
  } catch (err) { next(err); }
}

export async function addComment(req, res, next) {
  try {
    const id   = parseInt(req.params.id);
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comentário vazio' });

    await prisma.comment.create({ data: { text: text.trim(), taskId: id, userId: req.user.id } });
    await prisma.taskHistory.create({ data: { taskId: id, action: `Comentário adicionado por ${req.user.name}` } });

    const task = await prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE });
    const uids = task.recipients.map(r => r.userId);
    notifyUsers(getIo(), [...uids, task.fromId], 'task:updated', task);

    for (const uid of uids) {
      if (uid === req.user.id) continue;
      await prisma.notification.create({
        data: { title: 'Novo comentário', body: `${req.user.name}: ${text.trim().substring(0, 60)}`, type: 'comment', userId: uid, taskId: id },
      });
      notifyUser(getIo(), uid, 'notification:new', { title: 'Novo comentário', taskId: id });
    }

    res.json(task);
  } catch (err) { next(err); }
}

export async function addCobrar(req, res, next) {
  try {
    const id   = parseInt(req.params.id);
    const task = await prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE });
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    await prisma.taskHistory.create({ data: { taskId: id, action: `⚠️ Cobrança enviada por ${req.user.name}` } });

    const uids = task.recipients.map(r => r.userId);
    for (const uid of uids) {
      if (uid === req.user.id) continue;
      await prisma.notification.create({
        data: { title: '⚠️ Cobrança de atualização', body: `${req.user.name} solicita atualização urgente em: ${task.title}`, type: 'cobrar', userId: uid, taskId: id },
      });
      notifyUser(getIo(), uid, 'notification:new', { title: '⚠️ Cobrança de atualização', taskId: id });
    }

    res.json({ message: 'Cobrança enviada' });
  } catch (err) { next(err); }
}
