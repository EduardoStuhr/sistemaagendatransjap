export function isMaintenanceTask(task) {
  return (
    task.requestType === 'Manutenção' ||
    task.category === 'manutencao' ||
    task.category === 'pecas' ||
    task.equipmentId != null
  );
}

export function isAgendaTask(task) {
  return !isMaintenanceTask(task);
}

export function splitTasks(tasks) {
  const agenda = [];
  const maintenance = [];
  for (const t of tasks) {
    if (isMaintenanceTask(t)) maintenance.push(t);
    else agenda.push(t);
  }
  return { agenda, maintenance };
}
