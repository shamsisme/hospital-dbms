'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          const cfg = {
            success: {
              border: 'border-emerald-300',
              bg: 'bg-emerald-50 text-emerald-900',
              iconBg: 'text-emerald-600',
              Icon: CheckCircle2,
            },
            error: {
              border: 'border-red-400 bg-red-50 text-red-950',
              bg: 'bg-red-50 text-red-900',
              iconBg: 'text-red-600',
              Icon: AlertOctagon,
            },
            warning: {
              border: 'border-amber-300',
              bg: 'bg-amber-50 text-amber-900',
              iconBg: 'text-amber-600',
              Icon: AlertTriangle,
            },
            info: {
              border: 'border-blue-300',
              bg: 'bg-blue-50 text-blue-900',
              iconBg: 'text-blue-600',
              Icon: Info,
            },
          }[t.type];

          const Icon = cfg.Icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-right ${cfg.border} ${cfg.bg}`}
              role="status"
            >
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.iconBg}`} />
              <div className="flex-1">
                <h4 className="text-sm font-bold">{t.title}</h4>
                {t.message && <p className="mt-1 text-xs opacity-90 leading-relaxed">{t.message}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
