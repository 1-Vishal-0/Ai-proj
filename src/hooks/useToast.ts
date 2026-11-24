import { createContext, useContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined
);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
