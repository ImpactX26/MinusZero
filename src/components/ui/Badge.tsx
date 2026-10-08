import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  }[size];

  const variantStyles = {
    default: {
      bg: 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
      dotColor: 'bg-[var(--text-muted)]',
    },
    accent: {
      bg: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20',
      dotColor: 'bg-[var(--accent)]',
    },
    success: {
      bg: 'bg-[var(--risk-low-bg)] text-[var(--risk-low)] border-[var(--risk-low-border)]',
      dotColor: 'bg-[var(--risk-low)]',
    },
    warning: {
      bg: 'bg-[var(--risk-medium-bg)] text-[var(--risk-medium)] border-[var(--risk-medium-border)]',
      dotColor: 'bg-[var(--risk-medium)]',
    },
    danger: {
      bg: 'bg-[var(--risk-critical-bg)] text-[var(--risk-critical)] border-[var(--risk-critical-border)]',
      dotColor: 'bg-[var(--risk-critical)]',
    },
    neutral: {
      bg: 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800',
      dotColor: 'bg-slate-400',
    },
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${sizeClasses} ${variantStyles.bg} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${variantStyles.dotColor}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
