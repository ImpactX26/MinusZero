import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
    md: 'text-xs px-3.5 py-1.5 rounded-md gap-2 font-medium',
    lg: 'text-sm px-4 py-2 rounded-lg gap-2 font-medium',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs border border-transparent',
    secondary:
      'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]',
    ghost:
      'bg-transparent hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent',
    outline:
      'bg-transparent hover:bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]',
    danger:
      'bg-[#C43D4B] hover:bg-[#A8323E] text-white shadow-xs border border-transparent',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
