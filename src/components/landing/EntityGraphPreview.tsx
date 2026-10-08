import React from 'react';
import { Network, User, CreditCard, Laptop, Globe, Store, ArrowRight } from 'lucide-react';

interface EntityGraphPreviewProps {
  onExploreGraph: () => void;
}

export const EntityGraphPreview: React.FC<EntityGraphPreviewProps> = ({ onExploreGraph }) => {
  return (
    <section id="entity-graph-preview" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Visual Graph Preview */}
          <div className="order-2 lg:order-1 relative">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-colors duration-300">
              <div className="flex items-center justify-between pb-3 mb-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] tracking-wide">
                    ENTITY RELATIONSHIP CLUSTER
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--success)] font-semibold">Multi-Hop Resolved</span>
              </div>

              {/* Hierarchical Visual Representation */}
              <div className="flex flex-col items-center gap-4 py-2">
                {/* Node: Customer */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--surface-muted)] shadow-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[var(--text-primary)]">Customer Node</div>
                    <div className="text-[9px] font-mono text-[var(--text-secondary)]">CUST-88392 (Rajesh Sharma)</div>
                  </div>
                </div>

                {/* Vector down */}
                <div className="h-4 w-0.5 bg-[var(--accent)]/50" />

                {/* Node: Account */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--surface-muted)] shadow-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[var(--text-primary)]">Account Node</div>
                    <div className="text-[9px] font-mono text-[var(--text-secondary)]">ACC-4491 • Bank Alpha</div>
                  </div>
                </div>

                {/* Vector down */}
                <div className="h-4 w-0.5 bg-[var(--secondary)]/50" />

                {/* Node: Transaction */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--danger)]/50 bg-[var(--surface-muted)] shadow-md ring-2 ring-[var(--danger)]/20">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--danger)] text-white">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[var(--text-primary)]">Transaction Node</div>
                    <div className="text-[9px] font-mono text-[var(--danger)] font-semibold">₹85,000 • CRITICAL (100)</div>
                  </div>
                </div>

                {/* Vector branch into 3 children */}
                <div className="w-48 h-3 border-t-2 border-x-2 border-[var(--accent)]/40 rounded-t-lg mt-1" />

                {/* Leaf Nodes */}
                <div className="grid grid-cols-3 gap-2 w-full pt-1">
                  {/* Device */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                    <Laptop className="h-4 w-4 text-[var(--accent)] mx-auto mb-1" />
                    <div className="text-[10px] font-bold text-[var(--text-primary)]">Device</div>
                    <div className="text-[8px] font-mono text-[var(--text-muted)]">New Fingerprint</div>
                  </div>

                  {/* Network */}
                  <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--surface)] p-2 text-center">
                    <Globe className="h-4 w-4 text-[var(--danger)] mx-auto mb-1" />
                    <div className="text-[10px] font-bold text-[var(--text-primary)]">Network</div>
                    <div className="text-[8px] font-mono text-[var(--danger)] font-semibold">TOR Exit Node</div>
                  </div>

                  {/* Merchant */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                    <Store className="h-4 w-4 text-[var(--success)] mx-auto mb-1" />
                    <div className="text-[10px] font-bold text-[var(--text-primary)]">Merchant</div>
                    <div className="text-[8px] font-mono text-[var(--text-muted)]">Global Crypto Ex</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative & CTA */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] mb-4">
              <Network className="h-3.5 w-3.5" />
              TOPOLOGICAL FRAUD DISCOVERY
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              Unmask Hidden Syndicates with{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                Entity Intelligence
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">
              Fraudsters rarely act through isolated accounts. FinGuard links customers, payment instruments,
              hardware telemetry, proxy nodes, and merchant endpoints into an interactive topological graph.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { label: 'Multi-Hop Ring Traversal', desc: 'Identify mule rings sharing common device hardware or shadow IPs across banks' },
                { label: 'Visual Force-Directed Topology', desc: 'Zoom, pan, and filter nodes by risk score, anomaly type, or entity class' },
                { label: 'Instant Entity Forensics', desc: 'Click any node to inspect raw telemetry, transaction history, and associated flags' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-[var(--text-primary)]">{item.label}: </strong>
                    <span className="text-[var(--text-secondary)]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onExploreGraph}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Explore Entity Intelligence</span>
              <ArrowRight className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
