import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((msg, dur) => showToast(msg, 'success', dur), [showToast]);
  const error = useCallback((msg, dur) => showToast(msg, 'error', dur), [showToast]);
  const info = useCallback((msg, dur) => showToast(msg, 'info', dur), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-3 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-2xl border text-xs sm:text-sm font-medium transition-all duration-300 backdrop-blur-md ${
              t.type === 'error'
                ? 'bg-neutral-950/95 border-red-500/40 text-red-200'
                : t.type === 'info'
                ? 'bg-neutral-950/95 border-blue-500/40 text-blue-200'
                : 'bg-neutral-950/95 border-orange-500/50 text-neutral-100 shadow-orange-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'error' ? (
                <AlertCircle size={17} className="text-red-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info size={17} className="text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 size={17} className="text-orange-500 shrink-0" />
              )}
              <span className="leading-snug break-words">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-white ml-2 shrink-0 cursor-pointer p-0.5"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
