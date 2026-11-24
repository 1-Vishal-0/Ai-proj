import React from 'react';
import { cn } from '../../lib/cn';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'right' | 'top' | 'bottom';
  disabled?: boolean;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  disabled = false,
  className,
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
  };

  return (
    <div className={cn('relative inline-flex group/tooltip', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100 transition-opacity duration-150 absolute z-50 whitespace-nowrap rounded bg-primary px-2 py-1 text-xs font-medium text-white',
          positionClasses[side]
        )}
      >
        {content}
      </span>
    </div>
  );
};
