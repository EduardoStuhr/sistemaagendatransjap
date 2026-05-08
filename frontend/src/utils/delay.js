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
  none: {
    border: '', text: '', badge: '', label: '',
    cardBg: '', barColor: null, barW: 'w-1', cardShadow: null, animate: false,
  },
  low: {
    border:      'border-warning/60',
    text:        'text-warning',
    badge:       'bg-warning/25 text-warning font-semibold',
    label:       'Atrasada',
    cardBg:      'bg-warning/[.06]',
    barColor:    '#d29922',
    barW:        'w-1.5',
    cardShadow:  null,
    animate:     false,
  },
  medium: {
    border:      'border-orange/70',
    text:        'text-orange',
    badge:       'bg-orange/30 text-orange font-semibold',
    label:       'Atrasada',
    cardBg:      'bg-orange/[.07]',
    barColor:    '#db6d28',
    barW:        'w-1.5',
    cardShadow:  null,
    animate:     false,
  },
  high: {
    border:      'border-danger/80',
    text:        'text-danger',
    badge:       'bg-danger/35 text-danger font-semibold',
    label:       'Muito atrasada',
    cardBg:      'bg-danger/[.08]',
    barColor:    '#f85149',
    barW:        'w-2',
    cardShadow:  '0 0 0 1px #f8514966',
    animate:     false,
  },
  critical: {
    border:      'border-danger',
    text:        'text-danger',
    badge:       'bg-danger/40 text-danger font-bold',
    label:       'Urgente — atrasada',
    cardBg:      'bg-danger/10',
    barColor:    '#f85149',
    barW:        'w-2',
    cardShadow:  '0 0 0 1px #f85149, 0 0 18px 4px #f8514955',
    animate:     true,
  },
};
