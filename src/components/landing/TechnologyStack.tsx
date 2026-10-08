import React from 'react';
import {
  Code2,
  Database,
  Flame,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TechnologyStack: React.FC = () => {
  const stack = [
    {
      name: 'React 18 & TypeScript',
      category: 'UI & State Engine',
      desc: 'Type-safe reactive dashboard architecture ensuring predictable multi-node state synchronization.',
      icon: Code2,
      color: 'text-[#22D3EE]',
      bgColor: 'bg-[#22D3EE]/10 border-[#22D3EE]/30',
    },
    {
      name: 'Google Firebase Auth',
      category: 'Identity & Access',
      desc: 'Role-guarded investigator authentication sessions with zero external credential leakage.',
      icon: Flame,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10 border-amber-400/30',
    },
    {
      name: 'Cloud Firestore',
      category: 'Real-time Datastore',
      desc: 'Ultra low-latency document streaming providing live telemetry updates across client nodes.',
      icon: Database,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10 border-emerald-400/30',
    },
    {
      name: 'Google Gemini 1.5 Pro',
      category: 'AI Narrative Synthesis',
      desc: 'High-fidelity forensic synthesis generating explainable analyst briefs and investigative recommendations.',
      icon: Sparkles,
      color: 'text-[#7C5CFC]',
      bgColor: 'bg-[#7C5CFC]/10 border-[#7C5CFC]/30',
    },
    {
      name: 'Deterministic Risk Engine',
      category: 'Mathematical Scoring (0–100)',
      desc: 'Zero-hallucination mathematical scoring evaluating weighted telemetry and calibrated risk thresholds.',
      icon: Cpu,
      color: 'text-[#3157D5]',
      bgColor: 'bg-[#3157D5]/10 border-[#3157D5]/30',
    },
    {
      name: 'Multi-Agent Pipeline',
      category: 'Autonomous Investigation',
      desc: '11 parallel AI agents executing specialized forensic modules across velocity, device, network, and graph.',
      icon: Layers,
      color: 'text-[#FF6577]',
      bgColor: 'bg-[#FF6577]/10 border-[#FF6577]/30',
    },
  ];

  return (
    <section id="technology" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            <Cpu className="h-3.5 w-3.5 text-[var(--primary)]" />
            MODERN ENTERPRISE STACK
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
            Built for{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
              Explainable Fraud Intelligence
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Engineered with a deterministic mathematical foundation, enterprise real-time streaming,
            and multimodal intelligence for uncompromising forensic auditability.
          </p>
        </div>

        {/* Grid of technologies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {stack.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl backdrop-blur-md hover:border-[var(--border-strong)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.bgColor} shadow-sm`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{item.name}</h3>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.category}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
