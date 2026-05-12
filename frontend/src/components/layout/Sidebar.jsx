import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Calendar, Wrench, Truck,
  ChevronLeft, ChevronRight, Clock, AlertCircle, AlertTriangle,
  LogOut, UserCircle, Receipt,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import logo from '../../assets/logo.png';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'          },
  { to: '/agenda',       icon: ClipboardList,   label: 'Minha Agenda'       },
  { to: '/manutencao',   icon: Wrench,          label: 'Manutenção & Peças' },
  { to: '/equipamentos', icon: Truck,           label: 'Equipamentos'       },
  { to: '/calendar',     icon: Calendar,        label: 'Calendário'         },
  { to: '/despesas',     icon: Receipt,         label: 'Despesas'           },
];

const QUICK_AGENDA = [
  { label: 'Urgentes',  icon: AlertCircle, filter: 'urgentes'  },
  { label: 'Atrasadas', icon: Clock,       filter: 'atrasadas' },
];

const QUICK_MANUTENCAO = [
  { label: 'OS Urgentes',   icon: AlertCircle,   filter: 'urgentes'  },
  { label: 'OS em Gargalo', icon: AlertTriangle, filter: 'gargalos'  },
];

export function Sidebar({ taskCounts = {}, onFilter }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col bg-base-900 border-r border-base-500 transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-[64px]' : 'w-[228px]'}`}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-base-600 border border-base-400 flex items-center justify-center text-base-100 hover:text-base-50 hover:bg-base-500 transition-all shadow-card"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center border-b border-base-500 flex-shrink-0 overflow-hidden ${collapsed ? 'justify-center px-2 h-14' : 'px-4 h-16'}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#1f6feb,#0d419d)', color: '#fff' }}>TJ</div>
        ) : (
          <img
            src={logo}
            alt="Agenda Transjap"
            style={{ height: '38px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(210,153,34,0.45))' }}
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {!collapsed && <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest px-2 py-1.5">Principal</p>}

        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group w-full
               ${isActive ? 'bg-brand/15 text-brand-light' : 'text-base-100 hover:bg-base-700 hover:text-base-50'}`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-brand-light' : 'text-base-200 group-hover:text-base-50'}`} />
                {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
                {!collapsed && taskCounts[to] > 0 && (
                  <span className="ml-auto bg-danger text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {taskCounts[to] > 99 ? '99+' : taskCounts[to]}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Quick filters — Agenda */}
        {!collapsed && (
          <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest px-2 py-1.5 mt-3">
            Filtros — Agenda
          </p>
        )}
        {QUICK_AGENDA.map(({ label, icon: Icon, filter }) => (
          <button
            key={filter}
            onClick={() => navigate(`/agenda?filter=${filter}`)}
            title={collapsed ? label : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-base-100 hover:bg-base-700 hover:text-base-50 group w-full"
          >
            <Icon size={16} className="flex-shrink-0 text-base-200 group-hover:text-base-50" />
            {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
          </button>
        ))}

        {/* Quick filters — Manutenção */}
        {!collapsed && (
          <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest px-2 py-1.5 mt-3">
            Filtros — Manutenção
          </p>
        )}
        {QUICK_MANUTENCAO.map(({ label, icon: Icon, filter }) => (
          <button
            key={filter}
            onClick={() => navigate(`/manutencao?filter=${filter}`)}
            title={collapsed ? label : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-base-100 hover:bg-base-700 hover:text-base-50 group w-full"
          >
            <Icon size={16} className="flex-shrink-0 text-base-200 group-hover:text-base-50" />
            {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-base-500 p-2 space-y-1">
        <NavLink to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group w-full
             ${isActive ? 'bg-brand/15 text-brand-light' : 'text-base-100 hover:bg-base-700 hover:text-base-50'}`
          }
          title={collapsed ? 'Meu Perfil' : undefined}
        >
          {({ isActive }) => (
            <>
              <UserCircle size={16} className={`flex-shrink-0 ${isActive ? 'text-brand-light' : 'text-base-200 group-hover:text-base-50'}`} />
              {!collapsed && <span className="text-sm font-medium">Meu Perfil</span>}
            </>
          )}
        </NavLink>

        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg bg-base-700 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar user={user} size="sm" online />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-base-50 truncate">{user?.name}</p>
              <p className="text-[10px] text-base-200 capitalize truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} title="Sair" className="text-base-200 hover:text-danger transition-colors p-1">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
