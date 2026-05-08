import { useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Wrench, MessageSquare, AlertTriangle, Info } from 'lucide-react';
import { fmtRelative } from '../../utils/format.js';

const TYPE_ICON = {
  task:    <Wrench       size={13} className="text-brand-light" />,
  comment: <MessageSquare size={13} className="text-success" />,
  cobrar:  <AlertTriangle size={13} className="text-warning" />,
  info:    <Info         size={13} className="text-base-100" />,
};

export function NotifPanel({ notifs, onMarkRead, onMarkAll, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref}
         className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-base-400 bg-base-700 shadow-panel z-50 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-500">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-base-100" />
          <span className="text-sm font-semibold text-base-50">Notificações</span>
        </div>
        <button
          onClick={onMarkAll}
          className="flex items-center gap-1 text-xs text-brand-light hover:text-brand transition-colors"
        >
          <CheckCheck size={13} /> Marcar tudo
        </button>
      </div>

      {/* List */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-base-500/50">
        {notifs.length === 0 ? (
          <div className="py-10 text-center text-sm text-base-100">
            Nenhuma notificação
          </div>
        ) : notifs.map(n => (
          <button
            key={n.id}
            onClick={() => onMarkRead(n.id)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-base-600 ${!n.read ? 'bg-base-600/50' : ''}`}
          >
            <div className="w-6 h-6 rounded-full bg-base-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              {TYPE_ICON[n.type] || TYPE_ICON.info}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-base-50 truncate flex-1">{n.title}</p>
                {!n.read && <span className="w-2 h-2 rounded-full bg-brand-light flex-shrink-0" />}
              </div>
              {n.body && <p className="text-xs text-base-100 mt-0.5 line-clamp-2">{n.body}</p>}
              <p className="text-[10px] text-base-200 mt-1">{fmtRelative(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
