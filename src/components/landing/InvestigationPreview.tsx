import React from 'react';
import {
  Bot,
  ArrowRight,
  Gauge,
} from 'lucide-react';

interface InvestigationPreviewProps {
  onExploreCockpit: () => void;
}

export const InvestigationPreview: React.FC<InvestigationPreviewProps> = ({ onExploreCockpit }) => {
  const steps = [
    { title: 'Risk Score', value: '100 / 100', color: 'text-[#FF6577]', badge: 'CRITICAL' },
    { title: '11-Agent Pipeline', value: '11 / 11 Complete', color: 'text-[#7C5CFC]', badge: 'PARALLEL' },
    { title: 'Evidence Correlation', value: '7 Signals Linked', color: 'text-[#22D3EE]', badge: 'CONVERGED' },
    { title: 'Entity Graph', value: '4-Hop Cluster', color: 'text-amber-400', badge: 'RESOLVED' },
    { title: 'Human Decision', value: 'Approved Hold', color: 'text-emerald-400', badge: 'VERIFIED' },
    { title: 'Case Sealed', value: 'Case C1003', color: 'text-[#3157D5]', badge: 'AUDITED' },
  ];

  return (
    <section id="investigations-preview" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--secondary)]/30 bg-[var(--secondary)]/10 text-[11px] font-mono uppercase tracking-wider text-[var(--secondary)] mb-4">
            <Bot className="h-3.5 w-3.5" />
            AUTONOMOUS COCKPIT WORKSPACE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
            From Suspicious Transaction{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--secondary)] to-[var(--danger)] bg-clip-text text-transparent">
              to Explainable Decision
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            No black-box guesses. FinGuard provides fraud analysts with complete mathematical transparency,
            agent forensic findings, and verifiable reason codes.
          </p>
        </div>

        {/* Visual Cockpit Showcase Card */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-colors duration-300">
          {/* Top telemetry strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--danger)] animate-ping" />
              <span className="text-xs font-mono font-bold text-[var(--text-primary)]">INVESTIGATION DOSSIER</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-xs font-mono text-[var(--primary)] font-semibold">TX-89201 (₹85,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)]">
                CRITICAL • 100/100
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--success)]/15 border border-[var(--success)]/30 text-[var(--success)]">
                ACTION: BLOCK &amp; CREATE CASE
              </span>
            </div>
          </div>

          {/* Sequential Progression Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
            {steps.map((st, idx) => (
              <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  {st.title}
                </div>
                <div className={`text-xs font-mono font-bold ${st.color} mb-1`}>
                  {st.value}
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                  {st.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Mini Mockup of Topology & AI Brief */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] mb-2">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-[var(--secondary)]" />
                  AI Executive Brief
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Gemini 1.5 Pro</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                &quot;Transaction of ₹85,000 flagged for immediate intervention due to a 940 km/h impossible travel vector between Mumbai and Delhi, combined with an active TOR Exit Node and duplicate SIM-swap telemetry.&quot;
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] mb-2">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Deterministic Reason Codes
                  </span>
                  <span className="text-[10px] font-mono text-[var(--accent)]">7 Triggers</span>
                </div>
                <div className="space-y-1 text-[11px] font-mono text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>IMPOSSIBLE_TRAVEL_SPEED</span>
                    <span className="text-[var(--danger)] font-semibold">+25 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TOR_EXIT_NODE_DETECTED</span>
                    <span className="text-[var(--danger)] font-semibold">+20 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TRANSACTION_VELOCITY_SPIKE</span>
                    <span className="text-[var(--danger)] font-semibold">+20 pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action CTA */}
          <div className="mt-6 pt-5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-[var(--text-secondary)]">
              Interactive 11-agent timeline with fullscreen canvas, topology zoom, and evidence cards.
            </span>
            <button
              onClick={onExploreCockpit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-bold shadow-md shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Explore Investigation Cockpit</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
