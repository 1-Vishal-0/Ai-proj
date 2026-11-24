import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'rounded-lg border border-border bg-white text-primary',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-border',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn('text-base font-semibold text-primary', className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-secondary mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center justify-between px-5 py-3 bg-subtle border-t border-border rounded-b-lg',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  tone = 'default',
  actionLabel,
  onAction,
}) => {
  const valueColors: Record<NonNullable<StatCardProps['tone']>, string> = {
    default: 'text-primary',
    brand: 'text-brand-600',
    success: 'text-green-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-secondary">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>

      <div>
        <div className={cn('text-xl font-semibold tabular-nums', valueColors[tone])}>
          {value}
        </div>
        {(sublabel || onAction) && (
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <span className="text-secondary truncate">{sublabel}</span>
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-0.5 font-medium text-brand-600 hover:underline shrink-0"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
