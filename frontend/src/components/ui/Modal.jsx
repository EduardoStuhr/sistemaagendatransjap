import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-3xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${widths[size]} flex flex-col rounded-2xl border border-base-400 bg-base-700 shadow-modal animate-slide-up max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-base-500 flex-shrink-0">
          <h2 className="flex-1 text-[15px] font-semibold text-base-50">{title}</h2>
          <button onClick={onClose} className="text-base-200 hover:text-base-50 transition-colors p-1 rounded-lg hover:bg-base-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-base-500 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
