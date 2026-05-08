import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { useTasks } from '../../hooks/useTasks.js';
import { TaskModal } from '../tasks/TaskModal.jsx';
import { CreateTaskModal } from '../tasks/CreateTaskModal.jsx';

export function AppLayout() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected  ] = useState(null);

  const { tasks, loading, createTask, changeStatus, addComment, cobrar } = useTasks();

  const pendingCount = tasks.filter(t => !['concluida','cancelada'].includes(t.status)).length;

  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <Sidebar taskCounts={{ '/agenda': pendingCount }} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onNewTask={() => setShowCreate(true)} />

        <main className="flex-1 overflow-y-auto bg-base-950">
          <Outlet context={{
            tasks, loading,
            onSelectTask: setSelected,
            onNewTask: () => setShowCreate(true),
          }} />
        </main>
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreate={createTask}
        />
      )}

      {selected && (
        <TaskModal
          task={selected}
          onClose={() => setSelected(null)}
          onStatusChange={changeStatus}
          onAddComment={addComment}
          onCobrar={cobrar}
        />
      )}
    </div>
  );
}
