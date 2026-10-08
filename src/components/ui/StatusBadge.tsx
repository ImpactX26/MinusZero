import React from 'react';
import { Badge } from './Badge';

export type SystemStatusType =
  | 'PENDING'
  | 'ALLOWED'
  | 'STEP_UP_VERIFICATION'
  | 'BLOCK_AND_REVIEW'
  | 'BLOCKED'
  | 'CONFIRMED_FRAUD'
  | 'MARKED_LEGITIMATE'
  | 'OPEN'
  | 'CLOSED'
  | 'LIVE'
  | 'READY';

interface StatusBadgeProps {
  status: SystemStatusType | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const getVariant = (s: string) => {
    switch (s.toUpperCase()) {
      case 'ALLOWED':
      case 'MARKED_LEGITIMATE':
      case 'LIVE':
      case 'READY':
        return 'success' as const;
      case 'PENDING':
      case 'STEP_UP_VERIFICATION':
      case 'OPEN':
        return 'warning' as const;
      case 'BLOCKED':
      case 'BLOCK_AND_REVIEW':
      case 'CONFIRMED_FRAUD':
        return 'danger' as const;
      case 'CLOSED':
      default:
        return 'neutral' as const;
    }
  };

  return (
    <Badge variant={getVariant(status)} size={size} dot className={className}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};
