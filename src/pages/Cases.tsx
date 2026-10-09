import React, { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { casesCol, auditLogsCol, caseNotesCol } from '../firebase/collections';
import { AuditLog, Case, CaseStatus } from '../types';
import { 
  FolderKanban, Search, X, 
  Clock, ShieldAlert, MessageSquare,
  FileText, User,
  AlertTriangle, ArrowUpRight, RotateCcw,
  RefreshCw, Check, ShieldCheck
} from 'lucide-react';
import { FraudCaseReportModal } from '../components/reports/FraudCaseReportModal';
import { DEMO_ANALYSTS, DemoAnalyst } from '../data/analystIdentities';
import { CaseResolutionModal } from '../components/cases/CaseResolutionModal';

export const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Phase 10: Acting Analyst State (Simulated SOC Identity)
  const [actingAnalyst, setActingAnalyst] = useState<DemoAnalyst>(DEMO_ANALYSTS[0]);

  // Terminal Resolution Modal State
  const [resolutionModalState, setResolutionModalState] = useState<{
    isOpen: boolean;
    targetStatus: 'RESOLVED' | 'FALSE_POSITIVE';
  }>({
    isOpen: false,
    targetStatus: 'RESOLVED',
  });

  // Action feedback & error handling states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Subscribe to real-time /cases collection
  useEffect(() => {
    const q = query(casesCol(), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const casesData: Case[] = [];
        snapshot.forEach((docSnap) => {
          casesData.push({ ...docSnap.data(), id: docSnap.id } as Case);
        });
        setCases(casesData);

        // Update selected case in-place if open
        if (selectedCase) {
          const updated = casesData.find((c) => c.id === selectedCase.id);
          if (updated) setSelectedCase(updated);
        }
      },
      (err) => {
        console.warn('[Cases] Firestore snapshot error:', err);
        setActionError('Failed to synchronize cases from Firestore.');
      }
    );
    return () => unsubscribe();
  }, [selectedCase]);

  // 2. Subscribe to real-time /audit_logs for selected case
  useEffect(() => {
    if (!selectedCase) {
      setAuditLogs([]);
      return;
    }
    const q = query(auditLogsCol(), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AuditLog;
          if (
            data.objectId === selectedCase.id ||
            data.details?.caseId === selectedCase.id ||
            data.objectId === selectedCase.transactionId ||
            data.details?.transactionId === selectedCase.transactionId
          ) {
            logs.push({ ...data, id: docSnap.id });
          }
        });
        setAuditLogs(logs);
      },
      (err) => {
        console.warn('[Cases] Audit logs snapshot error:', err);
      }
    );
    return () => unsubscribe();
  }, [selectedCase]);

  // 3. Filter cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assignedTo && c.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE')
      return c.status === 'NEW' || c.status === 'OPEN' || c.status === 'INVESTIGATING';
    if (statusFilter === 'ESCALATED') return c.status === 'ESCALATED';
    if (statusFilter === 'TERMINAL')
      return (
        c.status === 'RESOLVED' ||
        c.status === 'FALSE_POSITIVE' ||
        c.status === 'CLOSED'
      );
    return c.status === statusFilter;
  });

  // Clear action notifications after 3 seconds
  useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  // Case Assignment
  const handleAssignCase = async (analystName: string) => {
    if (!selectedCase) return;
    setIsActionLoading(true);
    setActionError(null);

    const prevAssignee = selectedCase.assignedTo || 'Unassigned';
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(casesCol(), selectedCase.id), {
        assignedTo: analystName,
        assignedAt: nowIso,
        assignedBy: actingAnalyst.name,
        updatedAt: nowIso,
      });

      await addDoc(auditLogsCol(), {
        actor: 'INVESTIGATOR',
        actorId: actingAnalyst.id,
        action: 'CASE_ASSIGNED',
        objectType: 'CASE',
        objectId: selectedCase.id,
        details: {
          caseNumber: selectedCase.caseNumber,
          previousAssignee: prevAssignee,
          newAssignee: analystName,
          assignedBy: actingAnalyst.name,
          assignedAt: nowIso,
        },
        createdAt: nowIso,
      });

      setActionSuccess(`Case successfully assigned to ${analystName}.`);
    } catch (err: any) {
      console.error('[Cases] Assign error:', err);
      setActionError(err.message || 'Permission denied or Firestore update failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Intermediate Status Transition (INVESTIGATING, ESCALATED, REOPEN)
  const handleTransitionStatus = async (newStatus: CaseStatus) => {
    if (!selectedCase) return;
    setIsActionLoading(true);
    setActionError(null);

    const prevStatus = selectedCase.status;
    const nowIso = new Date().toISOString();

    try {
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updatedAt: nowIso,
      };

      // If reopening, clear closed date
      if (newStatus === 'INVESTIGATING' && (prevStatus === 'RESOLVED' || prevStatus === 'FALSE_POSITIVE' || prevStatus === 'CLOSED')) {
        updatePayload.closedAt = null;
      }

      await updateDoc(doc(casesCol(), selectedCase.id), updatePayload);

      const actionName =
        newStatus === 'ESCALATED'
          ? 'CASE_ESCALATED'
          : newStatus === 'INVESTIGATING' && (prevStatus === 'RESOLVED' || prevStatus === 'CLOSED')
          ? 'CASE_REOPENED'
          : 'STATUS_CHANGED';

      await addDoc(auditLogsCol(), {
        actor: 'INVESTIGATOR',
        actorId: actingAnalyst.id,
        action: actionName,
        objectType: 'CASE',
        objectId: selectedCase.id,
        details: {
          caseNumber: selectedCase.caseNumber,
          previousStatus: prevStatus,
          newStatus: newStatus,
          actorName: actingAnalyst.name,
          actorRole: actingAnalyst.role,
        },
        createdAt: nowIso,
      });

      setActionSuccess(`Case status updated to ${newStatus}.`);
    } catch (err: any) {
      console.error('[Cases] Status transition error:', err);
      setActionError(err.message || 'Permission denied or Firestore update failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Terminal Outcome Confirmation (RESOLVED / FALSE_POSITIVE)
  const handleConfirmResolution = async (resolution: {
    status: 'RESOLVED' | 'FALSE_POSITIVE';
    reason: string;
    notes: string;
    disposition: 'CONFIRMED_FRAUD' | 'MARKED_LEGITIMATE';
  }) => {
    if (!selectedCase) return;
    const nowIso = new Date().toISOString();
    const prevStatus = selectedCase.status;

    // 1. Update Case Record in Firestore
    await updateDoc(doc(casesCol(), selectedCase.id), {
      status: resolution.status,
      resolutionReason: resolution.reason,
      resolutionNotes: resolution.notes,
      resolvedBy: actingAnalyst.name,
      resolvedAt: nowIso,
      closedAt: nowIso,
      humanDisposition: resolution.disposition,
      humanActionTaken: resolution.reason,
      updatedAt: nowIso,
    });

    // 2. Append to Append-Only Audit Trail
    const actionName = resolution.status === 'RESOLVED' ? 'CASE_RESOLVED' : 'CASE_FALSE_POSITIVE';
    await addDoc(auditLogsCol(), {
      actor: 'INVESTIGATOR',
      actorId: actingAnalyst.id,
      action: actionName,
      objectType: 'CASE',
      objectId: selectedCase.id,
      details: {
        caseNumber: selectedCase.caseNumber,
        previousStatus: prevStatus,
        newStatus: resolution.status,
        reason: resolution.reason,
        notes: resolution.notes,
        disposition: resolution.disposition,
        actorName: actingAnalyst.name,
        actorRole: actingAnalyst.role,
        resolvedAt: nowIso,
      },
      createdAt: nowIso,
    });

    // 3. Append to Case Notes collection
    try {
      await addDoc(caseNotesCol(), {
        caseId: selectedCase.id,
        author: `${actingAnalyst.name} (${actingAnalyst.role})`,
        text: `[${resolution.status}] ${resolution.reason}: ${resolution.notes}`,
        createdAt: nowIso,
      });
    } catch (noteErr) {
      console.warn('[Cases] Note mirror warning:', noteErr);
    }

    setActionSuccess(
      `Case ${selectedCase.caseNumber} finalized as ${resolution.status}. Payment ledger status preserved.`
    );
  };

  // Append Case Note
  const handleAddNote = async () => {
    if (!selectedCase || !newNote.trim()) return;
    setIsActionLoading(true);
    setActionError(null);

    const nowIso = new Date().toISOString();
    const noteText = newNote.trim();

    try {
      // Append to audit_logs
      await addDoc(auditLogsCol(), {
        actor: 'INVESTIGATOR',
        actorId: actingAnalyst.id,
        action: 'NOTE_ADDED',
        objectType: 'CASE',
        objectId: selectedCase.id,
        details: {
          caseNumber: selectedCase.caseNumber,
          note: noteText,
          authorName: actingAnalyst.name,
          authorRole: actingAnalyst.role,
        },
        createdAt: nowIso,
      });

      // Append to case_notes
      try {
        await addDoc(caseNotesCol(), {
          caseId: selectedCase.id,
          author: `${actingAnalyst.name} (${actingAnalyst.role})`,
          text: noteText,
          createdAt: nowIso,
        });
      } catch (e) {
        console.warn('[Cases] Case notes mirror error:', e);
      }

      setNewNote('');
      setActionSuccess('Analyst observation committed to immutable ledger.');
    } catch (err: any) {
      console.error('[Cases] Note error:', err);
      setActionError(err.message || 'Failed to save note. Check Firestore permissions.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[680px] gap-3">
      {/* ─── ACTING ANALYST IDENTITY BAR (SOC WORKSTATION) ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Acting SOC Investigator:
            </span>
          </div>

          {/* Demo Analyst Selector */}
          <select
            value={actingAnalyst.id}
            onChange={(e) => {
              const matched = DEMO_ANALYSTS.find((a) => a.id === e.target.value);
              if (matched) setActingAnalyst(matched);
            }}
            className="text-xs font-semibold bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-[var(--text-primary)] focus:border-indigo-500 focus:outline-none"
          >
            {DEMO_ANALYSTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role} ({a.badge})
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
          <span>Workstation Role:</span>
          <span className="font-bold text-indigo-500">{actingAnalyst.badge}</span>
          <span className="text-[10px] text-[var(--text-muted)]">
            (Client-Side Simulation &bull; Not Production Role Auth)
          </span>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE SPLIT (QUEUE + CASE DETAILS) ────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
        {/* ─── CASE DIRECTORY QUEUE (LEFT) ──────────────────────────────────── */}
        <div
          className={`flex flex-col flex-1 min-w-0 transition-all ${
            selectedCase ? 'hidden lg:flex lg:w-96 shrink-0' : 'w-full'
          }`}
        >
          <div className="glass-card p-4 flex flex-col h-full border-[var(--border-subtle)]">
            {/* Header & Filter strip */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  SOC Case Queue
                </h2>
              </div>
              <span className="badge text-[10px] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                {filteredCases.length} Cases
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter by case, customer, assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-8 text-xs py-1.5"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 mb-3 shrink-0 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'INVESTIGATING', label: 'Investigating' },
                { id: 'ESCALATED', label: 'Escalated' },
                { id: 'TERMINAL', label: 'Resolved' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Case List Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isCritical = c.riskLevel === 'CRITICAL';
                const isResolved = c.status === 'RESOLVED';
                const isFalsePositive = c.status === 'FALSE_POSITIVE';
                const isEscalated = c.status === 'ESCALATED';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                        {c.caseNumber}
                      </span>
                      <span
                        className={`badge text-[9px] font-mono font-bold ${
                          isResolved
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                            : isFalsePositive
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                            : isEscalated
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                            : c.status === 'INVESTIGATING'
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                            : 'bg-slate-500/10 text-slate-600 border border-slate-500/30'
                        }`}
                      >
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1.5 font-mono text-[11px]">
                      <span className="text-[var(--accent)] font-semibold">
                        {c.customerId}
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] text-[10px]">
                      <span
                        className={`badge font-mono ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {c.riskLevel} &bull; {c.riskScore}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[130px]">
                        {c.assignedTo ? `Assigned: ${c.assignedTo.split(' ')[0]}` : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredCases.length === 0 && (
                <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                  No cases found matching filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── CASE DETAILS PANEL (RIGHT) ───────────────────────────────────── */}
        {selectedCase ? (
          <div className="flex-1 flex flex-col glass-card border-[var(--border-subtle)] p-5 overflow-hidden animate-in fade-in duration-150">
            {/* Action Feedback Messages */}
            {actionSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{actionSuccess}</span>
                </div>
                <button onClick={() => setActionSuccess(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {actionError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{actionError}</span>
                </div>
                <button onClick={() => setActionError(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Header bar: Case # + Assignment + Status Workflow + Report Button */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="lg:hidden p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]"
                >
                  <X className="h-4 w-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-primary)] font-mono">
                      {selectedCase.caseNumber}
                    </h2>
                    <span
                      className={`badge text-[10px] font-mono font-bold ${
                        selectedCase.status === 'RESOLVED'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : selectedCase.status === 'FALSE_POSITIVE'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : selectedCase.status === 'ESCALATED'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      }`}
                    >
                      {selectedCase.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Created: {new Date(selectedCase.createdAt).toLocaleString()} &bull; Last
                    Updated: {new Date(selectedCase.updatedAt || selectedCase.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Assignment & Workflow Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Assignee Selector */}
                <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2 py-1">
                  <User className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span className="text-[10px] text-[var(--text-muted)] font-bold">Assignee:</span>
                  <select
                    value={selectedCase.assignedTo || 'Unassigned'}
                    onChange={(e) => handleAssignCase(e.target.value)}
                    disabled={isActionLoading}
                    className="text-xs bg-transparent text-[var(--text-primary)] font-bold outline-none cursor-pointer"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {DEMO_ANALYSTS.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({a.badge})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Transition Action Buttons */}
                {selectedCase.status !== 'RESOLVED' && selectedCase.status !== 'FALSE_POSITIVE' && selectedCase.status !== 'CLOSED' ? (
                  <>
                    {selectedCase.status !== 'INVESTIGATING' && (
                      <button
                        onClick={() => handleTransitionStatus('INVESTIGATING')}
                        disabled={isActionLoading}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                        title="Mark case as actively under investigation"
                      >
                        Investigate
                      </button>
                    )}

                    {selectedCase.status !== 'ESCALATED' && (
                      <button
                        onClick={() => handleTransitionStatus('ESCALATED')}
                        disabled={isActionLoading}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
                        title="Escalate to Tier 3 Lead"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        <span>Escalate</span>
                      </button>
                    )}

                    {/* Terminal Outcome Buttons */}
                    <button
                      onClick={() =>
                        setResolutionModalState({
                          isOpen: true,
                          targetStatus: 'RESOLVED',
                        })
                      }
                      disabled={isActionLoading}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
                      title="Resolve case as confirmed fraud"
                    >
                      Resolve Fraud
                    </button>

                    <button
                      onClick={() =>
                        setResolutionModalState({
                          isOpen: true,
                          targetStatus: 'FALSE_POSITIVE',
                        })
                      }
                      disabled={isActionLoading}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                      title="Resolve case as false positive / benign"
                    >
                      False Positive
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleTransitionStatus('INVESTIGATING')}
                    disabled={isActionLoading}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-xs font-bold text-[var(--text-secondary)] shadow-xs transition"
                    title="Reopen case for further investigation"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reopen Case</span>
                  </button>
                )}

                {/* Forensic Report Button */}
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  title="Open Explainable Fraud Investigation Report"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Forensic Report</span>
                </button>

                <button
                  onClick={() => setSelectedCase(null)}
                  className="hidden lg:flex p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded text-[var(--text-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 flex flex-col lg:flex-row gap-5">
              {/* Left Column: Metrics & Findings */}
              <div className="w-full lg:w-2/3 space-y-4">
                {/* Metric Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Risk Evaluation
                    </div>
                    <div className="font-bold text-xs text-[#C43D4B] mt-1 font-mono">
                      {selectedCase.riskLevel} ({selectedCase.riskScore} pts)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Customer Target
                    </div>
                    <div className="font-mono text-xs font-bold text-[var(--accent)] mt-1 truncate">
                      {selectedCase.customerId}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Triggering Transaction
                    </div>
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                      {selectedCase.transactionId}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Autonomous AI Policy
                    </div>
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                      {selectedCase.recommendation.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* Human Resolution Banner (If terminal outcome reached) */}
                {(selectedCase.status === 'RESOLVED' || selectedCase.status === 'FALSE_POSITIVE') && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      selectedCase.status === 'RESOLVED'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedCase.status === 'RESOLVED' ? (
                          <ShieldAlert className="h-4 w-4 text-rose-500" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Human Investigator Determination:{' '}
                          <span
                            className={
                              selectedCase.status === 'RESOLVED'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {selectedCase.humanDisposition || selectedCase.status}
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Resolved: {selectedCase.resolvedAt ? new Date(selectedCase.resolvedAt).toLocaleString() : 'Recorded'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                          Resolution Reason:
                        </span>{' '}
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedCase.resolutionReason || selectedCase.humanActionTaken || 'Documented outcome'}
                        </span>
                      </div>
                      {selectedCase.resolutionNotes && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Analyst Observations:
                          </span>
                          <p className="italic text-[11px] text-[var(--text-secondary)] mt-0.5">
                            "{selectedCase.resolutionNotes}"
                          </p>
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--text-muted)] pt-1">
                        Resolved By: <strong className="text-[var(--text-primary)]">{selectedCase.resolvedBy || 'Lead Analyst'}</strong> &bull; Payment Ledger: <strong className="text-rose-500">BLOCKED (Preserved)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Investigation Narrative */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                    <ShieldAlert className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>Autonomous 11-Agent Narrative Summary</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {selectedCase.investigationSummary ||
                      selectedCase.verdict ||
                      'No summary narrative on record.'}
                  </p>
                </div>

                {/* Triggered Reason Codes */}
                {selectedCase.reasonCodes && selectedCase.reasonCodes.length > 0 && (
                  <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5">
                    <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                      Triggered Reason Codes
                    </div>
                    <div className="space-y-1.5">
                      {selectedCase.reasonCodes.map((rc: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-subtle)]"
                        >
                          <span className="font-medium text-[var(--text-primary)]">
                            {rc.title}
                          </span>
                          <span className="font-mono text-[#C43D4B] font-bold text-[11px]">
                            +{rc.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Case Notes & Audit Trail */}
              <div className="w-full lg:w-1/3 flex flex-col gap-4">
                {/* Analyst Note Input */}
                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>Append Case Note</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      as {actingAnalyst.name.split(' ')[0]}
                    </span>
                  </div>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter forensic notes or customer verification rationale..."
                    className="input-field text-xs h-20 resize-none mb-2"
                    disabled={isActionLoading}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isActionLoading}
                      className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save to Ledger</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Audit History Timeline */}
                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-1 min-h-[300px] flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>Chronological Activity Ledger</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                      {auditLogs.length} Events
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative before:absolute before:inset-0 before:ml-[7px] before:w-0.5 before:bg-[var(--border-subtle)] pr-1">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="relative flex items-start gap-3 pl-1">
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-[var(--bg-surface)] border-2 shrink-0 mt-0.5 z-10 ${
                            log.action.includes('RESOLVED')
                              ? 'border-rose-500'
                              : log.action.includes('FALSE_POSITIVE')
                              ? 'border-emerald-500'
                              : log.action.includes('ASSIGNED')
                              ? 'border-blue-500'
                              : 'border-[var(--accent)]'
                          }`}
                        />
                        <div className="bg-[var(--bg-surface-subtle)] p-2.5 rounded-lg border border-[var(--border-subtle)] flex-1 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[var(--text-primary)] text-[11px]">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono">
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                            {log.details.note ? (
                              <div>
                                <span className="italic">"{String(log.details.note)}"</span>
                                {Boolean(log.details.authorName) && (
                                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                    &bull; {String(log.details.authorName)} ({String(log.details.authorRole || 'Analyst')})
                                  </div>
                                )}
                              </div>
                            ) : log.details.newAssignee ? (
                              <span>
                                Assigned to <strong>{String(log.details.newAssignee)}</strong> by{' '}
                                {String(log.details.assignedBy || 'Lead')}
                              </span>
                            ) : log.details.newStatus ? (
                              <span>
                                Status changed from <strong>{String(log.details.previousStatus)}</strong> to{' '}
                                <strong>{String(log.details.newStatus)}</strong>
                                {Boolean(log.details.actorName) && (
                                  <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
                                    by {String(log.details.actorName)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] truncate block">
                                {JSON.stringify(log.details)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {auditLogs.length === 0 && (
                      <div className="text-center py-8 text-[var(--text-muted)] text-[11px]">
                        No activity events logged yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center glass-card border-[var(--border-subtle)] p-12 text-center text-[var(--text-muted)]">
            <FolderKanban className="h-8 w-8 opacity-30 mb-2" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Select a Fraud Case
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
              Select any case from the queue to assign investigators, transition lifecycles, and
              append forensic observations to the immutable audit ledger.
            </p>
          </div>
        )}
      </div>

      {/* ─── TERMINAL RESOLUTION CONFIRMATION MODAL ─────────────────────────── */}
      <CaseResolutionModal
        isOpen={resolutionModalState.isOpen}
        onClose={() =>
          setResolutionModalState((prev) => ({ ...prev, isOpen: false }))
        }
        caseData={selectedCase}
        targetStatus={resolutionModalState.targetStatus}
        actingAnalyst={actingAnalyst}
        onConfirm={handleConfirmResolution}
      />

      {/* ─── EXPLAINABLE FRAUD CASE REPORT MODAL ──────────────────────────────── */}
      <FraudCaseReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        caseData={selectedCase}
      />
    </div>
  );
};

export default Cases;
