import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { useTasks } from '../../hooks/useTasks.js';
import { TaskModal } from '../tasks/TaskModal.jsx';
import { CreateTaskModal } from '../tasks/CreateTaskModal.jsx';
import { isAgendaTask, isMaintenanceTask } from '../../utils/taskFilters.js';

export function AppLayout() {
  const [showCreate,     setShowCreate    ] = useState(false);
  const [createDefaults, setCreateDefaults] = useState({});
  const [selected,       setSelected      ] = useState(null);

  const { tasks, loading, createTask, changeStatus, addComment, cobrar, removeTask } = useTasks();

  const agendaPending = tasks
    .filter(isAgendaTask)
    .filter(t => !['concluida','cancelada'].includes(t.status)).length;

  const maintenancePending = tasks
    .filter(isMaintenanceTask)
    .filter(t => !['concluida','cancelada'].includes(t.status)).length;

  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <Sidebar taskCounts={{ '/agenda': agendaPending, '/manutencao': maintenancePending }} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onNewTask={() => setShowCreate(true)} />

        <main className="flex-1 overflow-y-auto bg-base-950">
          <Outlet context={{
            tasks, loading,
            onSelectTask: setSelected,
            onNewTask: (defaults = {}) => { setCreateDefaults(defaults); setShowCreate(true); },
          }} />
        </main>
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => { setShowCreate(false); setCreateDefaults({}); }}
          onCreate={createTask}
          defaults={createDefaults}
        />
      )}

      {selected && (
        <TaskModal
          task={selected}
          onClose={() => setSelected(null)}
          onStatusChange={changeStatus}
          onMaintenanceStatusChange={changeStatus}
          onAddComment={addComment}
          onCobrar={cobrar}
          onDelete={async (id) => { await removeTask(id); setSelected(null); }}
        />
      )}
    </div>
  );
}
