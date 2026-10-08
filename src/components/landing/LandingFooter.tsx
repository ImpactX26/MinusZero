import React from 'react';
import { Shield, Lock } from 'lucide-react';

interface LandingFooterProps {
  onOpenAuth: () => void;
  onEnterDemo: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onOpenAuth,
  onEnterDemo,
  onNavigateSection,
}) => {
  return (
    <footer className="relative bg-[var(--surface-muted)] text-[var(--text-primary)] border-t border-[var(--border)] overflow-hidden transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand & Wordmark */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-md">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                FinGuard <span className="text-[var(--accent)] font-extrabold">AI</span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-6">
              Autonomous fraud intelligence platform engineered to detect, correlate, investigate,
              and neutralize coordinated financial crimes in real time.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onEnterDemo}
                className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold transition-all"
              >
                Launch Demo Environment
              </button>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold transition-all"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4">
              Intelligence Modules
            </h4>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li>
                <button
                  onClick={() => onNavigateSection('product')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Product Capabilities
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('simulation-preview')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Multi-Bank Simulation
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('investigations-preview')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Investigation Cockpit
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('entity-graph-preview')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Entity Intelligence Graph
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('cases-preview')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Case Management Docket
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Trust */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4">
              Architecture &amp; Security
            </h4>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li>
                <button
                  onClick={() => onNavigateSection('technology')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  Deterministic Risk Engine
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('how-it-works')}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  11-Agent Investigation Pipeline
                </button>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Lock className="h-3 w-3 text-[var(--success)]" />
                  <span>Immutable Audit Hash Ledger</span>
                </span>
              </li>
              <li>
                <span className="text-[var(--text-muted)] font-mono text-[11px]">
                  Release v3.2 · Hackathon Edition
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            Synthetic data • Demonstration environment • No real financial transactions
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} FinGuard AI Fraud Intelligence Platform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
