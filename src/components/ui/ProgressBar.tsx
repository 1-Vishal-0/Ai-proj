import React from 'react';
import { cn } from '../../lib/cn';

interface ProgressBarProps {
  value: number;
  threshold?: number;
  warningThreshold?: number;
  size?: 'xs' | 'sm' | 'md';
  tone?: 'auto' | 'brand' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  threshold = 75,
  warningThreshold = 80,
  size = 'sm',
  tone = 'auto',
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  let resolvedTone = tone;
  if (tone === 'auto') {
    if (value < threshold) resolvedTone = 'danger';
    else if (value < warningThreshold) resolvedTone = 'warning';
    else resolvedTone = 'success';
  }

  const barColors: Record<Exclude<NonNullable<ProgressBarProps['tone']>, 'auto'>, string> = {
    brand: 'bg-brand-600',
    success: 'bg-green-600',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
  };

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full rounded-full bg-border-subtle overflow-hidden',
        heights[size],
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-200',
          barColors[resolvedTone as Exclude<NonNullable<ProgressBarProps['tone']>, 'auto'>]
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
