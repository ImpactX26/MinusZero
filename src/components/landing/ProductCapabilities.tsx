import React from 'react';
import {
  Zap,
  Bot,
  Network,
  Share2,
  FolderLock,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';

interface ProductCapabilitiesProps {
  onSelectFeature?: (route: string) => void;
}

export const ProductCapabilities: React.FC<ProductCapabilitiesProps> = ({ onSelectFeature }) => {
  const capabilities = [
    {
      num: '01',
      title: 'Real-Time Detection',
      tagline: 'Sub-second Stream Scoring',
      desc: 'Deterministic mathematical risk scoring (0–100) evaluates transaction telemetry, geo-velocity, device integrity, and network signals instantaneously without hallucination.',
      icon: Zap,
      gradient: 'from-[#3157D5] to-[#22D3EE]',
      accentBorder: 'hover:border-[#22D3EE]/50',
      badge: '0–100 Mathematical Engine',
      route: 'live-events',
    },
    {
      num: '02',
      title: '11-Agent Investigation',
      tagline: 'Autonomous AI Orchestration',
      desc: 'Eleven specialized AI agents run parallel deep investigations into transaction anomalies, velocity patterns, device telemetry, network nodes, and customer behavioral baselines.',
      icon: Bot,
      gradient: 'from-[#7C5CFC] to-[#3157D5]',
      accentBorder: 'hover:border-[#7C5CFC]/50',
      badge: '11 Concurrent AI Workers',
      route: 'investigation-workspace',
    },
    {
      num: '03',
      title: 'Entity Intelligence',
      tagline: 'Multi-Hop Relationship Graph',
      desc: 'Interactive graph visualization correlates customers, accounts, devices, proxy networks, and beneficiary nodes to expose coordinated fraud rings across institutional boundaries.',
      icon: Network,
      gradient: 'from-[#22D3EE] to-[#19C37D]',
      accentBorder: 'hover:border-[#22D3EE]/50',
      badge: 'Multi-Entity Linkage',
      route: 'entity-graph',
    },
    {
      num: '04',
      title: 'Multi-Bank Simulation',
      tagline: 'Synthetic Cross-Bank Arena',
      desc: 'Simulate coordinated syndicates and multi-vector financial attacks across Bank Alpha, Bank Nova, and Bank Horizon in a realistic real-time test environment.',
      icon: Share2,
      gradient: 'from-[#F2B84B] to-[#FF6577]',
      accentBorder: 'hover:border-[#F2B84B]/50',
      badge: 'Cross-Bank Routing',
      route: 'simulation',
    },
    {
      num: '05',
      title: 'Case Management',
      tagline: 'Analyst Cockpit & Docket',
      desc: 'Structured case workflow with human-in-the-loop triage, prioritized criticality, evidence dossier compilation, and one-click disposition decisions.',
      icon: FolderLock,
      gradient: 'from-[#FF6577] to-[#7C5CFC]',
      accentBorder: 'hover:border-[#FF6577]/50',
      badge: 'Human-in-the-Loop',
      route: 'cases',
    },
    {
      num: '06',
      title: 'Audit & Explainability',
      tagline: 'Cryptographic Integrity Chain',
      desc: 'Every signal, mathematical rule calculation, agent finding, and human action is recorded in an immutable, tamper-evident audit ledger with Gemini narrative synthesis.',
      icon: FileCheck2,
      gradient: 'from-[#19C37D] to-[#3157D5]',
      accentBorder: 'hover:border-[#19C37D]/50',
      badge: 'Immutable Hash Ledger',
      route: 'cases',
    },
  ];

  return (
    <section id="product" className="relative py-24 bg-[var(--background)] text-[var(--foreground)] overflow-hidden border-t border-[var(--border)] dark:border-white/5 transition-colors duration-200">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#3157D5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#7C5CFC]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] dark:border-white/10 bg-[var(--surface-muted)] dark:bg-white/5 text-[11px] font-mono uppercase tracking-wider text-[#3157D5] dark:text-[#22D3EE] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3157D5] dark:bg-[#22D3EE] animate-pulse" />
            ENTERPRISE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] dark:text-white mb-4">
            One Intelligence Layer.{' '}
            <span className="bg-gradient-to-r from-[#22D3EE] via-[#7C5CFC] to-[#3157D5] bg-clip-text text-transparent">
              Complete Fraud Investigation.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-slate-300 leading-relaxed">
            From raw transaction ingestion through multi-bank graph correlation and autonomous agent triage,
            FinGuard unites every phase of financial crime detection.
          </p>
        </div>

        {/* 6 Asymmetric Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.num}
                onClick={() => onSelectFeature && onSelectFeature(cap.route)}
                className={`group relative rounded-2xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0B1730]/80 p-6 sm:p-7 shadow-card dark:shadow-xl dark:shadow-black/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated hover:border-[#3157D5]/40 dark:hover:shadow-2xl dark:hover:shadow-[#3157D5]/15 ${cap.accentBorder} cursor-pointer flex flex-col justify-between`}
              >
                {/* Subtle top indicator bar */}
                <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${cap.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

                <div>
                  {/* Card Header with Number and Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cap.gradient} text-white shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-mono font-bold text-[var(--text-muted)]/30 dark:text-white/20 group-hover:text-[var(--text-muted)]/60 dark:group-hover:text-white/40 transition-colors">
                      {cap.num}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#3157D5] dark:text-[#22D3EE] font-semibold">
                      {cap.tagline}
                    </span>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] dark:text-white group-hover:text-[#3157D5] dark:group-hover:text-[#22D3EE] transition-colors mt-0.5">
                      {cap.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--text-secondary)] dark:text-slate-300 leading-relaxed mb-5">
                    {cap.desc}
                  </p>
                </div>

                {/* Footer with badge and explore arrow */}
                <div className="pt-4 border-t border-[var(--border)] dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-muted)] dark:bg-white/5 text-[var(--text-muted)] dark:text-slate-300 border border-[var(--border)] dark:border-white/10">
                    {cap.badge}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] dark:text-slate-400 group-hover:text-[var(--primary)] dark:group-hover:text-white group-hover:translate-x-1 transition-all">
                    <span>Explore</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
