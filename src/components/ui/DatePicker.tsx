import React, { useId } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '../../lib/cn';

interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  onClear?: () => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onClear,
  className,
  id,
  required,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-primary">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            id={inputId}
            type="date"
            required={required}
            value={value}
            className={cn(
              'block w-full h-9 rounded-md border border-border bg-white pl-8 pr-3 text-sm tabular-nums text-primary transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              className
            )}
            {...props}
          />
        </div>
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-secondary hover:text-primary px-2 py-1 rounded hover:bg-subtle transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

interface TimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  className,
  id,
  required,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-primary">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <Clock className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <input
          id={inputId}
          type="time"
          required={required}
          className={cn(
            'block w-full h-9 rounded-md border border-border bg-white pl-8 pr-2 text-sm tabular-nums text-primary transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};
