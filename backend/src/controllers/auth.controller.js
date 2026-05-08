import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

function generateInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

function safeUser(user) {
  const { password: _, ...safe } = user;
  return safe;
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

    const lowerName = name.trim().toLowerCase();
    const allUsers  = await prisma.user.findMany();
    const user      = allUsers.find(u => u.name.toLowerCase() === lowerName);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    if (!user.active) return res.status(403).json({ error: 'Conta desativada' });

    res.json({ token: signToken(user.id), user: safeUser(user) });
  } catch (err) { next(err); }
}

// GET /api/auth/me
export async function me(req, res) {
  res.json(safeUser(req.user));
}

// PUT /api/auth/profile
export async function updateProfile(req, res, next) {
  try {
    const { name, role, currentPassword, newPassword } = req.body;
    const data = {};

    if (name?.trim()) {
      data.name     = name.trim();
      data.initials = generateInitials(name.trim());
    }

    if (role?.trim()) data.role = role.trim();

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Senha atual obrigatória para alterar a senha' });
      const valid = await bcrypt.compare(currentPassword, req.user.password);
      if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.json(safeUser(updated));
  } catch (err) { next(err); }
}

// PUT /api/auth/profile/color
export async function updateColor(req, res, next) {
  try {
    const { color } = req.body;
    if (!color) return res.status(400).json({ error: 'Cor obrigatória' });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { color },
    });
    res.json(safeUser(updated));
  } catch (err) { next(err); }
}
