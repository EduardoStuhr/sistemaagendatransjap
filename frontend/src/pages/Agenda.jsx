import { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus, Inbox } from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../components/ui/Spinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDelayDays, getDelayLevel } from '../utils/delay.js';
import { PRIORITY_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '../utils/format.js';

const PRIORITY_ORDER = { critica: 0, urgente: 1, alta: 2, media: 3, baixa: 4 };

const FILTERS = [
  { id: 'todas',      label: 'Todas' },
  { id: 'pendentes',  label: 'Pendentes' },
  { id: 'urgentes',   label: 'Urgentes' },
  { id: 'atrasadas',  label: 'Atrasadas' },
  { id: 'concluidas', label: 'Concluídas' },
  { id: 'manutencao', label: 'Manutenção' },
];

export default function Agenda() {
  const { tasks, loading, onSelectTask, onNewTask } = useOutletContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const initialFilter = searchParams.get('filter') || 'todas';
  const [filter,  setFilter ] = useState(initialFilter);
  const [search,  setSearch ] = useState('');

  const filtered = useMemo(() => {
    let list = [...tasks];

    // Apply quick filter
    switch (filter) {
      case 'pendentes':  list = list.filter(t => !['concluida','cancelada'].includes(t.status)); break;
      case 'urgentes':   list = list.filter(t => ['critica','urgente'].includes(t.priority));    break;
      case 'atrasadas':  list = list.filter(t => getDelayDays(t) > 0);                           break;
      case 'concluidas': list = list.filter(t => t.status === 'concluida');                       break;
      case 'manutencao': list = list.filter(t => t.category === 'manutencao');                    break;
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.from?.name.toLowerCase().includes(q),
      );
    }

    // Sort: delayed first, then by priority
    list.sort((a, b) => {
      const da = getDelayDays(a), db = getDelayDays(b);
      if (da !== db) return db - da;
      return (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5);
    });

    return list;
  }, [tasks, filter, search]);

  const pendingCount = tasks.filter(t => !['concluida','cancelada'].includes(t.status)).length;

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
          {tasks.length} tarefas · {pendingCount} pendentes
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
          description={search ? 'Tente outro termo de busca' : 'Crie uma nova tarefa para começar'}
          action={
            <button onClick={onNewTask} className="btn-primary btn-sm">
              <Plus size={14} /> Nova tarefa
            </button>
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
