import { Clock, MessageSquare, AlertTriangle, Truck } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../ui/StatusBadge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { fmtDate } from '../../utils/format.js';
import { getDelayDays, getDelayLevel, DELAY_STYLES, getDueProximity, DUE_PROXIMITY_STYLES } from '../../utils/delay.js';
import { isMaintenanceTask } from '../../utils/taskFilters.js';
import { MaintenanceStepperCompact } from './MaintenanceStepper.jsx';

export function TaskCard({ task, onClick, currentUserId }) {
  const delayDays  = getDelayDays(task);
  const delayLevel = getDelayLevel(delayDays);
  const ds         = DELAY_STYLES[delayLevel];

  const isDelayed  = delayLevel !== 'none';
  const proximity  = isDelayed ? 'overdue' : getDueProximity(task);
  const ps         = DUE_PROXIMITY_STYLES[proximity];

  // Delayed takes priority over proximity styling
  const activeBorder = isDelayed ? ds.border  : (ps ? ps.border  : '');
  const activeBg     = isDelayed ? ds.cardBg  : (ps ? ps.cardBg  : '');
  const activeColor  = isDelayed ? ds.barColor : (ps ? ps.barColor : null);
  const activeW      = isDelayed ? ds.barW     : (ps ? ps.barW    : 'w-1');
  const cardShadow   = isDelayed ? ds.cardShadow : null;
  const shouldAnim   = (isDelayed && (delayLevel === 'critical' || task.priority === 'critica'));

  const isUnread  = task.recipients?.some(r => r.userId === currentUserId) &&
                    !task.views?.some(v => v.userId === currentUserId);
  const isMaint   = isMaintenanceTask(task);

  return (
    <div
      onClick={onClick}
      className={`card-hover cursor-pointer relative overflow-hidden p-0
                  ${shouldAnim ? 'animate-pulse-red' : ''}
                  ${activeBorder ? `${activeBorder}` : ''}
                  ${activeBg}`}
      style={cardShadow ? { boxShadow: cardShadow } : undefined}
    >
      <div className="flex">
        {/* Accent bar */}
        <div className={`${activeW} flex-shrink-0 rounded-l-xl`}
             style={{ backgroundColor: activeColor || getPriorityColor(task.priority) }} />

        <div className="flex-1 p-4 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isUnread && <span className="w-2 h-2 rounded-full bg-brand-light flex-shrink-0" />}
                {isMaint  && <Truck size={11} className="text-warning flex-shrink-0" aria-label="OS de manutenção" />}
                <p className="text-sm font-semibold text-base-50 leading-tight line-clamp-2">{task.title}</p>
              </div>
              {task.description && (
                <p className="text-xs text-base-100 mt-1 line-clamp-1">{task.description}</p>
              )}
            </div>
            <PriorityBadge priority={task.priority} />
          </div>

          {/* Mini-stepper for maintenance tasks */}
          {isMaint && task.maintenanceSummary && (
            <MaintenanceStepperCompact task={task} />
          )}

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge status={task.status} />
            {task.requestType && (
              <span className="badge bg-base-500/60 text-base-100 border border-base-400/50 capitalize">
                {task.requestType}
              </span>
            )}
            {task.maintenanceSummary?.maintenanceStatusLabel && (
              <span className="badge bg-base-500/60 text-base-100 border border-base-400/50 capitalize">
                {task.maintenanceSummary.maintenanceStatusLabel}
              </span>
            )}
            {delayDays > 0 ? (
              <span className={`badge ${ds.badge} border border-current/30 gap-1
                                ${delayLevel === 'high' || delayLevel === 'critical' ? 'text-[11px] px-2 py-0.5' : ''}`}>
                <AlertTriangle size={delayLevel === 'high' || delayLevel === 'critical' ? 11 : 9} />
                {delayDays}d {ds.label || 'atrasada'}
              </span>
            ) : ps && proximity !== 'none' && proximity !== 'overdue' ? (
              <span className={`badge ${ps.badge} border border-current/30 gap-1`}>
                <Clock size={9} />
                {ps.label}
              </span>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-base-500/50 pt-2.5">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {task.from && <Avatar user={task.from} size="xs" />}
              <span className="text-[10px] text-base-200">→</span>
              <div className="flex -space-x-1">
                {task.recipients?.slice(0, 3).map(r => (
                  <Avatar key={r.id} user={r.user} size="xs" />
                ))}
                {(task.recipients?.length || 0) > 3 && (
                  <span className="text-[10px] text-base-200 ml-1.5">+{task.recipients.length - 3}</span>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-1 text-[10px] ${isDelayed ? ds.text : ps ? ps.text : 'text-base-200'}`}>
              <Clock size={10} />
              {fmtDate(task.dueDate)}
            </div>

            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-base-200">
                <MessageSquare size={10} />
                {task.comments.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(p) {
  return { critica: '#f85149', urgente: '#db6d28', alta: '#d29922', media: '#388bfd', baixa: '#6e7681' }[p] || '#6e7681';
}
