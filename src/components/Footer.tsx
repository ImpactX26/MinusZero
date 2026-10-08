import React from 'react';
import { Shield, Cpu, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-4 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="terminal-text text-xs">
            <span className="text-[var(--text-secondary)] font-medium">FinGuard AI</span>
            {' '}— Autonomous Fraud Triaging Platform
          </span>
        </div>

        {/* Center: system info */}
        <div className="hidden sm:flex items-center gap-4 terminal-text text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            <span>finguard-ai-prototype</span>
          </div>
          <span>·</span>
          <span>Firebase v11 SDK</span>
          <span>·</span>
          <span>Vite 6 · React 18 · TS</span>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-1">
          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="terminal-text text-[11px] text-amber-800 dark:text-amber-300">
            Synthetic data · No real payments · No regulatory claims
          </span>
        </div>
      </div>
    </footer>
  );
};
