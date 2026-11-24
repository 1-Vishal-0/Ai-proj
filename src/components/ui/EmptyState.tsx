import React from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-muted border border-border">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && (
        <p className="text-xs text-secondary mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
