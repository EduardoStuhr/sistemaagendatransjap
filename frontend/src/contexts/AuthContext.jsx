import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser   ] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authService.me()
      .then(u => { setUser(u); connectSocket(token); })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (name, password) => {
    const { token, user: u } = await authService.login({ name, password });
    localStorage.setItem('token', token);
    setUser(u);
    connectSocket(token);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
