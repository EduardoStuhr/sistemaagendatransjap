import { prisma } from '../lib/prisma.js';

export async function listUsers(_req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true, initials: true, color: true, isAdmin: true, isManager: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { name, role, isAdmin, isManager, active } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { name, role, isAdmin, isManager, active },
      select: { id: true, name: true, email: true, role: true, initials: true, color: true, isAdmin: true, isManager: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

export async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { active: false } });
    res.json({ message: 'Usuário desativado' });
  } catch (err) { next(err); }
}
