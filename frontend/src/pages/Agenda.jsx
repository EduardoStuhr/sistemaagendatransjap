import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Inbox, Wrench } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../components/ui/Spinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDelayDays, getDelayLevel } from '../utils/delay.js';
import { isAgendaTask } from '../utils/taskFilters.js';

const PRIORITY_ORDER = { critica: 0, urgente: 1, alta: 2, media: 3, baixa: 4 };

const FILTERS = [
  { id: 'todas',      label: 'Todas' },
  { id: 'pendentes',  label: 'Pendentes' },
  { id: 'urgentes',   label: 'Urgentes' },
  { id: 'atrasadas',  label: 'Atrasadas' },
  { id: 'concluidas', label: 'Concluídas' },
];

export default function Agenda() {
  const { tasks, loading, onSelectTask, onNewTask } = useOutletContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect se alguém tentar acessar /agenda?filter=manutencao
  useEffect(() => {
    if (searchParams.get('filter') === 'manutencao') {
      navigate('/manutencao', { replace: true });
    }
  }, [searchParams, navigate]);

  const initialFilter = searchParams.get('filter') || 'todas';
  const [filter, setFilter] = useState(
    initialFilter === 'manutencao' ? 'todas' : initialFilter,
  );
  const [search, setSearch] = useState('');

  // Somente tarefas de agenda (regra crítica)
  const agendaTasks = useMemo(() => tasks.filter(isAgendaTask), [tasks]);

  const filtered = useMemo(() => {
    let list = [...agendaTasks];

    switch (filter) {
      case 'pendentes':  list = list.filter(t => !['concluida','cancelada'].includes(t.status)); break;
      case 'urgentes':   list = list.filter(t => ['critica','urgente'].includes(t.priority));    break;
      case 'atrasadas':  list = list.filter(t => getDelayDays(t) > 0);                           break;
      case 'concluidas': list = list.filter(t => t.status === 'concluida');                       break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.from?.name.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const da = getDelayDays(a), db = getDelayDays(b);
      if (da !== db) return db - da;
      return (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5);
    });

    return list;
  }, [agendaTasks, filter, search]);

  const pendingCount = agendaTasks.filter(t => !['concluida','cancelada'].includes(t.status)).length;

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
          <input
            className="input pl-9 h-9"
            placeholder="Buscar tarefas, responsáveis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-base-200 whitespace-nowrap">
          {agendaTasks.length} tarefas · {pendingCount} pendentes
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border
                        ${filter === f.id
                          ? 'bg-brand text-white border-brand'
                          : 'bg-base-700 border-base-500 text-base-100 hover:border-base-400 hover:text-base-50'}`}
          >
            {f.label}
            {f.id === 'pendentes' && pendingCount > 0 && (
              <span className="ml-1.5 bg-danger/80 text-white text-[9px] font-bold rounded-full px-1 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhuma tarefa encontrada"
          description={
            search
              ? 'Tente outro termo de busca'
              : agendaTasks.length === 0
                ? 'Crie uma nova tarefa para começar'
                : 'Nenhuma tarefa corresponde ao filtro selecionado'
          }
          action={
            <div className="flex flex-col items-center gap-2">
              <button onClick={onNewTask} className="btn-primary btn-sm">
                <Plus size={14} /> Nova tarefa
              </button>
              <Link
                to="/manutencao"
                className="flex items-center gap-1.5 text-xs text-brand-light hover:text-brand transition-colors"
              >
                <Wrench size={12} />
                Procurando OS de manutenção? Veja em <strong>Manutenção & Peças</strong>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={user?.id}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
