import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Lock,
  User,
  RefreshCw,
} from 'lucide-react';
import { Case } from '../../types';
import { DemoAnalyst, RESOLUTION_REASONS } from '../../data/analystIdentities';

interface CaseResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case | null;
  targetStatus: 'RESOLVED' | 'FALSE_POSITIVE';
  actingAnalyst: DemoAnalyst;
  onConfirm: (resolution: {
    status: 'RESOLVED' | 'FALSE_POSITIVE';
    reason: string;
    notes: string;
    disposition: 'CONFIRMED_FRAUD' | 'MARKED_LEGITIMATE';
  }) => Promise<void>;
}

export const CaseResolutionModal: React.FC<CaseResolutionModalProps> = ({
  isOpen,
  onClose,
  caseData,
  targetStatus,
  actingAnalyst,
  onConfirm,
}) => {
  const isFraud = targetStatus === 'RESOLVED';
  const defaultDisposition = isFraud ? 'CONFIRMED_FRAUD' : 'MARKED_LEGITIMATE';

  const availableReasons = RESOLUTION_REASONS.filter((r) =>
    isFraud
      ? r.category === 'CONFIRMED_FRAUD' || r.category === 'INCONCLUSIVE'
      : r.category === 'MARKED_LEGITIMATE' || r.category === 'INCONCLUSIVE'
  );

  const [selectedReason, setSelectedReason] = useState<string>(
    availableReasons[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [confirmedCheck, setConfirmedCheck] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !caseData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedReason) {
      setErrorMsg('Please select a formal resolution reason.');
      return;
    }
    if (!notes.trim() || notes.trim().length < 10) {
      setErrorMsg('Analyst observations must be at least 10 characters long.');
      return;
    }
    if (!confirmedCheck) {
      setErrorMsg('You must check the confirmation acknowledgment below.');
      return;
    }

    const reasonDef = RESOLUTION_REASONS.find((r) => r.id === selectedReason);
    const disposition = reasonDef?.category === 'INCONCLUSIVE'
      ? defaultDisposition
      : (reasonDef?.category || defaultDisposition);

    setIsSubmitting(true);
    try {
      await onConfirm({
        status: targetStatus,
        reason: reasonDef?.label || selectedReason,
        notes: notes.trim(),
        disposition,
      });
      onClose();
    } catch (err: any) {
      console.error('[CaseResolutionModal] Error submitting resolution:', err);
      setErrorMsg(err.message || 'Failed to record resolution. Check Firestore permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b border-[var(--border)] ${
            isFraud ? 'bg-rose-500/10' : 'bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white ${
                isFraud ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {isFraud ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {isFraud
                  ? 'Resolve Case: Confirmed Fraud'
                  : 'Resolve Case: False Positive'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Case #{caseData.caseNumber} &bull; Target: {caseData.customerId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Preservation Guardrail Callout */}
          <div className="p-3 rounded-xl bg-[var(--bg-root)] border border-[var(--border)] flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed text-[11px] text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">
                Immutable Ledger Preservation Notice:
              </span>
              <p>
                The operational payment status of Txn{' '}
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {caseData.transactionId}
                </span>{' '}
                and autonomous risk score (
                <span className="font-mono font-bold text-rose-500">
                  {caseData.riskScore} pts
                </span>
                ) will remain strictly preserved. Resolving this case records
                your human investigative disposition without retroactively altering
                ledger data.
              </p>
            </div>
          </div>

          {/* Acting Investigator */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-root)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[11px] text-[var(--text-muted)]">
                Acting Investigator:
              </span>
            </div>
            <div className="font-semibold text-[11px] text-[var(--text-primary)]">
              {actingAnalyst.name}{' '}
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                ({actingAnalyst.role})
              </span>
            </div>
          </div>

          {/* Resolution Reason Select */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Resolution Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none"
              disabled={isSubmitting}
            >
              {availableReasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution Notes / Rationale */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Analyst Observations & Rationale <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail your evidence evaluation, customer contact verification, or forensic hardware justification..."
              rows={3}
              className="w-full bg-[var(--bg-root)] border border-[var(--border)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none resize-none"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-[var(--text-muted)]">
              Minimum 10 characters required for audit trail validation.
            </span>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2 border-t border-[var(--border)]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] text-indigo-600 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                I confirm this terminal determination is supported by available
                telemetry and understand this outcome will be appended to the
                immutable audit ledger.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-xs text-[var(--text-secondary)] font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmedCheck || !notes.trim()}
              className={`px-4 py-1.5 rounded-lg text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50 ${
                isFraud
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Resolution...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    Confirm {isFraud ? 'Fraud Resolution' : 'False Positive'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
