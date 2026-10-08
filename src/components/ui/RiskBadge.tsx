import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  className = '',
}) => {
  const styles = {
    LOW: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
      dot: 'bg-emerald-500',
      label: 'LOW RISK',
    },
    MEDIUM: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
      dot: 'bg-amber-500',
      label: 'MEDIUM RISK',
    },
    HIGH: {
      bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40',
      dot: 'bg-orange-500',
      label: 'HIGH RISK',
    },
    CRITICAL: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40',
      dot: 'bg-rose-500',
      label: 'CRITICAL',
    },
  }[level] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: level,
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase font-semibold rounded-md border tracking-wider ${sizeClasses} ${styles.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
      <span>{styles.label}</span>
      {typeof score === 'number' && (
        <span className="font-bold opacity-90 pl-1 border-l border-current/30">
          {score}
        </span>
      )}
    </span>
  );
};
