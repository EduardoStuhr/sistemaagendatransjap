import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} className="text-success" />,
  error:   <XCircle    size={16} className="text-danger"  />,
  warning: <AlertTriangle size={16} className="text-warning" />,
  info:    <Info       size={16} className="text-brand-light" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
                       bg-base-700 border border-base-400 shadow-panel animate-slide-up
                       min-w-[280px] max-w-[380px]">
            {ICONS[t.type]}
            <span className="flex-1 text-sm text-base-50">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-base-200 hover:text-base-50 transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
