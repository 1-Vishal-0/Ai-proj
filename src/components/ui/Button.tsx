import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'sm',
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 border border-brand-600',
      secondary:
        'bg-white text-primary hover:bg-subtle border border-border',
      outline:
        'bg-white text-primary hover:bg-subtle border border-border',
      ghost:
        'bg-transparent text-secondary hover:text-primary hover:bg-subtle border border-transparent',
      danger:
        'bg-red-600 text-white hover:bg-red-700 border border-red-600',
      success:
        'bg-green-600 text-white hover:bg-green-700 border border-green-600',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      xs: 'h-7 px-2.5 text-xs gap-1.5 rounded',
      sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-md',
      md: 'h-9 px-4 text-sm gap-2 rounded-md',
      lg: 'h-10 px-5 text-sm gap-2 rounded-md',
      icon: 'h-8 w-8 p-0 rounded-md justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
