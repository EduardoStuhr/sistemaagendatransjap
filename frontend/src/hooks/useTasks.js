import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export function useTasks() {
  const [tasks,   setTasks  ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.list();
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNew     = (t) => setTasks(p => [t, ...p.filter(x => x.id !== t.id)]);
    const onUpdated = (t) => setTasks(p => p.map(x => x.id === t.id ? t : x));

    socket.on('task:new',     onNew);
    socket.on('task:updated', onUpdated);
    return () => { socket.off('task:new', onNew); socket.off('task:updated', onUpdated); };
  }, []);

  const createTask    = useCallback(async (data)    => { const t = await taskService.create(data);             setTasks(p => [t, ...p]); return t; }, []);
  const changeStatus  = useCallback(async (id, st, maintenanceStatus)  => { const t = await taskService.changeStatus(id, st, maintenanceStatus);     setTasks(p => p.map(x => x.id === id ? t : x)); return t; }, []);
  const addComment    = useCallback(async (id, text) => { const t = await taskService.addComment(id, text);     setTasks(p => p.map(x => x.id === id ? t : x)); return t; }, []);
  const cobrar        = useCallback(async (id)       => { await taskService.cobrar(id); }, []);
  const removeTask    = useCallback(async (id)       => { await taskService.remove(id);                         setTasks(p => p.filter(x => x.id !== id)); }, []);

  return { tasks, loading, error, fetchTasks, createTask, changeStatus, addComment, cobrar, removeTask };
}
