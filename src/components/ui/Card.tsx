import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`glass-card p-5 flex flex-col gap-4 ${
        hoverable ? 'hover:shadow-md cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-[var(--border-subtle)] pb-3">
          {header}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footer && (
        <div className="border-t border-[var(--border-subtle)] pt-3 mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
};
