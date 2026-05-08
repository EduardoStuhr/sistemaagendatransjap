import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function fmtDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? parseISO(d) : d;
  if (!isValid(dt)) return '—';
  return format(dt, 'dd/MM/yyyy', { locale: ptBR });
}

export function fmtDatetime(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? parseISO(d) : d;
  if (!isValid(dt)) return '—';
  return format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function fmtRelative(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? parseISO(d) : d;
  if (!isValid(dt)) return '—';
  return formatDistanceToNow(dt, { addSuffix: true, locale: ptBR });
}

export const STATUS_LABELS = {
  nao_visualizada: 'Não visualizada',
  visualizada:     'Visualizada',
  em_andamento:    'Em andamento',
  aguardando_peca: 'Aguardando peça',
  pausada:         'Pausada',
  concluida:       'Concluída',
  cancelada:       'Cancelada',
};

export const STATUS_STYLES = {
  nao_visualizada: { dot: 'bg-base-200',    bg: 'bg-base-200/10',    text: 'text-base-100' },
  visualizada:     { dot: 'bg-brand-light', bg: 'bg-brand-light/10', text: 'text-brand-light' },
  em_andamento:    { dot: 'bg-warning',     bg: 'bg-warning/10',     text: 'text-warning' },
  aguardando_peca: { dot: 'bg-orange',      bg: 'bg-orange/10',      text: 'text-orange' },
  pausada:         { dot: 'bg-purple',      bg: 'bg-purple/10',      text: 'text-purple' },
  concluida:       { dot: 'bg-success',     bg: 'bg-success/10',     text: 'text-success' },
  cancelada:       { dot: 'bg-danger',      bg: 'bg-danger/10',      text: 'text-danger' },
};

export const PRIORITY_LABELS = {
  baixa:   'Baixa',
  media:   'Média',
  alta:    'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
};

export const PRIORITY_STYLES = {
  baixa:   { bg: 'bg-base-200/15',  text: 'text-base-100',   border: 'border-base-200/30' },
  media:   { bg: 'bg-brand/15',     text: 'text-brand-light', border: 'border-brand/30' },
  alta:    { bg: 'bg-warning/15',   text: 'text-warning',     border: 'border-warning/30' },
  urgente: { bg: 'bg-orange/15',    text: 'text-orange',      border: 'border-orange/30' },
  critica: { bg: 'bg-danger/15',    text: 'text-danger',      border: 'border-danger/30' },
};

export const CATEGORY_LABELS = {
  manutencao: 'Manutenção',
  solicitacao: 'Solicitação',
  aviso:      'Aviso',
  reuniao:    'Reunião',
  pecas:      'Peças',
  treinamento:'Treinamento',
};
