import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Activity,
  ShieldCheck,
  AlertCircle,
  Filter,
  RotateCcw,
  Clock,
  UserCheck,
  Info,
  Calendar,
  Layers,
  Search,
  FolderKanban,
  Database,
  Eye,
  X,
  Scale,
} from 'lucide-react';
import { transactionsCol, casesCol, investigationsCol, auditLogsCol } from '../firebase/collections';
import { query, onSnapshot } from 'firebase/firestore';
import { Transaction, Case, Investigation, AuditLog } from '../types';
import { SYNTHETIC_TRANSACTIONS } from '../data/scenarios';
import { FraudCaseReportModal } from '../components/reports/FraudCaseReportModal';

// ============================================================================
// Types & Helper Interfaces
// ============================================================================
type DateRangeFilter = 'ALL' | '24H' | '7D' | '30D';
type OutcomeFilter = 'ALL' | 'BLOCKED' | 'APPROVAL_REQUIRED' | 'COMPLETED' | 'CANCELLED';
type RiskBandFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type CaseStatusFilter = 'ALL' | 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE';
type DatasetSource = 'LIVE_ONLY' | 'HYBRID_WITH_SYNTHETIC';

export const Analytics: React.FC = () => {
  // ─── 1. Firestore Raw State Collections ────────────────────────────────────
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [liveCases, setLiveCases] = useState<Case[]>([]);
  const [liveInvestigations, setLiveInvestigations] = useState<Investigation[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── 2. Controls & Filter State ────────────────────────────────────────────
  const [datasetSource, setDatasetSource] = useState<DatasetSource>('LIVE_ONLY');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [riskBandFilter, setRiskBandFilter] = useState<RiskBandFilter>('ALL');
  const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── 3. Modals & Drill-down State ──────────────────────────────────────────
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [activeDrillTab, setActiveDrillTab] = useState<'TRANSACTIONS' | 'CASES'>('TRANSACTIONS');
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    caseData?: Case | null;
    transactionData?: Transaction | null;
  }>({ isOpen: false });

  // ─── 4. Real-time Subscriptions (Clean Single Listener per Collection) ──────
  useEffect(() => {
    setIsLoading(true);

    const unsubTx = onSnapshot(
      query(transactionsCol()),
      (snap) => {
        const txs: Transaction[] = [];
        snap.forEach((d) => {
          txs.push({ ...d.data(), transaction_id: d.id, id: d.id } as Transaction);
        });
        setLiveTransactions(txs);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[Analytics] Transactions listener warning:', err);
        setIsLoading(false);
      }
    );

    const unsubCases = onSnapshot(
      query(casesCol()),
      (snap) => {
        const cases: Case[] = [];
        snap.forEach((d) => {
          cases.push({ ...d.data(), id: d.id } as Case);
        });
        setLiveCases(cases);
      },
      (err) => console.warn('[Analytics] Cases listener warning:', err)
    );

    const unsubInv = onSnapshot(
      query(investigationsCol()),
      (snap) => {
        const invs: Investigation[] = [];
        snap.forEach((d) => invs.push(d.data() as Investigation));
        setLiveInvestigations(invs);
      },
      (err) => console.warn('[Analytics] Investigations listener warning:', err)
    );

    const unsubAudit = onSnapshot(
      query(auditLogsCol()),
      (snap) => {
        const logs: AuditLog[] = [];
        snap.forEach((d) => logs.push({ ...d.data(), id: d.id } as AuditLog));
        setLiveAuditLogs(logs);
      },
      (err) => console.warn('[Analytics] Audit logs listener warning:', err)
    );

    return () => {
      unsubTx();
      unsubCases();
      unsubInv();
      unsubAudit();
    };
  }, []);

  // ─── 5. Consolidated & Deduplicated Base Datasets ──────────────────────────
  const baseTransactions = useMemo(() => {
    const txMap = new Map<string, Transaction>();

    // If hybrid mode selected, include synthetic baseline
    if (datasetSource === 'HYBRID_WITH_SYNTHETIC') {
      SYNTHETIC_TRANSACTIONS.forEach((tx) => {
        const key = tx.transaction_id || tx.id || '';
        if (key) txMap.set(key, { ...tx, notes: tx.notes || 'Synthetic Baseline Fixture' });
      });
    }

    // Live transactions override or add to map (deduplicated by ID)
    liveTransactions.forEach((tx) => {
      const key = tx.transaction_id || tx.id || '';
      if (key) txMap.set(key, tx);
    });

    return Array.from(txMap.values());
  }, [liveTransactions, datasetSource]);

  const baseCases = useMemo(() => {
    const caseMap = new Map<string, Case>();
    liveCases.forEach((c) => {
      if (c.id) caseMap.set(c.id, c);
    });
    return Array.from(caseMap.values());
  }, [liveCases]);

  // ─── 6. Date Range Filtering Utility ───────────────────────────────────────
  const now = useMemo(() => new Date(), [dateRange]);

  const isWithinDateRange = (isoTimestamp?: string): boolean => {
    if (!isoTimestamp) return true;
    if (dateRange === 'ALL') return true;

    const t = new Date(isoTimestamp).getTime();
    if (isNaN(t)) return true;

    const cutoff =
      dateRange === '24H'
        ? now.getTime() - 24 * 60 * 60 * 1000
        : dateRange === '7D'
        ? now.getTime() - 7 * 24 * 60 * 60 * 1000
        : now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return t >= cutoff;
  };

  // Outcome Classifier
  const classifyOutcome = (status?: string): 'BLOCKED' | 'APPROVAL_REQUIRED' | 'COMPLETED' | 'CANCELLED' => {
    const s = (status || '').toUpperCase();
    if (s === 'BLOCKED' || s === 'BLOCK_AND_REVIEW') return 'BLOCKED';
    if (s === 'APPROVAL_REQUIRED' || s === 'STEP_UP_VERIFICATION' || s === 'PENDING') return 'APPROVAL_REQUIRED';
    if (s === 'COMPLETED' || s === 'ALLOWED' || s === 'APPROVED') return 'COMPLETED';
    if (s === 'CANCELLED' || s === 'REJECTED' || s === 'EXPIRED') return 'CANCELLED';
    return 'COMPLETED';
  };

  // Risk Band Classifier (Aligned strictly with getRiskLevel in riskEngine.ts)
  const classifyRiskBand = (score?: number, level?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (level && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(level.toUpperCase())) {
      return level.toUpperCase() as any;
    }
    const sc = typeof score === 'number' && !isNaN(score) ? score : 0;
    if (sc > 90) return 'CRITICAL';
    if (sc > 70) return 'HIGH';
    if (sc > 30) return 'MEDIUM';
    return 'LOW';
  };

  // Case Status Classifier
  const classifyCaseStatus = (status?: string): 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE' => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED' || s === 'ACTIONED' || s === 'CLOSED') return 'RESOLVED';
    if (s === 'FALSE_POSITIVE') return 'FALSE_POSITIVE';
    if (s === 'ESCALATED') return 'ESCALATED';
    if (s === 'INVESTIGATING' || s === 'IN_REVIEW' || s === 'READY') return 'INVESTIGATING';
    return 'OPEN';
  };

  // ─── 7. Filtered Transactions & Cases ──────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return baseTransactions.filter((tx) => {
      // 1. Date Range
      if (!isWithinDateRange(tx.timestamp)) return false;

      // 2. Outcome Filter
      if (outcomeFilter !== 'ALL' && classifyOutcome(tx.status) !== outcomeFilter) return false;

      // 3. Risk Band Filter
      if (riskBandFilter !== 'ALL') {
        const band = classifyRiskBand(tx.risk_score, tx.risk_level);
        if (band !== riskBandFilter) return false;
      }

      // 4. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = tx.transaction_id?.toLowerCase().includes(q) || tx.id?.toLowerCase().includes(q);
        const matchCust = tx.customer_id?.toLowerCase().includes(q);
        const matchMerch = tx.merchant?.toLowerCase().includes(q);
        const matchCity = tx.city?.toLowerCase().includes(q);
        if (!matchId && !matchCust && !matchMerch && !matchCity) return false;
      }

      return true;
    });
  }, [baseTransactions, dateRange, outcomeFilter, riskBandFilter, searchQuery]);

  const filteredCases = useMemo(() => {
    return baseCases.filter((cs) => {
      // 1. Date Range
      if (!isWithinDateRange(cs.createdAt)) return false;

      // 2. Case Status Filter
      if (caseStatusFilter !== 'ALL') {
        const st = classifyCaseStatus(cs.status);
        if (st !== caseStatusFilter) return false;
      }

      // 3. Risk Band Filter
      if (riskBandFilter !== 'ALL') {
        const band = classifyRiskBand(cs.riskScore, cs.riskLevel);
        if (band !== riskBandFilter) return false;
      }

      // 4. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = cs.caseNumber?.toLowerCase().includes(q) || cs.id?.toLowerCase().includes(q);
        const matchTx = cs.transactionId?.toLowerCase().includes(q);
        const matchCust = cs.customerId?.toLowerCase().includes(q);
        const matchAssigned = cs.assignedTo?.toLowerCase().includes(q);
        if (!matchNum && !matchTx && !matchCust && !matchAssigned) return false;
      }

      return true;
    });
  }, [baseCases, dateRange, caseStatusFilter, riskBandFilter, searchQuery]);

  // ─── 8. Key Metrics Computation (Strictly Empirical) ────────────────────────
  const metrics = useMemo(() => {
    const totalTx = filteredTransactions.length;
    let blockedTxCount = 0;
    let approvalReqTxCount = 0;
    let completedTxCount = 0;
    let cancelledTxCount = 0;
    let blockedGrossValue = 0;
    let totalGrossValue = 0;

    // Risk band counts (only for transactions with evaluated risk scores)
    let lowRiskCount = 0;
    let medRiskCount = 0;
    let highRiskCount = 0;
    let critRiskCount = 0;
    let scoredTxCount = 0;

    filteredTransactions.forEach((tx) => {
      const amt = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
      totalGrossValue += amt;

      const outcome = classifyOutcome(tx.status);
      if (outcome === 'BLOCKED') {
        blockedTxCount++;
        blockedGrossValue += amt;
      } else if (outcome === 'APPROVAL_REQUIRED') {
        approvalReqTxCount++;
      } else if (outcome === 'COMPLETED') {
        completedTxCount++;
      } else if (outcome === 'CANCELLED') {
        cancelledTxCount++;
      }

      if (typeof tx.risk_score === 'number' && !isNaN(tx.risk_score)) {
        scoredTxCount++;
        const band = classifyRiskBand(tx.risk_score, tx.risk_level);
        if (band === 'LOW') lowRiskCount++;
        else if (band === 'MEDIUM') medRiskCount++;
        else if (band === 'HIGH') highRiskCount++;
        else critRiskCount++;
      }
    });

    // Case metrics
    const totalCases = filteredCases.length;
    let openCaseCount = 0;
    let investigatingCaseCount = 0;
    let escalatedCaseCount = 0;
    let resolvedCaseCount = 0;
    let falsePositiveCaseCount = 0;

    // Average duration calculation (strictly for cases with start & end timestamps)
    let totalDurationMs = 0;
    let closedCasesWithTimestamps = 0;

    filteredCases.forEach((cs) => {
      const st = classifyCaseStatus(cs.status);
      if (st === 'OPEN') openCaseCount++;
      else if (st === 'INVESTIGATING') investigatingCaseCount++;
      else if (st === 'ESCALATED') escalatedCaseCount++;
      else if (st === 'RESOLVED') resolvedCaseCount++;
      else if (st === 'FALSE_POSITIVE') falsePositiveCaseCount++;

      // Duration: requires createdAt and (closedAt or resolvedAt)
      if (cs.createdAt && (cs.closedAt || cs.resolvedAt)) {
        const start = new Date(cs.createdAt).getTime();
        const end = new Date(cs.closedAt || cs.resolvedAt || '').getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          totalDurationMs += end - start;
          closedCasesWithTimestamps++;
        }
      }
    });

    const avgDurationSeconds =
      closedCasesWithTimestamps > 0 ? Math.round(totalDurationMs / closedCasesWithTimestamps / 1000) : null;

    // Format average duration string
    let avgDurationFormatted = 'N/A';
    if (avgDurationSeconds !== null) {
      const mins = Math.floor(avgDurationSeconds / 60);
      const secs = avgDurationSeconds % 60;
      avgDurationFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    // Earliest and latest timestamps in sample
    let earliestDate = '';
    let latestDate = '';
    if (filteredTransactions.length > 0) {
      const times = filteredTransactions
        .map((t) => new Date(t.timestamp).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);
      if (times.length > 0) {
        earliestDate = new Date(times[0]).toLocaleDateString('en-IN');
        latestDate = new Date(times[times.length - 1]).toLocaleDateString('en-IN');
      }
    }

    return {
      totalTx,
      totalGrossValue,
      blockedTxCount,
      approvalReqTxCount,
      completedTxCount,
      cancelledTxCount,
      blockedGrossValue,
      totalCases,
      openCaseCount,
      investigatingCaseCount,
      escalatedCaseCount,
      resolvedCaseCount,
      falsePositiveCaseCount,
      closedCasesWithTimestamps,
      avgDurationFormatted,
      scoredTxCount,
      lowRiskCount,
      medRiskCount,
      highRiskCount,
      critRiskCount,
      earliestDate,
      latestDate,
    };
  }, [filteredTransactions, filteredCases]);

  // ─── 9. Charts & Chronological Aggregations ────────────────────────────────
  // Timeline buckets: group transactions chronologically
  const activityTimeline = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const sorted = [...filteredTransactions]
      .filter((t) => t.timestamp && !isNaN(new Date(t.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const buckets: Record<
      string,
      { label: string; completed: number; blocked: number; approvalRequired: number; cancelled: number; total: number; volume: number }
    > = {};

    sorted.forEach((t) => {
      const d = new Date(t.timestamp);
      // Group by day e.g. "07/10" or "Oct 07"
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!buckets[key]) {
        buckets[key] = { label: key, completed: 0, blocked: 0, approvalRequired: 0, cancelled: 0, total: 0, volume: 0 };
      }
      buckets[key].total++;
      buckets[key].volume += t.amount || 0;

      const outcome = classifyOutcome(t.status);
      if (outcome === 'BLOCKED') buckets[key].blocked++;
      else if (outcome === 'APPROVAL_REQUIRED') buckets[key].approvalRequired++;
      else if (outcome === 'CANCELLED') buckets[key].cancelled++;
      else buckets[key].completed++;
    });

    return Object.values(buckets);
  }, [filteredTransactions]);

  const maxBucketVolume = useMemo(() => {
    return Math.max(...activityTimeline.map((b) => b.total), 1);
  }, [activityTimeline]);

  // Workload by Assignee
  const workloadByAssignee = useMemo(() => {
    const assignees: Record<string, { name: string; open: number; investigating: number; escalated: number; resolved: number; total: number }> = {};

    filteredCases.forEach((cs) => {
      const name = cs.assignedTo || 'Unassigned';
      if (!assignees[name]) {
        assignees[name] = { name, open: 0, investigating: 0, escalated: 0, resolved: 0, total: 0 };
      }
      assignees[name].total++;

      const st = classifyCaseStatus(cs.status);
      if (st === 'RESOLVED' || st === 'FALSE_POSITIVE') assignees[name].resolved++;
      else if (st === 'ESCALATED') assignees[name].escalated++;
      else if (st === 'INVESTIGATING') assignees[name].investigating++;
      else assignees[name].open++;
    });

    return Object.values(assignees).sort((a, b) => b.total - a.total);
  }, [filteredCases]);

  // ─── 10. Filter Reset Action ───────────────────────────────────────────────
  const handleResetFilters = () => {
    setDateRange('ALL');
    setOutcomeFilter('ALL');
    setRiskBandFilter('ALL');
    setCaseStatusFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    dateRange !== 'ALL' ||
    outcomeFilter !== 'ALL' ||
    riskBandFilter !== 'ALL' ||
    caseStatusFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* ─── HEADER STRIP ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Evidence-Based SOC Analytics
              </h1>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                AUDITABLE METRICS
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                IST (UTC+05:30)
              </span>
              {isLoading && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 animate-pulse">
                  Syncing Firestore...
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Empirical transaction outcomes, case workloads, and deterministic risk distributions from the operational ledger.
            </p>
          </div>
        </div>

        {/* Dataset Provenance Controls & Methodology Guide Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Source Selector */}
          <div className="flex items-center bg-[var(--bg-root)] p-1 rounded-xl border border-[var(--border)] text-xs font-medium">
            <button
              onClick={() => setDatasetSource('LIVE_ONLY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                datasetSource === 'LIVE_ONLY'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Query strictly live Firestore records"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Pure Live Firestore ({liveTransactions.length} Txns)</span>
            </button>
            <button
              onClick={() => setDatasetSource('HYBRID_WITH_SYNTHETIC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                datasetSource === 'HYBRID_WITH_SYNTHETIC'
                  ? 'bg-purple-600 text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Include 60+ synthetic baseline transactions for volume inspection"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Hybrid (+60 Synthetic Baseline)</span>
            </button>
          </div>

          {/* Methodology Info Button */}
          <button
            onClick={() => setIsMethodologyOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-root)] hover:bg-[var(--bg-surface-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-xs"
          >
            <Info className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Provenance & Calculation Rules</span>
            <span className="sm:hidden">Rules</span>
          </button>
        </div>
      </div>

      {/* ─── PROVENANCE BANNER (Transparent Claims & Boundaries) ────────────────── */}
      <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-[var(--text-secondary)] flex items-start gap-3">
        <Scale className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-0.5">
          <span className="font-semibold text-[var(--text-primary)]">
            Honest Measurement Boundary Notice:
          </span>{' '}
          All figures on this dashboard are derived directly from Firestore transaction ledgers and SOC case records. 
          <span className="font-medium text-amber-500 ml-1">
            Interdicted amounts represent gross blocked value, not confirmed losses avoided.
          </span>{' '}
          Model precision, recall, and dollar savings claims are withheld because synthetic demo environments lack audited ground-truth labels for benign customer populations.
        </div>
      </div>

      {/* ─── FILTER CONTROLS BAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
            <Filter className="h-4 w-4 text-blue-500" />
            <span>Operational Filters</span>
            {hasActiveFilters && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                Active
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-semibold transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Date Range Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Date Horizon
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Available Dates</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

          {/* 2. Transaction Outcome Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Transaction Outcome
            </label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Outcomes</option>
              <option value="BLOCKED">BLOCKED (Interdicted)</option>
              <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED (MFA/OTP)</option>
              <option value="COMPLETED">COMPLETED (Allowed)</option>
              <option value="CANCELLED">CANCELLED (Rejected/Expired)</option>
            </select>
          </div>

          {/* 3. Risk Band Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Evaluated Risk Band
            </label>
            <select
              value={riskBandFilter}
              onChange={(e) => setRiskBandFilter(e.target.value as RiskBandFilter)}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="LOW">LOW (0 - 30)</option>
              <option value="MEDIUM">MEDIUM (31 - 70)</option>
              <option value="HIGH">HIGH (71 - 90)</option>
              <option value="CRITICAL">CRITICAL (91 - 100)</option>
            </select>
          </div>

          {/* 4. Case Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              SOC Case Stage
            </label>
            <select
              value={caseStatusFilter}
              onChange={(e) => setCaseStatusFilter(e.target.value as CaseStatusFilter)}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="ALL">All Case Stages</option>
              <option value="OPEN">OPEN / NEW (Triage Queue)</option>
              <option value="INVESTIGATING">INVESTIGATING (In Review)</option>
              <option value="ESCALATED">ESCALATED (Senior SOC)</option>
              <option value="RESOLVED">RESOLVED (Confirmed Fraud)</option>
              <option value="FALSE_POSITIVE">FALSE_POSITIVE (Legitimate)</option>
            </select>
          </div>

          {/* 5. Quick Text Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Search IDs or Customers
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="C1003, TXN-..., etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: KEY EMPIRICAL METRICS (KPI CARDS) ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Transactions */}
        <div
          onClick={() => {
            setOutcomeFilter('ALL');
            setActiveDrillTab('TRANSACTIONS');
          }}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-blue-500/50 transition cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <span>Total Transactions</span>
            <Activity className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
            {metrics.totalTx}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">
            ₹{(metrics.totalGrossValue / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}k gross volume
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 pt-1.5 border-t border-[var(--border)] truncate">
            Sample size: n = {metrics.totalTx} txns
          </div>
        </div>

        {/* Metric 2: Blocked Transaction Value */}
        <div
          onClick={() => {
            setOutcomeFilter('BLOCKED');
            setActiveDrillTab('TRANSACTIONS');
          }}
          className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60 transition cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">
            <span>Blocked Txn Value</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">
            ₹{(metrics.blockedGrossValue / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}k
          </div>
          <div className="text-[10px] text-rose-500/80 font-mono mt-1">
            {metrics.blockedTxCount} Interdicted Transactions
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 pt-1.5 border-t border-rose-500/20 truncate">
            Halted at gate • Not saved loss
          </div>
        </div>

        {/* Metric 3: Active & Resolved Cases */}
        <div
          onClick={() => {
            setActiveDrillTab('CASES');
          }}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-purple-500/50 transition cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <span>SOC Cases in Scope</span>
            <FolderKanban className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
            {metrics.totalCases}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mt-1">
            {metrics.resolvedCaseCount} Resolved • {metrics.falsePositiveCaseCount} False Pos
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 pt-1.5 border-t border-[var(--border)] truncate">
            Sample size: n = {metrics.totalCases} cases
          </div>
        </div>

        {/* Metric 4: Average Investigation Duration */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <span>Avg Case Duration</span>
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
            {metrics.avgDurationFormatted}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">
            {metrics.closedCasesWithTimestamps > 0
              ? `Calculated from ${metrics.closedCasesWithTimestamps} closed cases`
              : 'Awaiting closed case timestamps'}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 pt-1.5 border-t border-[var(--border)] truncate">
            Sample size: n = {metrics.closedCasesWithTimestamps}
          </div>
        </div>

        {/* Metric 5: Risk Band Composition */}
        <div
          onClick={() => {
            setRiskBandFilter('CRITICAL');
            setActiveDrillTab('TRANSACTIONS');
          }}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-amber-500/50 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <span>Risk Composition</span>
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">
            {metrics.critRiskCount + metrics.highRiskCount}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">High/Crit</span>
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">
            {metrics.medRiskCount} Med • {metrics.lowRiskCount} Low
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1.5 pt-1.5 border-t border-[var(--border)] truncate">
            Evaluated on n = {metrics.scoredTxCount} txns
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: CHARTS & TREND VISUALIZATIONS ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: TRANSACTION VOLUME & OUTCOMES TIMELINE */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Transaction Activity & Outcome Timeline</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Chronological aggregation across processed timestamps (Date buckets: DD/MM)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Approval Req
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked
              </span>
            </div>
          </div>

          {/* Timeline Chart Container */}
          {activityTimeline.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
              <Calendar className="h-6 w-6 mb-2 opacity-50" />
              <span>No transactions recorded within the active date horizon.</span>
            </div>
          ) : (
            <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-[var(--border)] relative overflow-x-auto">
              {/* Background Reference Lines */}
              <div className="absolute inset-x-0 top-1/4 h-px border-b border-dashed border-[var(--border)] opacity-40 pointer-events-none" />
              <div className="absolute inset-x-0 top-2/4 h-px border-b border-dashed border-[var(--border)] opacity-40 pointer-events-none" />
              <div className="absolute inset-x-0 top-3/4 h-px border-b border-dashed border-[var(--border)] opacity-40 pointer-events-none" />

              {activityTimeline.map((bucket) => {
                const heightPct = Math.max(14, Math.round((bucket.total / maxBucketVolume) * 100));

                return (
                  <div
                    key={bucket.label}
                    className="flex-1 min-w-[42px] flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  >
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--bg-root)] border border-[var(--border)] shadow-xl rounded-lg p-2.5 text-[10px] font-mono z-30 whitespace-nowrap">
                      <div className="font-bold text-[var(--text-primary)] mb-1">
                        Date: {bucket.label} ({bucket.total} txns)
                      </div>
                      <div className="text-emerald-500">Completed: {bucket.completed}</div>
                      <div className="text-amber-500">Approval Req: {bucket.approvalRequired}</div>
                      <div className="text-rose-500">Blocked: {bucket.blocked}</div>
                      {bucket.cancelled > 0 && <div className="text-slate-400">Cancelled: {bucket.cancelled}</div>}
                      <div className="text-[var(--text-primary)] font-bold pt-1 border-t border-[var(--border)] mt-1">
                        Gross: ₹{bucket.volume.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Stacked Vertical Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[28px] rounded-t flex flex-col-reverse overflow-hidden transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    >
                      <div style={{ flex: bucket.completed || 0 }} className="bg-emerald-500 w-full" />
                      <div style={{ flex: bucket.approvalRequired || 0 }} className="bg-amber-500 w-full" />
                      <div style={{ flex: bucket.blocked || 0 }} className="bg-rose-500 w-full" />
                      <div style={{ flex: bucket.cancelled || 0 }} className="bg-slate-500 w-full" />
                    </div>

                    {/* X-Axis Label */}
                    <div className="text-[9px] font-mono text-[var(--text-muted)] mt-1.5 truncate">
                      {bucket.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>Chronological sampling from /transactions</span>
            <span>{activityTimeline.length} date cohorts rendered</span>
          </div>
        </div>

        {/* CHART 2: RISK BAND DISTRIBUTION & TRANSACTION OUTCOMES */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <span>Risk Band & Outcome Distribution</span>
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Proportion of evaluated transactions across deterministic risk score tiers
            </p>
          </div>

          {/* Risk Band Segmented Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)]">Score Tier Distribution</span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                n = {metrics.scoredTxCount} scored records
              </span>
            </div>

            {metrics.scoredTxCount === 0 ? (
              <div className="p-4 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
                No scored risk records present in current selection.
              </div>
            ) : (
              <>
                <div className="h-3.5 rounded-full overflow-hidden flex bg-[var(--bg-root)] border border-[var(--border)] shadow-xs">
                  <div
                    style={{ width: `${Math.round((metrics.lowRiskCount / metrics.scoredTxCount) * 100)}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`LOW (0-30): ${metrics.lowRiskCount}`}
                  />
                  <div
                    style={{ width: `${Math.round((metrics.medRiskCount / metrics.scoredTxCount) * 100)}%` }}
                    className="bg-amber-500 transition-all duration-500"
                    title={`MEDIUM (31-70): ${metrics.medRiskCount}`}
                  />
                  <div
                    style={{ width: `${Math.round((metrics.highRiskCount / metrics.scoredTxCount) * 100)}%` }}
                    className="bg-orange-500 transition-all duration-500"
                    title={`HIGH (71-90): ${metrics.highRiskCount}`}
                  />
                  <div
                    style={{ width: `${Math.round((metrics.critRiskCount / metrics.scoredTxCount) * 100)}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`CRITICAL (91-100): ${metrics.critRiskCount}`}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div
                    onClick={() => setRiskBandFilter('LOW')}
                    className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] cursor-pointer hover:border-emerald-500/50 transition"
                  >
                    <div className="text-[9px] font-bold text-emerald-500 font-mono">LOW (0-30)</div>
                    <div className="text-base font-black font-mono text-[var(--text-primary)]">{metrics.lowRiskCount}</div>
                    <div className="text-[9px] text-[var(--text-muted)] font-mono">
                      {Math.round((metrics.lowRiskCount / metrics.scoredTxCount) * 100)}%
                    </div>
                  </div>

                  <div
                    onClick={() => setRiskBandFilter('MEDIUM')}
                    className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] cursor-pointer hover:border-amber-500/50 transition"
                  >
                    <div className="text-[9px] font-bold text-amber-500 font-mono">MED (31-70)</div>
                    <div className="text-base font-black font-mono text-[var(--text-primary)]">{metrics.medRiskCount}</div>
                    <div className="text-[9px] text-[var(--text-muted)] font-mono">
                      {Math.round((metrics.medRiskCount / metrics.scoredTxCount) * 100)}%
                    </div>
                  </div>

                  <div
                    onClick={() => setRiskBandFilter('HIGH')}
                    className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] cursor-pointer hover:border-orange-500/50 transition"
                  >
                    <div className="text-[9px] font-bold text-orange-500 font-mono">HIGH (71-90)</div>
                    <div className="text-base font-black font-mono text-[var(--text-primary)]">{metrics.highRiskCount}</div>
                    <div className="text-[9px] text-[var(--text-muted)] font-mono">
                      {Math.round((metrics.highRiskCount / metrics.scoredTxCount) * 100)}%
                    </div>
                  </div>

                  <div
                    onClick={() => setRiskBandFilter('CRITICAL')}
                    className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] cursor-pointer hover:border-rose-500/50 transition"
                  >
                    <div className="text-[9px] font-bold text-rose-500 font-mono">CRIT (91-100)</div>
                    <div className="text-base font-black font-mono text-rose-500">{metrics.critRiskCount}</div>
                    <div className="text-[9px] text-[var(--text-muted)] font-mono">
                      {Math.round((metrics.critRiskCount / metrics.scoredTxCount) * 100)}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Transaction Outcome Horizontal Bars */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
              Observed Transaction Outcomes (Operational Decisions)
            </div>

            {/* Completed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">COMPLETED / ALLOWED</span>
                <span className="font-mono text-emerald-500 font-bold">
                  {metrics.completedTxCount} txns ({metrics.totalTx > 0 ? Math.round((metrics.completedTxCount / metrics.totalTx) * 100) : 0}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-root)] rounded-full overflow-hidden">
                <div
                  style={{ width: `${metrics.totalTx > 0 ? (metrics.completedTxCount / metrics.totalTx) * 100 : 0}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Blocked */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">BLOCKED / INTERDICTED</span>
                <span className="font-mono text-rose-500 font-bold">
                  {metrics.blockedTxCount} txns ({metrics.totalTx > 0 ? Math.round((metrics.blockedTxCount / metrics.totalTx) * 100) : 0}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-root)] rounded-full overflow-hidden">
                <div
                  style={{ width: `${metrics.totalTx > 0 ? (metrics.blockedTxCount / metrics.totalTx) * 100 : 0}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>

            {/* Approval Required */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">APPROVAL REQUIRED (MFA/OTP)</span>
                <span className="font-mono text-amber-500 font-bold">
                  {metrics.approvalReqTxCount} txns ({metrics.totalTx > 0 ? Math.round((metrics.approvalReqTxCount / metrics.totalTx) * 100) : 0}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-root)] rounded-full overflow-hidden">
                <div
                  style={{ width: `${metrics.totalTx > 0 ? (metrics.approvalReqTxCount / metrics.totalTx) * 100 : 0}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: SOC INVESTIGATION WORKLOAD & CASE STATUS ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Status Distribution Breakdown */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-purple-500" />
                <span>SOC Case Lifecycle & Status Distribution</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Active caseload distribution across lifecycle phases
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-root)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
              {metrics.totalCases} Total Cases
            </span>
          </div>

          {metrics.totalCases === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
              <span>No case dossiers currently in scope.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'OPEN / NEW (Triage Queue)', count: metrics.openCaseCount, color: 'bg-blue-500', text: 'text-blue-500', filter: 'OPEN' as CaseStatusFilter },
                { label: 'INVESTIGATING (In Analysis)', count: metrics.investigatingCaseCount, color: 'bg-indigo-500', text: 'text-indigo-500', filter: 'INVESTIGATING' as CaseStatusFilter },
                { label: 'ESCALATED (Senior SOC)', count: metrics.escalatedCaseCount, color: 'bg-amber-500', text: 'text-amber-500', filter: 'ESCALATED' as CaseStatusFilter },
                { label: 'RESOLVED (Confirmed Fraud)', count: metrics.resolvedCaseCount, color: 'bg-rose-500', text: 'text-rose-500', filter: 'RESOLVED' as CaseStatusFilter },
                { label: 'FALSE POSITIVE (Cleared)', count: metrics.falsePositiveCaseCount, color: 'bg-emerald-500', text: 'text-emerald-500', filter: 'FALSE_POSITIVE' as CaseStatusFilter },
              ].map((item) => {
                const pct = Math.round((item.count / (metrics.totalCases || 1)) * 100);
                return (
                  <div
                    key={item.label}
                    onClick={() => {
                      setCaseStatusFilter(item.filter);
                      setActiveDrillTab('CASES');
                    }}
                    className="p-2.5 rounded-xl bg-[var(--bg-root)] border border-[var(--border)] hover:border-purple-500/40 transition cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)] text-[11px]">{item.label}</span>
                      <span className={`font-mono font-bold ${item.text}`}>
                        {item.count} cases ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className={`h-full ${item.color} rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Workload by Analyst Identity */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-500" />
                <span>Analyst Workload Distribution</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Assigned cases across demo analyst workstation identities
              </p>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {workloadByAssignee.length} Assignees Active
            </span>
          </div>

          {workloadByAssignee.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
              <span>No analyst assignments logged yet.</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {workloadByAssignee.map((item) => (
                <div
                  key={item.name}
                  className="p-3 rounded-xl bg-[var(--bg-root)] border border-[var(--border)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {item.investigating} Active • {item.escalated} Escalated • {item.resolved} Finalized
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{item.total}</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">cases</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 4: TRACEABLE UNDERLYING RECORDS EXPLORER (DRILL-DOWN) ───────── */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <span>Traceable Underlying Records Explorer</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Audit the exact primary ledger records supporting the aggregate metrics above
            </p>
          </div>

          {/* Drill-down Tab Switcher */}
          <div className="flex items-center bg-[var(--bg-root)] p-1 rounded-xl border border-[var(--border)] text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setActiveDrillTab('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeDrillTab === 'TRANSACTIONS'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Transactions in Scope ({filteredTransactions.length})
            </button>
            <button
              onClick={() => setActiveDrillTab('CASES')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeDrillTab === 'CASES'
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Cases in Scope ({filteredCases.length})
            </button>
          </div>
        </div>

        {/* TAB 1: TRANSACTIONS LIST */}
        {activeDrillTab === 'TRANSACTIONS' && (
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
                No transactions match the selected filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-root)] border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3">Transaction ID</th>
                      <th className="px-4 py-3">Timestamp (IST)</th>
                      <th className="px-4 py-3">Customer / City</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Risk Score</th>
                      <th className="px-4 py-3">Operational Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTransactions.slice(0, 20).map((tx) => {
                      const outcome = classifyOutcome(tx.status);
                      const isBlocked = outcome === 'BLOCKED';
                      const isStepUp = outcome === 'APPROVAL_REQUIRED';

                      return (
                        <tr key={tx.transaction_id || tx.id} className="hover:bg-[var(--bg-surface-subtle)] transition">
                          <td className="px-4 py-2.5 font-mono font-medium text-[var(--text-primary)]">
                            {tx.transaction_id || tx.id}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
                            {tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-[var(--text-primary)]">{tx.customer_id}</span>
                            <span className="text-[10px] text-[var(--text-muted)] block">{tx.city || 'Bengaluru'}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-[var(--text-primary)]">
                            ₹{(tx.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                (tx.risk_score || 0) >= 70
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : (tx.risk_score || 0) > 30
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {tx.risk_score ?? 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isBlocked
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : isStepUp
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => {
                                setReportModalData({
                                  isOpen: true,
                                  transactionData: tx,
                                });
                              }}
                              className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-medium transition text-[11px]"
                            >
                              Inspect Dossier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredTransactions.length > 20 && (
              <div className="text-center text-xs text-[var(--text-muted)] font-mono">
                Showing top 20 of {filteredTransactions.length} records in scope.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CASES LIST */}
        {activeDrillTab === 'CASES' && (
          <div className="space-y-3">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
                No cases match the selected filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-root)] border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3">Case Number</th>
                      <th className="px-4 py-3">Created (IST)</th>
                      <th className="px-4 py-3">Customer ID</th>
                      <th className="px-4 py-3">Risk Level</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Lifecycle Stage</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredCases.slice(0, 20).map((cs) => {
                      return (
                        <tr key={cs.id} className="hover:bg-[var(--bg-surface-subtle)] transition">
                          <td className="px-4 py-2.5 font-mono font-bold text-[var(--text-primary)]">
                            {cs.caseNumber || cs.id}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
                            {cs.createdAt ? new Date(cs.createdAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                            {cs.customerId}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                                cs.riskScore >= 70
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : cs.riskScore > 30
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {cs.riskScore}/100 ({cs.riskLevel})
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-[var(--text-secondary)]">
                            {cs.assignedTo || 'Unassigned'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cs.status === 'RESOLVED'
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : cs.status === 'FALSE_POSITIVE'
                                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                  : cs.status === 'ESCALATED'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                              }`}
                            >
                              {cs.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => {
                                setReportModalData({
                                  isOpen: true,
                                  caseData: cs,
                                });
                              }}
                              className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-medium transition text-[11px]"
                            >
                              Open Report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredCases.length > 20 && (
              <div className="text-center text-xs text-[var(--text-muted)] font-mono">
                Showing top 20 of {filteredCases.length} records in scope.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── METHODOLOGY & AUDIT RULES MODAL ─────────────────────────────────────── */}
      {isMethodologyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl text-[var(--text-primary)] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Analytics Calculation & Provenance Rules
                </h3>
              </div>
              <button
                onClick={() => setIsMethodologyOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">1. Underlying Data Sources</h4>
                <p>
                  Metrics are calculated from four live Firestore collections:
                  <code className="font-mono text-[11px] bg-[var(--bg-root)] px-1.5 py-0.5 rounded ml-1">/transactions</code>,
                  <code className="font-mono text-[11px] bg-[var(--bg-root)] px-1.5 py-0.5 rounded ml-1">/cases</code>,
                  <code className="font-mono text-[11px] bg-[var(--bg-root)] px-1.5 py-0.5 rounded ml-1">/investigations</code>, and
                  <code className="font-mono text-[11px] bg-[var(--bg-root)] px-1.5 py-0.5 rounded ml-1">/audit_logs</code>.
                  Records are deduplicated strictly by primary document identifier to prevent double-counting.
                </p>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">/transactions</span>
                    <strong className="text-[var(--text-primary)]">{liveTransactions.length} documents</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">/cases</span>
                    <strong className="text-[var(--text-primary)]">{liveCases.length} documents</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">/investigations</span>
                    <strong className="text-[var(--text-primary)]">{liveInvestigations.length} documents</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">/audit_logs</span>
                    <strong className="text-[var(--text-primary)]">{liveAuditLogs.length} documents</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">2. Blocked Transaction Value Definition</h4>
                <p>
                  <strong>Formula:</strong> <code className="font-mono">Sum(amount) where status in ['BLOCKED', 'BLOCK_AND_REVIEW']</code>.
                  <br />
                  <span className="text-amber-500 font-semibold">Regulatory Distinction:</span> This figure represents gross transaction amounts halted at payment execution. It does <em>not</em> claim money saved or losses prevented, as a blocked payment may have been abandoned, retried legitimately, or declined for non-fraud reasons.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">3. Average Investigation Duration</h4>
                <p>
                  <strong>Formula:</strong> <code className="font-mono">Mean(closedAt - createdAt)</code> for cases where both start and terminal timestamps exist. If zero cases meet this criterion in the selected period, the dashboard outputs <code className="font-mono">N/A</code> rather than a synthetic duration estimate.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">4. Observed Outcome vs Human Disposition</h4>
                <p>
                  <strong>Observed Transaction Outcome:</strong> Autonomous system action enforced at the payment gateway (<code className="font-mono">BLOCKED</code>, <code className="font-mono">APPROVAL_REQUIRED</code>, <code className="font-mono">COMPLETED</code>).
                  <br />
                  <strong>Human SOC Disposition:</strong> Analyst determination recorded in Case Management (<code className="font-mono">CONFIRMED_FRAUD</code> vs <code className="font-mono">FALSE_POSITIVE</code>). Case resolution does <em>not</em> retroactively mutate historical payment status.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">5. Timezone Standardization</h4>
                <p>
                  All event grouping and chronological bucket renders operate on standardized Indian Standard Time (IST, UTC+05:30), reflecting the operating jurisdiction of the synthetic demo bank identities.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => setIsMethodologyOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FRAUD CASE REPORT MODAL ─────────────────────────────────────────────── */}
      <FraudCaseReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData({ isOpen: false })}
        caseData={reportModalData.caseData}
        transactionData={reportModalData.transactionData}
      />
    </div>
  );
};

export default Analytics;
