import { useOutletContext, Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo,
  TrendingUp, Wrench, Zap, ClipboardList, Plus, ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { MetricCard } from '../components/dashboard/MetricCard.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { PageLoader } from '../components/ui/Spinner.jsx';
import { fmtDate } from '../utils/format.js';
import { getDelayDays, getDelayLevel, DELAY_STYLES } from '../utils/delay.js';
import { STATUS_LABELS, MAINTENANCE_STATUS_LABELS } from '../utils/format.js';
import { isAgendaTask, isMaintenanceTask } from '../utils/taskFilters.js';

const STATUS_COLORS = {
  nao_visualizada: '#6e7681', visualizada: '#388bfd', em_andamento: '#d29922',
  aguardando_peca: '#db6d28', pausada: '#8957e5', concluida: '#3fb950', cancelada: '#f85149',
};

const MAINTENANCE_STATUS_COLORS = {
  solicitacao_aberta: '#38bdf8', em_orcamento: '#f59e0b',
  aguardando_aprovacao: '#fb923c', compra_pecas: '#60a5fa',
  aguardando_entrega_pecas: '#f97316', em_manutencao: '#22c55e', finalizado: '#14b8a6',
};

const PRIORITY_ORDER = { critica: 0, urgente: 1, alta: 2, media: 3, baixa: 4 };

function SectionHeader({ icon: Icon, title, color, action }) {
  return (
    <header className="flex items-center gap-2 mb-4">
      <Icon size={16} className={color} />
      <h2 className="text-sm font-bold uppercase tracking-widest text-base-100">{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}

export default function Dashboard() {
  const { tasks, loading, onSelectTask, onNewTask } = useOutletContext();

  if (loading) return <PageLoader />;

  const agendaTasks  = tasks.filter(isAgendaTask);
  const maintTasks   = tasks.filter(isMaintenanceTask);

  // ── Agenda metrics ────────────────────────────
  const aPending  = agendaTasks.filter(t => !['concluida','cancelada'].includes(t.status));
  const aDone     = agendaTasks.filter(t => t.status === 'concluida');
  const aCritical = agendaTasks.filter(t => ['critica','urgente'].includes(t.priority));
  const aOverdue  = aPending.filter(t => getDelayDays(t) > 0);

  const agendaMetrics = [
    { label: 'Total Agenda',   value: agendaTasks.length, color: '#388bfd', icon: ListTodo,      percentage: 100 },
    { label: 'Pendentes',      value: aPending.length,    color: '#d29922', icon: Clock,         percentage: agendaTasks.length ? Math.round(aPending.length / agendaTasks.length * 100) : 0 },
    { label: 'Concluídas',     value: aDone.length,       color: '#3fb950', icon: CheckCircle2,  percentage: agendaTasks.length ? Math.round(aDone.length / agendaTasks.length * 100) : 0 },
    { label: 'Críticas/Urg.',  value: aCritical.length,   color: '#f85149', icon: Zap,           percentage: agendaTasks.length ? Math.round(aCritical.length / agendaTasks.length * 100) : 0 },
  ];

  // ── Manutenção metrics ────────────────────────
  const mPending  = maintTasks.filter(t => !['concluida','cancelada'].includes(t.status));
  const mDone     = maintTasks.filter(t => t.status === 'concluida');
  const mOverdue  = mPending.filter(t => getDelayDays(t) > 0);
  const mGargalos = mPending.filter(t => t.maintenanceSummary?.bottleneck);

  const maintMetrics = [
    { label: 'Total OSs',    value: maintTasks.length, color: '#388bfd', icon: Wrench,       percentage: 100 },
    { label: 'Em aberto',    value: mPending.length,   color: '#d29922', icon: Clock,        percentage: maintTasks.length ? Math.round(mPending.length / maintTasks.length * 100) : 0 },
    { label: 'Concluídas',   value: mDone.length,      color: '#3fb950', icon: CheckCircle2, percentage: maintTasks.length ? Math.round(mDone.length / maintTasks.length * 100) : 0 },
    { label: 'Gargalos',     value: mGargalos.length,  color: '#f85149', icon: AlertTriangle, percentage: maintTasks.length ? Math.round(mGargalos.length / maintTasks.length * 100) : 0 },
  ];

  // ── Charts ────────────────────────────────────
  const statusData = Object.entries(
    agendaTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#6e7681' }));

  const maintenanceData = Object.entries(
    maintTasks.reduce((acc, t) => {
      if (!t.maintenanceStatus) return acc;
      acc[t.maintenanceStatus] = (acc[t.maintenanceStatus] || 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: MAINTENANCE_STATUS_LABELS[k] || k, value: v, color: MAINTENANCE_STATUS_COLORS[k] || '#6e7681' }));

  // ── Top priority tasks (agenda only) ─────────
  const topAgendaTasks = [...agendaTasks]
    .filter(t => ['critica','urgente','alta'].includes(t.priority) && !['concluida','cancelada'].includes(t.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5))
    .slice(0, 5);

  return (
    <div className="p-6 space-y-8 animate-fade-in">

      {/* ── SEÇÃO: AGENDA ── */}
      <section>
        <SectionHeader icon={ClipboardList} title="Agenda" color="text-brand-light" />

        {/* Overdue banner */}
        {aOverdue.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/30 bg-danger/5 mb-4">
            <AlertTriangle size={16} className="text-danger flex-shrink-0" />
            <p className="text-sm text-danger font-medium">
              {aOverdue.length} {aOverdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} na agenda
            </p>
            <button onClick={() => onSelectTask?.(aOverdue[0])} className="ml-auto text-xs text-danger hover:text-red-300 transition-colors font-medium">
              Ver →
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {agendaMetrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status pie */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-base-100 uppercase tracking-widest mb-4">Distribuição por Status</p>
            {statusData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-base-200">Sem dados ainda</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                      {statusData.map((s, i) => <Cell key={i} fill={s.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid #30363d', borderRadius: 8, fontSize: 12, color: '#e6edf3' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {statusData.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-base-100 flex-1 truncate">{s.name}</span>
                      <span className="text-xs font-semibold text-base-50">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* High priority */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-danger" />
              <p className="text-xs font-semibold text-base-100 uppercase tracking-widest">Tarefas Prioritárias</p>
            </div>
            {topAgendaTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-success">✓ Nenhuma tarefa crítica pendente</div>
            ) : (
              <div className="space-y-2">
                {topAgendaTasks.map(task => {
                  const days  = getDelayDays(task);
                  const level = getDelayLevel(days);
                  const ds    = DELAY_STYLES[level];
                  return (
                    <button key={task.id} onClick={() => onSelectTask(task)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-base-600 hover:bg-base-500 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-base-50 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <PriorityBadge priority={task.priority} />
                          <StatusBadge status={task.status} />
                          {days > 0 && <span className={`text-[10px] font-semibold ${ds.text}`}>{days}d atrasada</span>}
                        </div>
                      </div>
                      <div className="flex -space-x-1">
                        {task.recipients?.slice(0, 3).map(r => <Avatar key={r.id} user={r.user} size="xs" />)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO: MANUTENÇÃO ── */}
      <section>
        <SectionHeader
          icon={Wrench}
          title="Manutenção"
          color="text-warning"
          action={
            <button
              onClick={() => onNewTask({ requestType: 'Manutenção', category: 'manutencao' })}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Plus size={13} /> Nova OS
            </button>
          }
        />

        {/* Gargalo banner */}
        {mGargalos.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/40 bg-danger/10 mb-4">
            <AlertTriangle size={16} className="text-danger flex-shrink-0" />
            <p className="text-sm text-danger font-medium">
              {mGargalos.length} {mGargalos.length === 1 ? 'manutenção com gargalo' : 'manutenções com gargalo'} detectado
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {maintMetrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Fluxo de manutenção */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-base-100 uppercase tracking-widest mb-4">Fluxo de Manutenção</p>
            {maintenanceData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-base-200">Sem OSs ainda</div>
            ) : (
              <div className="space-y-3">
                {maintenanceData.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 text-sm text-base-100 truncate">{item.name}</div>
                    <div className="text-sm font-semibold text-base-50">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending OSs */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-warning" />
              <p className="text-xs font-semibold text-base-100 uppercase tracking-widest">OSs Pendentes</p>
              <Link to="/manutencao" className="ml-auto text-xs text-base-200 hover:text-brand-light transition-colors flex items-center gap-1">
                Ver todas <ArrowRight size={11} />
              </Link>
            </div>
            {mPending.length === 0 ? (
              <div className="py-6 text-center text-sm text-success">✓ Nenhuma OS em aberto</div>
            ) : (
              <div className="space-y-1">
                {[...mPending]
                  .sort((a, b) => {
                    const aGargalo = a.maintenanceSummary?.bottleneck ? 0 : 1;
                    const bGargalo = b.maintenanceSummary?.bottleneck ? 0 : 1;
                    if (aGargalo !== bGargalo) return aGargalo - bGargalo;
                    return getDelayDays(b) - getDelayDays(a);
                  })
                  .slice(0, 6)
                  .map(task => {
                    const days  = getDelayDays(task);
                    const level = getDelayLevel(days);
                    const ds    = DELAY_STYLES[level];
                    const isGargalo = task.maintenanceSummary?.bottleneck;
                    return (
                      <button key={task.id} onClick={() => onSelectTask(task)}
                        className="w-full text-left flex items-center gap-3 py-2.5 border-b border-base-500/50 last:border-0 hover:text-brand-light transition-colors group">
                        <div className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{ background: isGargalo ? '#f85149' : MAINTENANCE_STATUS_COLORS[task.maintenanceStatus] || '#6e7681' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-base-50 group-hover:text-brand-light transition-colors truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-base-200">
                              {task.maintenanceSummary?.maintenanceStatusLabel || '—'}
                            </span>
                            {isGargalo && (
                              <span className="text-[10px] font-semibold text-danger">⚠ gargalo</span>
                            )}
                            {days > 0 && <span className={`text-[10px] font-semibold ${ds.text}`}>{days}d atraso</span>}
                          </div>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
