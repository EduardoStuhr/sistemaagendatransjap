import { prisma } from '../lib/prisma.js';

const ACTIVE_TASK_STATUSES = { notIn: ['concluida', 'cancelada'] };

export async function listEquipments(req, res, next) {
  try {
    const equipments = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tasks: { where: { status: ACTIVE_TASK_STATUSES } } } },
      },
    });
    res.json(equipments);
  } catch (err) { next(err); }
}

export async function getEquipment(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            from: { select: { id: true, name: true, initials: true, color: true } },
          },
        },
        _count: { select: { tasks: { where: { status: ACTIVE_TASK_STATUSES } } } },
      },
    });
    if (!equipment) return res.status(404).json({ error: 'Equipamento não encontrado' });
    res.json(equipment);
  } catch (err) { next(err); }
}

export async function getEquipmentStats(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) return res.status(404).json({ error: 'Equipamento não encontrado' });

    const now = new Date();
    const thirtyDaysAgo  = new Date(now - 30 * 86400000);
    const ninetyDaysAgo  = new Date(now - 90 * 86400000);
    const oneYearAgo     = new Date(now - 365 * 86400000);

    const [totalTasks, last30, last90, last365] = await Promise.all([
      prisma.task.count({ where: { equipmentId: id } }),
      prisma.task.count({ where: { equipmentId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.task.count({ where: { equipmentId: id, createdAt: { gte: ninetyDaysAgo } } }),
      prisma.task.count({ where: { equipmentId: id, createdAt: { gte: oneYearAgo } } }),
    ]);

    const allTasks = await prisma.task.findMany({
      where: { equipmentId: id },
      select: { totalStoppedDays: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalStoppedDays = allTasks.reduce((s, t) => s + (t.totalStoppedDays || 0), 0);

    // MTBF: média de dias entre OSs consecutivas
    let mtbf = null;
    if (allTasks.length >= 2) {
      let gaps = 0;
      for (let i = 1; i < allTasks.length; i++) {
        gaps += (new Date(allTasks[i].createdAt) - new Date(allTasks[i - 1].createdAt)) / 86400000;
      }
      mtbf = Math.round(gaps / (allTasks.length - 1));
    }

    res.json({ totalTasks, last30, last90, last365, totalStoppedDays, mtbf });
  } catch (err) { next(err); }
}

export async function createEquipment(req, res, next) {
  try {
    const { name, code, type, brand, model, year, location, status, notes, photoUrl } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!code?.trim()) return res.status(400).json({ error: 'Código obrigatório' });

    const existing = await prisma.equipment.findUnique({ where: { code: code.trim() } });
    if (existing) return res.status(409).json({ error: 'Código já cadastrado' });

    const equipment = await prisma.equipment.create({
      data: { name: name.trim(), code: code.trim(), type, brand, model, year: year ? parseInt(year) : null, location, status: status || 'operando', notes, photoUrl },
    });
    res.status(201).json(equipment);
  } catch (err) { next(err); }
}

export async function updateEquipment(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { name, code, type, brand, model, year, location, status, notes, photoUrl } = req.body;

    if (code) {
      const existing = await prisma.equipment.findFirst({ where: { code: code.trim(), NOT: { id } } });
      if (existing) return res.status(409).json({ error: 'Código já cadastrado' });
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: { name, code, type, brand, model, year: year ? parseInt(year) : null, location, status, notes, photoUrl },
    });
    res.json(equipment);
  } catch (err) { next(err); }
}

export async function deleteEquipment(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const activeCount = await prisma.task.count({ where: { equipmentId: id, status: ACTIVE_TASK_STATUSES } });
    if (activeCount > 0) {
      return res.status(409).json({ error: `Não é possível excluir: há ${activeCount} OS(s) ativa(s) vinculada(s) a este equipamento.` });
    }
    await prisma.equipment.delete({ where: { id } });
    res.json({ message: 'Equipamento removido' });
  } catch (err) { next(err); }
}
