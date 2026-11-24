import React from 'react';
import { cn } from '../../lib/cn';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  dot?: boolean;
}

interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pills' | 'underline';
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  value,
  onChange,
  variant = 'pills',
  className,
}: TabsProps<T>) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={cn(
          'flex items-center gap-1 border-b border-border overflow-x-auto',
          className
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-brand-600 text-brand-600 font-semibold'
                  : 'border-transparent text-secondary hover:text-primary'
              )}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] tabular-nums',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-subtle text-secondary'
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-md bg-subtle p-1 border border-border',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              active
                ? 'bg-white text-primary border border-border font-semibold'
                : 'text-secondary hover:text-primary border border-transparent'
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] tabular-nums',
                  active ? 'bg-brand-50 text-brand-700' : 'text-muted'
                )}
              >
                {opt.count}
              </span>
            )}
            {opt.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
