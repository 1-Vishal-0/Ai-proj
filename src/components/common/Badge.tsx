import React from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

/**
 * Small outlined enterprise status badge.
 * Uses restrained semantic borders on a clean white background.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}) => {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    success: 'bg-white text-green-700 border-green-300',
    warning: 'bg-white text-amber-700 border-amber-300',
    danger: 'bg-white text-red-700 border-red-300',
    info: 'bg-white text-brand-700 border-brand-200',
    primary: 'bg-white text-brand-700 border-brand-200',
    neutral: 'bg-white text-secondary border-border',
  };

  const dotStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
    info: 'bg-brand-600',
    primary: 'bg-brand-600',
    neutral: 'bg-muted',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
        styles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  );
};
