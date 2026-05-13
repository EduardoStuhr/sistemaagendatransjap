import { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Wrench, Plus, Search,
  AlertTriangle, CheckCircle2,
  List, Columns, Truck, Clock,
} from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { TaskCard } from '../components/tasks/TaskCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../components/ui/Spinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDelayDays, getDueProximity } from '../utils/delay.js';
import { isMaintenanceTask } from '../utils/taskFilters.js';
import { MAINTENANCE_STATUS_LABELS } from '../utils/format.js';

const VIEW_MODES = [
  { id: 'lista',       label: 'Lista',         icon: List    },
  { id: 'por_etapa',   label: 'Por Etapa',     icon: Columns },
  { id: 'por_equip',   label: 'Por Equip.',    icon: Truck   },
];

function daysInCurrentStage(task) {
  const timings = task.maintenanceSummary?.stageTimings;
  if (!timings) return null;
  const active = timings.find(s => s.active);
  if (!active?.start) return null;
  const start = typeof active.start === 'string' ? parseISO(active.start) : active.start;
  if (!isValid(start)) return null;
  return Math.max(0, differenceInDays(new Date(), start));
}

function isGargalo(task) {
  const days = daysInCurrentStage(task);
  return days !== null && days > 5;
}

function isVencendo(task) {
  const p = getDueProximity(task);
  return p === 'due_today' || p === 'due_soon';
}

