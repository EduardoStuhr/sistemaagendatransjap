import { differenceInDays, parseISO, isValid } from 'date-fns';

export function getDelayDays(task) {
  if (!task.dueDate) return 0;
  if (['concluida', 'cancelada'].includes(task.status)) return 0;
  const due = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
  if (!isValid(due)) return 0;
  const diff = differenceInDays(new Date(), due);
  return diff > 0 ? diff : 0;
}

export function getDelayLevel(days) {
  if (days >= 7) return 'critical';
  if (days >= 5) return 'high';
  if (days >= 3) return 'medium';
  if (days >= 2) return 'low';
  return 'none';
}

export const DELAY_STYLES = {
  none:     { border: '', text: '', badge: '', label: '' },
  low:      { border: 'border-warning/50',  text: 'text-warning',  badge: 'bg-warning/20 text-warning',  label: 'Atrasada' },
  medium:   { border: 'border-orange/60',   text: 'text-orange',   badge: 'bg-orange/20 text-orange',    label: 'Atrasada' },
  high:     { border: 'border-danger/70',   text: 'text-danger',   badge: 'bg-danger/20 text-danger',    label: 'Muito atrasada' },
  critical: { border: 'border-danger',      text: 'text-danger',   badge: 'bg-danger/20 text-danger',    label: 'Urgente — atrasada', animate: true },
};
