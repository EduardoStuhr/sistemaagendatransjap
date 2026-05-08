import { useState, useEffect, useCallback } from 'react';
import { notifService } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export function useNotifications() {
  const [notifs,  setNotifs ] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await notifService.list();
      setNotifs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (n) => setNotifs(p => [{ ...n, id: Date.now(), read: false, createdAt: new Date().toISOString() }, ...p]);
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  const markRead    = useCallback(async (id) => {
    await notifService.markRead(id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await notifService.markAllRead();
    setNotifs(p => p.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  return { notifs, loading, unreadCount, fetchNotifs, markRead, markAllRead };
}
