import React, { useState } from 'react';
import {
  CreditCard,
  Radio,
  Share2,
  Bot,
  Gauge,
  UserCheck,
  FolderLock,
} from 'lucide-react';

export const HowItWorksPipeline: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(3); // Default to 11 AI Agents for maximum impact

  const stages = [
    {
      id: 0,
      step: '01',
      title: 'TRANSACTION',
      subtitle: 'Ingestion & Telemetry',
      icon: CreditCard,
      color: 'from-[#3157D5] to-[#22D3EE]',
      summary: 'High-velocity synthetic payment streams arrive with device fingerprints, IP addresses, geo-locations, and banking gateway headers.',
      metric: '< 15ms Ingestion Latency',
    },
    {
      id: 1,
      step: '02',
      title: 'SIGNALS',
      subtitle: 'Multi-Vector Extraction',
      icon: Radio,
      color: 'from-[#22D3EE] to-[#19C37D]',
      summary: 'Deconstructs payload into 7+ distinct risk signals: amount spikes, impossible travel speed, proxy/VPN networks, and rapid failed login attempts.',
      metric: '7+ Correlated Telemetry Vectors',
    },
    {
      id: 2,
      step: '03',
      title: 'CORRELATION',
      subtitle: 'Cross-Bank Graph Linkage',
      icon: Share2,
      color: 'from-[#19C37D] to-[#F2B84B]',
      summary: 'Correlates current event across Bank Alpha, Bank Nova, and Bank Horizon to detect syndicate circular transfers and mule networks.',
      metric: '3-Hop Entity Graph Resolution',
    },
    {
      id: 3,
      step: '04',
      title: '11 AI AGENTS',
      subtitle: 'Autonomous Deep Audit',
      icon: Bot,
      color: 'from-[#7C5CFC] to-[#3157D5]',
      summary: 'Parallel execution of specialized agents (Anomaly, Velocity, Device, Network, Behavioral, etc.) synthesizing specialized fraud hypotheses.',
      metric: '11 Concurrent AI Evaluators',
    },
    {
      id: 4,
      step: '05',
      title: 'RISK ENGINE',
      subtitle: 'Deterministic 0–100 Score',
      icon: Gauge,
      color: 'from-[#FF6577] to-[#7C5CFC]',
      summary: 'Mathematical calculation with zero hallucination. Applies calibrated weights to assign definitive scores (e.g., 100/100 CRITICAL) and action flags.',
      metric: 'Deterministic Mathematical Logic',
    },
    {
      id: 5,
      step: '06',
      title: 'HUMAN REVIEW',
      subtitle: 'Analyst Intervention',
      icon: UserCheck,
      color: 'from-[#F2B84B] to-[#FF6577]',
      summary: 'Investigator reviews AI executive brief, evidence dossier, and topology. Human-in-the-loop approves or modifies risk disposition.',
      metric: 'Human-in-the-Loop Governance',
    },
    {
      id: 6,
      step: '07',
      title: 'CASE & LEDGER',
      subtitle: 'Cryptographic Hash Docket',
      icon: FolderLock,
      color: 'from-[#19C37D] to-[#22D3EE]',
      summary: 'Formal case creation (e.g. C1003) sealed into immutable audit trail with timestamp, user ID, and cryptographic hash integrity.',
      metric: 'Tamper-Evident SHA-256 Audit Chain',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[var(--primary)]/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-mono uppercase tracking-wider text-[var(--secondary)] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--secondary)] animate-ping" />
            PIPELINE ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-3">
            How FinGuard Operates in{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--secondary)] to-[var(--danger)] bg-clip-text text-transparent">
              Real Time
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            A seamless 7-stage autonomous intelligence pipeline converting noisy banking streams into decisive forensic cases.
          </p>
        </div>

        {/* ─── HORIZONTAL PIPELINE VISUALIZATION ─── */}
        <div className="relative mb-12">
          {/* Animated Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-[var(--border)] -z-0">
            <div className="h-full w-full bg-gradient-to-r from-[#3157D5] via-[#22D3EE] via-[#7C5CFC] to-[#19C37D] opacity-40" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 relative z-10">
            {stages.map((st) => {
              const Icon = st.icon;
              const isSelected = activeStage === st.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setActiveStage(st.id)}
                  className={`group relative rounded-xl border p-3.5 transition-all duration-300 cursor-pointer flex flex-col items-center text-center ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--surface)] shadow-lg shadow-[var(--primary)]/15 scale-105'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {/* Step pill */}
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] mb-2">
                    {st.step}
                  </span>

                  {/* Icon */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${st.color} text-white shadow-md mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Title */}
                  <span className={`text-xs font-bold tracking-wider leading-tight ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                    {st.title}
                  </span>

                  {/* Subtitle */}
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-1">
                    {st.subtitle}
                  </span>

                  {/* Active selection dot indicator */}
                  {isSelected && (
                    <span className="absolute -bottom-1.5 h-2 w-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--surface)]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── EXPANDED ACTIVE STAGE DETAILS CARD ─── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden max-w-4xl mx-auto transition-colors duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--primary)]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stages[activeStage].color} text-white shadow-lg shadow-black/20`}>
                {React.createElement(stages[activeStage].icon, { className: 'h-7 w-7 text-white' })}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[var(--primary)]">
                    STAGE {stages[activeStage].step}
                  </span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {stages[activeStage].subtitle}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  {stages[activeStage].title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                  {stages[activeStage].summary}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[var(--border)] md:pl-6 flex flex-col justify-center">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider mb-1">
                OPERATIONAL METRIC
              </span>
              <span className="text-sm font-bold text-[var(--primary)] font-mono">
                {stages[activeStage].metric}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1">Verified in prototype</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
