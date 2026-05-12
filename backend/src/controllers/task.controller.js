import { prisma } from '../lib/prisma.js';
import { getIo } from '../lib/io.js';
import { notifyUsers, notifyUser } from '../socket/socket.js';

const MAINTENANCE_TYPE = 'Manutenção';

const MAINTENANCE_STATUS_LABELS = {
  solicitacao_aberta:        'Solicitação Aberta',
  em_orcamento:              'Em Orçamento',
  aguardando_aprovacao:      'Aguardando Aprovação',
  compra_pecas:              'Compra de Peças',
  aguardando_entrega_pecas:  'Aguardando Entrega de Peças',
  em_manutencao:             'Em Manutenção',
  finalizado:                'Finalizado',
};

const TASK_INCLUDE = {
  from: { select: { id: true, name: true, initials: true, color: true, role: true } },
  recipients: { include: { user: { select: { id: true, name: true, initials: true, color: true, role: true } } } },
  comments: { include: { user: { select: { id: true, name: true, initials: true, color: true } } }, orderBy: { createdAt: 'asc' } },
  history: { orderBy: { createdAt: 'desc' } },
  views: { include: { user: { select: { id: true, name: true, initials: true } } } },
  equipment: { select: { id: true, name: true, code: true, type: true, status: true } },
};

function canViewTask(task, userId, user) {
  if (user.isAdmin || user.isManager) return true;
  if (task.fromId === userId) return true;
  return task.recipients.some(r => r.userId === userId);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return null;
  return Math.max(0, Math.round((e - s) / 86400000));
}

function getStageTimings(task) {
  const createdAt = parseDate(task.createdAt);
  const now = new Date();
  const stages = [
    {
      key: 'solicitacao_aberta',
      label: 'Solicitação',
      start: createdAt,
      end: parseDate(task.budgetRequestedAt),
    },
    {
      key: 'em_orcamento',
      label: 'Orçamento',
      start: parseDate(task.budgetRequestedAt),
      end: parseDate(task.budgetApprovedAt),
    },
    {
      key: 'aguardando_aprovacao',
      label: 'Aprovação',
      start: parseDate(task.budgetRequestedAt),
      end: parseDate(task.budgetApprovedAt),
    },
    {
      key: 'compra_pecas',
      label: 'Compra de Peças',
      start: parseDate(task.budgetApprovedAt),
      end: parseDate(task.partsPurchasedAt),
    },
    {
      key: 'aguardando_entrega_pecas',
      label: 'Entrega de Peças',
      start: parseDate(task.partsPurchasedAt),
      end: parseDate(task.partsDeliveredAt),
    },
    {
      key: 'em_manutencao',
      label: 'Manutenção',
      start: parseDate(task.maintenanceStartedAt),
      end: parseDate(task.maintenanceFinishedAt),
    },
    {
      key: 'finalizado',
      label: 'Finalizado',
      start: parseDate(task.maintenanceFinishedAt),
      end: parseDate(task.deliveryDate),
    },
  ];

  return stages.map(stage => ({
    ...stage,
    days: stage.start && stage.end ? diffDays(stage.start, stage.end) : null,
    active: task.maintenanceStatus === stage.key,
    label: stage.label,
  }));
}

function getTotalStoppedDays(task) {
  const stages = [
    { start: task.budgetRequestedAt, end: task.budgetApprovedAt },
    { start: task.partsRequestedAt, end: task.partsPurchasedAt },
    { start: task.partsPurchasedAt, end: task.partsDeliveredAt },
  ];
  return stages.reduce((sum, period) => {
    const days = diffDays(period.start, period.end);
    return sum + (days ?? 0);
  }, 0);
}

