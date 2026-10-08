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
      bg: 'bg-[#F0FDF4] dark:bg-emerald-950/30 text-[#16866A] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-800/40',
      dot: 'bg-[#16866A]',
      label: 'LOW',
    },
    MEDIUM: {
      bg: 'bg-[#FEFCE8] dark:bg-amber-950/30 text-[#B7791F] dark:text-amber-400 border-[#FEF08A] dark:border-amber-800/40',
      dot: 'bg-[#B7791F]',
      label: 'MEDIUM',
    },
    HIGH: {
      bg: 'bg-[#FFF7ED] dark:bg-orange-950/30 text-[#C65D1E] dark:text-orange-400 border-[#FFEDD5] dark:border-orange-800/40',
      dot: 'bg-[#C65D1E]',
      label: 'HIGH',
    },
    CRITICAL: {
      bg: 'bg-[#FEF2F2] dark:bg-rose-950/30 text-[#C43D4B] dark:text-rose-400 border-[#FEE2E2] dark:border-rose-800/40 font-semibold',
      dot: 'bg-[#C43D4B]',
      label: 'CRITICAL',
    },
  }[level] || {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: level,
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${sizeClasses} ${styles.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
      <span>{styles.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono font-bold opacity-90 pl-1 border-l border-current/25">
          {score}
        </span>
      )}
    </span>
  );
};
