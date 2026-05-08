import { STATUS_LABELS, STATUS_STYLES, PRIORITY_LABELS, PRIORITY_STYLES } from '../../utils/format.js';

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.nao_visualizada;
  return (
    <span className={`badge ${s.bg} ${s.text} border border-current/20`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES.media;
  return (
    <span className={`badge ${p.bg} ${p.text} border ${p.border}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}