function getBottleneck(task) {
  const isMaintenance = task.requestType === MAINTENANCE_TYPE || !task.requestType;
  if (!isMaintenance || !task.maintenanceStatus) return null;
  const current = task.maintenanceStatus;
  const labels = {
    aguardando_aprovacao: 'MANUTENÇÃO PARADA EM APROVAÇÃO',
    aguardando_entrega_pecas: 'MANUTENÇÃO PARADA NA ENTREGA DE PEÇAS',
    compra_pecas: 'MANUTENÇÃO PARADA NA COMPRA DE PEÇAS',
  };
  const severity = ['aguardando_aprovacao', 'aguardando_entrega_pecas'].includes(current) ? 'high' : 'medium';
  return {
    stage: current,
    message: labels[current] || MAINTENANCE_STATUS_LABELS[current] || 'Fluxo de manutenção em andamento',
    severity,
  };
}

function enrichTask(task) {
  const isMaintenance = task.requestType === MAINTENANCE_TYPE || !task.requestType;
  const summary = isMaintenance ? {
    maintenanceStatus: task.maintenanceStatus,
    maintenanceStatusLabel: MAINTENANCE_STATUS_LABELS[task.maintenanceStatus] || task.maintenanceStatus,
    stageTimings: getStageTimings(task),
    totalStoppedDays: getTotalStoppedDays(task),
    bottleneck: getBottleneck(task),
    totalMaintenanceDays: task.maintenanceFinishedAt ? diffDays(task.createdAt, task.maintenanceFinishedAt) : null,
  } : null;
  return { ...task, maintenanceSummary: summary };
}

async function enrichTasks(tasks) {
  return tasks.map(enrichTask);
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
    res.json(await enrichTasks(refreshed));
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
    res.json(enrichTask(refreshed));
  } catch (err) { next(err); }
}

async function syncEquipmentStatus(equipmentId) {
  if (!equipmentId) return;
  const activeCount = await prisma.task.count({
    where: { equipmentId, status: { notIn: ['concluida', 'cancelada'] } },
  });
  const hasActiveMaintenanceOS = await prisma.task.count({
    where: { equipmentId, maintenanceStatus: 'em_manutencao' },
  });
  let newStatus = 'operando';
  if (hasActiveMaintenanceOS > 0) newStatus = 'em_manutencao';
  else if (activeCount > 0) newStatus = 'operando';
  await prisma.equipment.update({ where: { id: equipmentId }, data: { status: newStatus } });
}

export async function createTask(req, res, next) {
  try {
    const { title, description, priority, category, dueDate, recipientIds, requestType, equipmentId } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });

    const ids = Array.isArray(recipientIds) && recipientIds.length > 0 ? recipientIds : [req.user.id];
    const isMaintenance = requestType === MAINTENANCE_TYPE;
    const eqId = equipmentId ? parseInt(equipmentId) : null;

    const task = await prisma.task.create({
      data: {
        title: title.trim(), description, priority: priority || 'media',
        category: category || 'manutencao',
        requestType: requestType || MAINTENANCE_TYPE,
        status: 'nao_visualizada',
        maintenanceStatus: isMaintenance ? 'solicitacao_aberta' : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalStoppedDays: 0,
        fromId: req.user.id,
        equipmentId: eqId,
        recipients: { create: ids.map(uid => ({ userId: uid })) },
        history:    { create: [{ action: `Criada por ${req.user.name}` }] },
      },
      include: TASK_INCLUDE,
    });

    if (eqId) await syncEquipmentStatus(eqId);

    const notifTitle = isMaintenance
      ? `[OS] Nova OS de manutenção: ${task.title}`
      : `Nova tarefa: ${task.title}`;
    for (const uid of ids) {
      if (uid === req.user.id) continue;
      await prisma.notification.create({
        data: { title: notifTitle, body: task.description || '', type: 'task', userId: uid, taskId: task.id },
      });
      notifyUser(getIo(), uid, 'notification:new', { title: notifTitle, taskId: task.id });
      notifyUser(getIo(), uid, 'task:new', enrichTask(task));
    }

    res.status(201).json(enrichTask(task));
  } catch (err) { next(err); }
}

