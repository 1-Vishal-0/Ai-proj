import React, { useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export const FilterBar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'no-print flex flex-col md:flex-row md:items-end justify-between gap-3 rounded-lg border border-border bg-white p-4',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Search...',
  className,
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={cn('flex-1 min-w-[200px] space-y-1', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full h-9 rounded-md border border-border bg-white pl-8 pr-8 text-sm text-primary placeholder:text-muted transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted hover:text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
