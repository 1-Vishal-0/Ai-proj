import React from 'react';
import { cn } from '../../lib/cn';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('animate-pulse rounded-lg bg-subtle', className)}
    {...props}
  />
);

export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 py-2">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-72 w-full rounded-xl" />
  </div>
);