export async function updateTask(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const {
      title, description, priority, category, dueDate,
      requestType, maintenanceStatus, budgetRequestedAt, budgetApprovedAt,
      partsRequestedAt, partsPurchasedAt, partsDeliveredAt,
      maintenanceStartedAt, maintenanceFinishedAt,
      deliveryForecast, deliveryDate, supplierName, delayReason, equipmentId,
    } = req.body;

    const isMaintenance = requestType === MAINTENANCE_TYPE;
    const eqId = equipmentId !== undefined ? (equipmentId ? parseInt(equipmentId) : null) : undefined;

    const data = {
      title, description, priority, category,
      requestType: requestType || MAINTENANCE_TYPE,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      maintenanceStatus: isMaintenance ? maintenanceStatus : undefined,
      budgetRequestedAt: isMaintenance && budgetRequestedAt ? new Date(budgetRequestedAt) : undefined,
      budgetApprovedAt: isMaintenance && budgetApprovedAt ? new Date(budgetApprovedAt) : undefined,
      partsRequestedAt: isMaintenance && partsRequestedAt ? new Date(partsRequestedAt) : undefined,
      partsPurchasedAt: isMaintenance && partsPurchasedAt ? new Date(partsPurchasedAt) : undefined,
      partsDeliveredAt: isMaintenance && partsDeliveredAt ? new Date(partsDeliveredAt) : undefined,
      maintenanceStartedAt: isMaintenance && maintenanceStartedAt ? new Date(maintenanceStartedAt) : undefined,
      maintenanceFinishedAt: isMaintenance && maintenanceFinishedAt ? new Date(maintenanceFinishedAt) : undefined,
      deliveryForecast: isMaintenance && deliveryForecast ? new Date(deliveryForecast) : undefined,
      deliveryDate: isMaintenance && deliveryDate ? new Date(deliveryDate) : undefined,
      supplierName: isMaintenance ? supplierName : undefined,
      delayReason: isMaintenance ? delayReason : undefined,
      ...(eqId !== undefined ? { equipmentId: eqId } : {}),
    };

    const task = await prisma.task.update({ where: { id }, data, include: TASK_INCLUDE });

    if (eqId !== undefined) await syncEquipmentStatus(eqId);

    const uids = task.recipients.map(r => r.userId);
    notifyUsers(getIo(), uids, 'task:updated', enrichTask(task));
    res.json(enrichTask(task));
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
    const { status, maintenanceStatus } = req.body;

    const taskMeta = await prisma.task.findUnique({ where: { id }, select: { requestType: true } });
    const isMaintenance = taskMeta?.requestType === MAINTENANCE_TYPE || !taskMeta?.requestType;

    const statusData = { status, history: { create: [{ action: `Status alterado para "${status}" por ${req.user.name}` }] } };

    const now = new Date();
    if (isMaintenance && maintenanceStatus) {
      statusData.maintenanceStatus = maintenanceStatus;
      if (maintenanceStatus === 'em_orcamento') {
        statusData.budgetRequestedAt = { set: now };
      }
      if (maintenanceStatus === 'compra_pecas') {
        statusData.budgetApprovedAt = { set: now };
        statusData.partsRequestedAt = { set: now };
      }
      if (maintenanceStatus === 'aguardando_entrega_pecas') {
        statusData.partsPurchasedAt = { set: now };
      }
      if (maintenanceStatus === 'em_manutencao') {
        statusData.partsDeliveredAt = { set: now };
        statusData.maintenanceStartedAt = { set: now };
      }
      if (maintenanceStatus === 'finalizado') {
        statusData.maintenanceFinishedAt = { set: now };
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: statusData,
      include: TASK_INCLUDE,
    });

    const totalStoppedDays = getTotalStoppedDays(task);
    const updated = totalStoppedDays !== task.totalStoppedDays
      ? await prisma.task.update({ where: { id }, data: { totalStoppedDays } , include: TASK_INCLUDE })
      : task;

    if (updated.equipmentId) await syncEquipmentStatus(updated.equipmentId);

    const uids = updated.recipients.map(r => r.userId);
    notifyUsers(getIo(), [...uids, updated.fromId], 'task:updated', enrichTask(updated));
    res.json(enrichTask(updated));
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
