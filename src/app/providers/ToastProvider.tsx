import React, { useCallback, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import {
  ToastContext,
  type ToastItem,
  type ToastVariant,
} from '../../hooks/useToast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...options, id }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4200);
    },
    [dismiss]
  );

  const iconByVariant: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="no-print fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-float text-primary"
          >
            {iconByVariant[item.variant]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary leading-snug">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-muted hover:text-primary hover:bg-subtle transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
