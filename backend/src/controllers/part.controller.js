import { prisma } from '../lib/prisma.js';

export async function listParts(_req, res, next) {
  try {
    const parts = await prisma.part.findMany({ orderBy: { name: 'asc' } });
    res.json(parts);
  } catch (err) { next(err); }
}

export async function createPart(req, res, next) {
  try {
    const { name, code, description, quantity, unit, location, minStock, supplier } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

    const part = await prisma.part.create({
      data: {
        name: name.trim(),
        code:        code?.trim()        || null,
        description: description?.trim() || null,
        quantity:    parseInt(quantity)  || 0,
        unit:        unit                || 'un',
        location:    location?.trim()   || null,
        minStock:    parseInt(minStock)  || 0,
        supplier:    supplier?.trim()   || null,
      },
    });
    res.status(201).json(part);
  } catch (err) { next(err); }
}

export async function updatePart(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { name, code, description, quantity, unit, location, minStock, supplier } = req.body;

    const part = await prisma.part.update({
      where: { id },
      data: {
        name:        name?.trim(),
        code:        code?.trim()        || null,
        description: description?.trim() || null,
        quantity:    quantity !== undefined ? parseInt(quantity) : undefined,
        unit,
        location:    location?.trim()   || null,
        minStock:    minStock !== undefined ? parseInt(minStock) : undefined,
        supplier:    supplier?.trim()   || null,
      },
    });
    res.json(part);
  } catch (err) { next(err); }
}

export async function deletePart(req, res, next) {
  try {
    await prisma.part.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Peça removida' });
  } catch (err) { next(err); }
}