export default function Manutencao() {
  const { tasks, loading: tasksLoading, onSelectTask, onNewTask } = useOutletContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [viewMode,     setViewMode    ] = useState('por_etapa');
  const [search,       setSearch      ] = useState('');

  // Somente OSs de manutenção (sem peças misturadas)
  const maintTasks = useMemo(() => {
    let list = tasks.filter(t => isMaintenanceTask(t) && t.requestType === 'Manutenção');

    // Aplicar filtro vindo do sidebar (?filter=urgentes|gargalos)
    const qFilter = searchParams.get('filter');
    if (qFilter === 'urgentes')  list = list.filter(t => ['critica','urgente'].includes(t.priority));
    if (qFilter === 'gargalos')  list = list.filter(isGargalo);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    // Ordenar: gargalos > atrasadas > vencendo > resto
    list.sort((a, b) => {
      const ga = isGargalo(a) ? 0 : getDelayDays(a) > 0 ? 1 : isVencendo(a) ? 2 : 3;
      const gb = isGargalo(b) ? 0 : getDelayDays(b) > 0 ? 1 : isVencendo(b) ? 2 : 3;
      return ga - gb;
    });

    return list;
  }, [tasks, search, searchParams]);

  const overdue  = useMemo(() => maintTasks.filter(t => getDelayDays(t) > 0 && !['concluida','cancelada'].includes(t.status)), [maintTasks]);
  const active   = useMemo(() => maintTasks.filter(t => !['concluida','cancelada'].includes(t.status)), [maintTasks]);
  const done     = useMemo(() => maintTasks.filter(t => t.status === 'concluida'), [maintTasks]);
  const vencendo = useMemo(() => active.filter(isVencendo), [active]);
  const gargalos = useMemo(() => active.filter(isGargalo), [active]);

  // Group by etapa for kanban view
  const byEtapa = useMemo(() => {
    const groups = {};
    for (const key of Object.keys(MAINTENANCE_STATUS_LABELS)) groups[key] = [];
    for (const t of active) {
      const k = t.maintenanceStatus || 'solicitacao_aberta';
      if (groups[k]) groups[k].push(t);
    }
    return groups;
  }, [active]);

  // Group by equipment
  const byEquip = useMemo(() => {
    const groups = { sem_equip: { label: 'Sem equipamento vinculado', tasks: [] } };
    for (const t of active) {
      if (!t.equipment) { groups.sem_equip.tasks.push(t); continue; }
      const key = `equip_${t.equipment.id}`;
      if (!groups[key]) groups[key] = { label: t.equipment.name, code: t.equipment.code, tasks: [] };
      groups[key].tasks.push(t);
    }
    return groups;
  }, [active]);

  return (
    <div className="p-6 animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-base-50 flex items-center gap-2">
          <Wrench className="text-brand-light" size={24} /> Manutenção
        </h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
            <input className="input pl-9 h-9 w-56" placeholder="Buscar OS..."
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={onNewTask} className="btn-primary btn-sm">
            <Plus size={14} /> Nova OS
          </button>
        </div>
      </div>

      {/* Gargalo banner */}
      {gargalos.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/40 bg-danger/10 mb-4 animate-pulse-red">
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <p className="text-sm text-danger font-bold">
            {gargalos.length} {gargalos.length === 1 ? 'manutenção parada' : 'manutenções paradas'} há mais de 5 dias — verifique o que está bloqueando
          </p>
        </div>
      )}

      {/* KPIs — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'OS em Aberto',        value: active.length,   icon: Wrench,        color: '#388bfd', sub: 'ativas'               },
          { label: 'Atrasadas',            value: overdue.length,  icon: AlertTriangle, color: '#f85149', sub: 'precisam de ação'     },
          { label: 'Vencendo',             value: vencendo.length, icon: Clock,         color: '#fb923c', sub: 'hoje ou em breve',    animate: vencendo.length > 0 },
          { label: 'Gargalos',             value: gargalos.length, icon: AlertTriangle, color: '#f85149', sub: '> 5d parada',         animate: gargalos.length > 0 },
          { label: 'Concluídas',           value: done.length,     icon: CheckCircle2,  color: '#3fb950', sub: 'este período'         },
        ].map(k => (
          <div key={k.label} className={`card p-4 flex items-center gap-3 ${k.animate ? 'animate-pulse-red' : ''}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${k.color}15`, border: `1px solid ${k.color}30` }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-[11px] text-base-100 leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] text-base-200">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View mode toggle */}
      {active.length > 0 && (
        <div className="flex gap-1 p-1 bg-base-700 rounded-xl border border-base-500 mb-5 w-fit">
          {VIEW_MODES.map(m => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                ${viewMode === m.id ? 'bg-base-900 text-base-50 shadow-card' : 'text-base-100 hover:text-base-50'}`}>
              <m.icon size={13} /> {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tasksLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <SkeletonCard key={i} />)}</div>
      ) : maintTasks.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhuma ordem de serviço"
                    description="Crie uma nova OS de manutenção"
                    action={<button onClick={onNewTask} className="btn-primary btn-sm"><Plus size={14} /> Nova OS</button>} />
      ) : (
        <div className="flex-1 min-h-0">
          {/* Lista */}
          {viewMode === 'lista' && (
            <div className="space-y-2 h-full overflow-y-auto pr-2">
              {maintTasks.map(t => (
                <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
              ))}
            </div>
          )}

          {/* Por etapa — kanban */}
          {viewMode === 'por_etapa' && (
            <div className="flex gap-4 overflow-x-auto h-full pb-4">
              {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => {
                const col = byEtapa[key] || [];
                return (
                  <div key={key} className="flex-shrink-0 w-[300px] flex flex-col h-full bg-base-900/50 rounded-xl p-3 border border-base-500">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-xs font-bold text-base-100 uppercase tracking-wider">{label}</p>
                      <span className="text-[10px] bg-base-700 border border-base-500 text-base-200 rounded-full px-2 py-0.5 font-medium">{col.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                      {col.length === 0 ? (
                        <div className="h-20 rounded-xl border-2 border-dashed border-base-500 flex items-center justify-center text-xs text-base-200">Vazia</div>
                      ) : col.map(t => (
                        <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Por equipamento */}
          {viewMode === 'por_equip' && (
            <div className="space-y-6 h-full overflow-y-auto pr-2">
              {Object.entries(byEquip).filter(([, g]) => g.tasks.length > 0).map(([key, group]) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={14} className="text-brand-light" />
                    <p className="text-sm font-semibold text-base-50">{group.label}</p>
                    {group.code && <span className="text-[10px] font-mono text-base-200 bg-base-700 px-1.5 rounded">{group.code}</span>}
                    <span className="text-[10px] bg-base-700 border border-base-500 text-base-200 rounded-full px-2 py-0.5 ml-auto">{group.tasks.length} OS</span>
                  </div>
                  <div className="space-y-2 pl-5 border-l border-base-600">
                    {group.tasks.map(t => (
                      <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
