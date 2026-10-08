import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-3 transition-colors mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-xs">
            <span className="text-[var(--text-primary)] font-semibold">FinGuard AI</span>
            {' '}— Autonomous Fraud Intelligence Platform
          </span>
        </div>

        {/* Disclaimer */}
        <div className="text-[11px] text-[var(--text-muted)] font-medium">
          Synthetic Data • Demo Environment
        </div>
      </div>
    </footer>
  );
};
