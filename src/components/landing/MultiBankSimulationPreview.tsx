import React from 'react';
import { Building2, ArrowRight, Activity, ShieldAlert, Sparkles } from 'lucide-react';

interface MultiBankSimulationPreviewProps {
  onLaunchSimulation: () => void;
}

export const MultiBankSimulationPreview: React.FC<MultiBankSimulationPreviewProps> = ({
  onLaunchSimulation,
}) => {
  return (
    <section id="simulation-preview" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Headline and Pitch */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11px] font-mono uppercase tracking-wider text-amber-500 mb-4">
              <Sparkles className="h-3 w-3" />
              MULTI-INSTITUTION ATTACK SIMULATION
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              See Fraud Unfold in{' '}
              <span className="bg-gradient-to-r from-amber-500 via-[var(--danger)] to-[var(--secondary)] bg-clip-text text-transparent">
                Real Time
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">
              Simulate coordinated attacks across synthetic financial institutions and watch FinGuard investigate them as they happen.
              Watch cross-bank account takeovers, circular velocity layering, and coordinated mule syndicates get intercepted within seconds.
            </p>

            {/* Bullet features */}
            <div className="space-y-3 mb-8">
              {[
                { title: 'Three Synthetic Banking Gateways', desc: 'Bank Alpha, Bank Nova, and Bank Horizon with isolated ledger states' },
                { title: 'Interactive Syndicate Injection', desc: 'Trigger coordinated mule rings or automated velocity strikes on demand' },
                { title: 'Live Agent Defense Feed', desc: 'Real-time telemetry stream showing 11 agents dispatching counter-measures' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mt-0.5">
                    <Activity className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{item.title}: </span>
                    <span className="text-xs text-[var(--text-secondary)]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={onLaunchSimulation}
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[var(--danger)] to-[var(--secondary)] text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Launch Live Simulation</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Right Column: Visual Tri-Bank Arena Preview */}
          <div className="relative">
            <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden transition-colors duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] tracking-wide">
                    CROSS-BANK SYNDICATE TOPOLOGY
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold">
                  ATTACK SCENARIO ACTIVE
                </span>
              </div>

              {/* Bank Nodes Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6 relative">
                {/* Bank Alpha */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center">
                  <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] mb-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Bank Alpha</div>
                  <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">Victim Node</div>
                  <div className="mt-2 text-[10px] font-mono font-semibold text-[var(--danger)] bg-[var(--danger)]/10 rounded py-0.5">
                    -₹85,000
                  </div>
                </div>

                {/* Bank Nova */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center">
                  <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-[var(--secondary)]/15 text-[var(--secondary)] mb-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Bank Nova</div>
                  <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">Mule Layer 1</div>
                  <div className="mt-2 text-[10px] font-mono font-semibold text-amber-500 bg-amber-500/10 rounded py-0.5">
                    → ₹42,500 × 2
                  </div>
                </div>

                {/* Bank Horizon */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center">
                  <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-[var(--success)]/15 text-[var(--success)] mb-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Bank Horizon</div>
                  <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">Target Vault</div>
                  <div className="mt-2 text-[10px] font-mono font-semibold text-[var(--success)] bg-[var(--success)]/10 rounded py-0.5">
                    INTERCEPTED
                  </div>
                </div>
              </div>

              {/* Interception banner */}
              <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--danger)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Syndicate Smurfing Detected</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[var(--danger)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--danger)]/20 shadow-sm">
                  LOCKED IN 320ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
