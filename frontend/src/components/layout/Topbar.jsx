import { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications.js';
import { NotifPanel } from '../notifications/NotifPanel.jsx';

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/agenda':     'Minha Agenda',
  '/manutencao': 'Manutenção & Peças',
  '/calendar':   'Calendário',
  '/despesas':   'Despesas',
  '/profile':    'Meu Perfil',
};

export function Topbar({ onNewTask }) {
  const location  = useLocation();
  const title     = PAGE_TITLES[location.pathname] || 'OpsAgenda';
  const isProfile = location.pathname === '/profile';

  const { notifs, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <header className="h-14 bg-base-900 border-b border-base-500 flex items-center px-6 gap-4 flex-shrink-0 z-20">
      <h1 className="flex-1 text-[15px] font-semibold text-base-50">{title}</h1>

      <div className="flex items-center gap-2">
        {!isProfile && (
          <button onClick={onNewTask} className="btn-primary btn-sm gap-1.5">
            <Plus size={14} /> Nova tarefa
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-base-100 hover:bg-base-700 hover:text-base-50 transition-all"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-base-900" />
            )}
          </button>

          {showNotifs && (
            <NotifPanel
              notifs={notifs}
              onMarkRead={(id) => { markRead(id); }}
              onMarkAll={() => { markAllRead(); setShowNotifs(false); }}
              onClose={() => setShowNotifs(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
