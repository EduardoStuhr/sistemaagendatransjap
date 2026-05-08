import { prisma } from '../lib/prisma.js';

export async function listNotifications(req, res, next) {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifs);
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true },
    });
    res.json({ message: 'Marcada como lida' });
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'Todas marcadas como lidas' });
  } catch (err) { next(err); }
}
