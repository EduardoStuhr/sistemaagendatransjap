import { useOutletContext } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo,
  TrendingUp, Wrench, Zap,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { MetricCard } from '../components/dashboard/MetricCard.jsx';
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { PageLoader } from '../components/ui/Spinner.jsx';
import { fmtDate } from '../utils/format.js';
import { getDelayDays, getDelayLevel, DELAY_STYLES } from '../utils/delay.js';
import { STATUS_LABELS, CATEGORY_LABELS, MAINTENANCE_STATUS_LABELS } from '../utils/format.js';

const STATUS_COLORS = {
  nao_visualizada: '#6e7681', visualizada: '#388bfd', em_andamento: '#d29922',
  aguardando_peca: '#db6d28', pausada: '#8957e5', concluida: '#3fb950', cancelada: '#f85149',
};

const MAINTENANCE_STATUS_COLORS = {
  solicitacao_aberta: '#38bdf8',
  em_orcamento: '#f59e0b',
  aguardando_aprovacao: '#fb923c',
  compra_pecas: '#60a5fa',
  aguardando_entrega_pecas: '#f97316',
  em_manutencao: '#22c55e',
  finalizado: '#14b8a6',
};

const PRIORITY_ORDER = { critica: 0, urgente: 1, alta: 2, media: 3, baixa: 4 };

export default function Dashboard() {
  const { tasks, loading, onSelectTask } = useOutletContext();

  if (loading) return <PageLoader />;

  const pending   = tasks.filter(t => !['concluida','cancelada'].includes(t.status));
  const done      = tasks.filter(t => t.status === 'concluida');
  const critical  = tasks.filter(t => t.priority === 'critica');
  const urgent    = tasks.filter(t => t.priority === 'urgente');
  const overdue   = pending.filter(t => getDelayDays(t) > 0);

  const metrics = [
    { label: 'Total de Tarefas',   value: tasks.length,   sub: 'na sua agenda',      color: '#388bfd', icon: ListTodo,      percentage: 100 },
    { label: 'Pendentes',          value: pending.length,  sub: 'aguardando ação',    color: '#d29922', icon: Clock,         percentage: tasks.length ? Math.round(pending.length / tasks.length * 100) : 0 },
    { label: 'Concluídas',         value: done.length,     sub: 'finalizadas',        color: '#3fb950', icon: CheckCircle2,  percentage: tasks.length ? Math.round(done.length / tasks.length * 100) : 0 },
    { label: 'Críticas/Urgentes',  value: critical.length + urgent.length, sub: 'prioridade máxima', color: '#f85149', icon: Zap, percentage: tasks.length ? Math.round((critical.length + urgent.length) / tasks.length * 100) : 0 },
  ];

  // Status distribution for pie
  const statusData = Object.entries(
    tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#6e7681' }));

  // Category distribution for bar
  const catData = Object.entries(
    tasks.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: v }));

  const maintenanceData = Object.entries(
    tasks.filter(t => t.requestType === 'Manutenção' || !t.requestType).reduce((acc, t) => {
      if (!t.maintenanceStatus) return acc;
      acc[t.maintenanceStatus] = (acc[t.maintenanceStatus] || 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: MAINTENANCE_STATUS_LABELS[k] || k, value: v, color: MAINTENANCE_STATUS_COLORS[k] || '#6e7681' }));

  // Top critical/urgent tasks
  const topTasks = [...tasks]
    .filter(t => ['critica','urgente','alta'].includes(t.priority) && !['concluida','cancelada'].includes(t.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5))
    .slice(0, 5);

  // Recent tasks
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Overdue alert banner */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/30 bg-danger/5">
          <AlertTriangle size={16} className="text-danger flex-shrink-0" />
          <p className="text-sm text-danger font-medium">
            {overdue.length} {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} — revise sua agenda
          </p>
          <button
            onClick={() => onSelectTask?.(overdue[0])}
            className="ml-auto text-xs text-danger hover:text-red-300 transition-colors font-medium"
          >
            Ver →
          </button>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
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

        {/* Maintenance flow chart */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-base-100 uppercase tracking-widest mb-4">Fluxo de manutenção</p>
          {maintenanceData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-base-200">Sem dados ainda</div>
          ) : (
            <div className="space-y-3">
              {maintenanceData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <div className="flex-1 text-sm text-base-100 truncate">{item.name}</div>
                  <div className="text-sm font-semibold text-base-50">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* High priority */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-danger" />
            <p className="text-xs font-semibold text-base-100 uppercase tracking-widest">Tarefas Prioritárias</p>
          </div>
          {topTasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-success">✓ Nenhuma tarefa crítica pendente</div>
          ) : (
            <div className="space-y-2">
              {topTasks.map(task => {
                const days  = getDelayDays(task);
                const level = getDelayLevel(days);
                const ds    = DELAY_STYLES[level];
                return (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-base-600 hover:bg-base-500 transition-colors group"
                  >
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

        {/* Recent */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-brand-light" />
            <p className="text-xs font-semibold text-base-100 uppercase tracking-widest">Tarefas Recentes</p>
          </div>
          {recentTasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-base-200">Nenhuma tarefa criada</div>
          ) : (
            <div className="space-y-1">
              {recentTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="w-full text-left flex items-center gap-3 py-2.5 border-b border-base-500/50 last:border-0 hover:text-brand-light transition-colors group"
                >
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[task.status] || '#6e7681' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-base-50 group-hover:text-brand-light transition-colors truncate">{task.title}</p>
                    <p className="text-[10px] text-base-200">Vence: {fmtDate(task.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge   status={task.status}   />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
