import React from 'react';
import {
  FolderLock,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  Lock,
  CheckCircle2,
  FileSearch,
  Scale,
} from 'lucide-react';

interface CaseManagementPreviewProps {
  onViewCases: () => void;
}

export const CaseManagementPreview: React.FC<CaseManagementPreviewProps> = ({ onViewCases }) => {
  return (
    <section id="cases-preview" className="relative py-24 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden border-t border-[var(--border)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Case Narrative & CTA */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[11px] font-mono uppercase tracking-wider text-[var(--danger)] mb-4">
              <FolderLock className="h-3.5 w-3.5" />
              FORENSIC CASE MANAGEMENT
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              From Detection to Legal Defense with{' '}
              <span className="bg-gradient-to-r from-[var(--danger)] via-amber-500 to-[var(--secondary)] bg-clip-text text-transparent">
                Explainable Case Files
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">
              When high-risk fraud triggers an alert, FinGuard compiles complete evidence dossiers with
              deterministic mathematical scores, multi-agent hypotheses, and immutable cryptographic audit hashes.
            </p>

            {/* 4 Pillars of Case Docket */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <FileSearch className="h-4 w-4 text-[var(--accent)] mb-1.5" />
                <div className="text-xs font-bold text-[var(--text-primary)]">Evidence Dossier</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">7 verified signal proofs</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <Scale className="h-4 w-4 text-[var(--secondary)] mb-1.5" />
                <div className="text-xs font-bold text-[var(--text-primary)]">Investigation</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">11-agent parallel consensus</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] mb-1.5" />
                <div className="text-xs font-bold text-[var(--text-primary)]">Decision Logic</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Human approved block</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <FileCheck2 className="h-4 w-4 text-amber-500 mb-1.5" />
                <div className="text-xs font-bold text-[var(--text-primary)]">Audit Trail</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">SHA-256 hash sealed</div>
              </div>
            </div>

            <button
              onClick={onViewCases}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--danger)] to-[var(--secondary)] text-white text-xs font-bold shadow-lg shadow-[var(--danger)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>View Case Intelligence</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Right Column: Case C1003 Live Card Mockup */}
          <div className="relative">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-colors duration-300">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--danger)]/15 text-[var(--danger)]">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">CASE FILE: C1003</span>
                    <div className="text-[10px] text-[var(--text-muted)]">Target: Bank Alpha Gateway</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)]">
                  CRITICAL
                </span>
              </div>

              {/* Transaction Highlight */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">Interception Value</span>
                  <span className="text-lg font-mono font-bold text-[var(--text-primary)]">₹85,000</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Correlated Signals</span>
                  <span className="font-mono text-[var(--primary)] font-semibold">7 Correlated Signals</span>
                </div>
              </div>

              {/* Decision Action Banner */}
              <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[var(--success)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Action Executed</span>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--success)]">
                  BLOCK &amp; CREATE CASE
                </span>
              </div>

              {/* Hash Integrity Strip */}
              <div className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] p-3 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                <span className="truncate max-w-[220px]">
                  HASH: 8f2b3e4a7c1d904b...6e5f
                </span>
                <span className="text-[var(--success)] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  SEALED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
