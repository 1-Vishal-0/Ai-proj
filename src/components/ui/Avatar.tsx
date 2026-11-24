import React, { useState } from 'react';
import { cn } from '../../lib/cn';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
    .trim()
    .split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'sm',
  className,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    xs: 'h-6 w-6 text-[11px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        onError={() => setImgError(true)}
        className={cn(
          'rounded-full object-cover border border-border shrink-0',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      aria-label={name || 'User avatar'}
      className={cn(
        'rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-medium inline-flex items-center justify-center shrink-0 select-none',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
