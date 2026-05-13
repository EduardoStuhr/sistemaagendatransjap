import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageLoader } from '../components/ui/Spinner.jsx';
import { isAgendaTask, isMaintenanceTask } from '../utils/taskFilters.js';

const PRIORITY_COLOR = { critica: '#f85149', urgente: '#db6d28', alta: '#d29922', media: '#388bfd', baixa: '#6e7681' };
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const VIEW_OPTS = [
  { id: 'agenda',    label: 'Agenda' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'todas',     label: 'Todas' },
];

export default function CalendarPage() {
  const { tasks, loading, onSelectTask } = useOutletContext();
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState('agenda');

  if (loading) return <PageLoader />;

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);

  const visibleTasks = useMemo(() => {
    if (view === 'agenda')     return tasks.filter(isAgendaTask);
    if (view === 'manutencao') return tasks.filter(isMaintenanceTask);
    return tasks;
  }, [tasks, view]);

  const tasksByDay = {};
  visibleTasks.forEach(t => {
    if (!t.dueDate) return;
    const due = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : t.dueDate;
    const key = format(due, 'yyyy-MM-dd');
    if (!tasksByDay[key]) tasksByDay[key] = [];
    tasksByDay[key].push(t);
  });

  function prev() { setCurrent(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; }); }
  function next() { setCurrent(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; }); }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-base-50 capitalize">
          {format(current, 'MMMM yyyy', { locale: ptBR })}
        </h2>

        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-base-700 rounded-xl border border-base-500">
          {VIEW_OPTS.map(o => (
            <button
              key={o.id}
              onClick={() => setView(o.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                ${view === o.id ? 'bg-base-900 text-base-50 shadow-card' : 'text-base-100 hover:text-base-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button onClick={prev} className="w-8 h-8 rounded-lg bg-base-700 border border-base-500 flex items-center justify-center text-base-100 hover:text-base-50 hover:border-base-400 transition-all">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setCurrent(new Date())} className="text-xs px-3 h-8 rounded-lg bg-base-700 border border-base-500 text-base-100 hover:text-base-50 hover:border-base-400 transition-all">
            Hoje
          </button>
          <button onClick={next} className="w-8 h-8 rounded-lg bg-base-700 border border-base-500 flex items-center justify-center text-base-100 hover:text-base-50 hover:border-base-400 transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-[11px] font-semibold text-base-200 text-center py-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const key      = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[key] || [];
          const today    = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-[88px] rounded-xl p-2 border transition-colors
                          ${today ? 'border-brand-light bg-brand/5' : 'border-base-500 bg-base-700 hover:border-base-400'}`}
            >
              <div className={`text-xs font-semibold mb-1.5 ${today ? 'text-brand-light' : 'text-base-100'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const isMaint = isMaintenanceTask(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="w-full text-left rounded text-[10px] px-1.5 py-0.5 truncate font-medium transition-opacity hover:opacity-80 flex items-center gap-1"
                      style={{ background: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority] }}
                    >
                      {isMaint && <Wrench size={9} className="flex-shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-base-200 pl-1">+{dayTasks.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
