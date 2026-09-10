import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: Toast = { ...options, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = options.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    toast({ type: 'success', title, message });
  }, [toast]);

  const error = useCallback((title: string, message?: string) => {
    toast({ type: 'error', title, message, duration: 6000 });
  }, [toast]);

  const warning = useCallback((title: string, message?: string) => {
    toast({ type: 'warning', title, message });
  }, [toast]);

  const info = useCallback((title: string, message?: string) => {
    toast({ type: 'info', title, message });
  }, [toast]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {createPortal(
        <div className={styles.container}>
          {toasts.map((t) => (
            <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
              <div className={styles.icon}>{icons[t.type]}</div>
              <div className={styles.content}>
                <p className={styles.title}>{t.title}</p>
                {t.message && <p className={styles.message}>{t.message}</p>}
              </div>
              <button
                className={styles.closeButton}
                onClick={() => removeToast(t.id)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
