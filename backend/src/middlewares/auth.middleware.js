import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function adminOnly(req, res, next) {
  if (!req.user?.isAdmin && !req.user?.isManager) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}
