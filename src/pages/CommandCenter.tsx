import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Clock,
  Smartphone,
  Globe,
  Search,
  RefreshCw,
  FolderKanban,
  FileText,
  Building2,
  GitMerge,
  Layers,
  ArrowRight,
  Cpu,
  Zap,
  CreditCard,
  User,
  Store,
  Network,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  Transaction,
  Customer,
  Device,
  Case,
  AuditLog,
  Investigation,
  AgentResult,
  RiskLevel,
  DecisionAction,
} from '../types';
import {
  transactionsCol,
  devicesCol,
  casesCol,
  auditLogsCol,
} from '../firebase/collections';
import {
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import {
  SYNTHETIC_TRANSACTIONS,
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_NETWORK_SIGNALS,
} from '../data/scenarios';
import { DEMO_IDENTITIES } from '../data/phoneFixtures';
import { SYNTHETIC_BANKS } from '../lib/simulationEngine';
import {
  evaluateTransactionContext,
} from '../risk/riskService';
import {
  evaluateTransactionRisk,
  RiskAssessmentResult,
  RiskEvaluationInput,
} from '../risk/riskEngine';
import {
  runInvestigationForTransaction,
} from '../investigation/pipeline';
import { AGENT_METAS } from './InvestigationWorkspace';
import { FraudCaseReportModal } from '../components/reports/FraudCaseReportModal';

// ─── COLOR & RISK CONFIGURATION ─────────────────────────────────────────────
const RISK_STYLES: Record<
  RiskLevel,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    dotBg: string;
    accent: string;
  }
> = {
  LOW: {
    label: 'LOW',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    dotBg: 'bg-emerald-500',
    accent: '#10B981',
  },
  MEDIUM: {
    label: 'MEDIUM',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/40',
    dotBg: 'bg-amber-500',
    accent: '#F59E0B',
  },
  HIGH: {
    label: 'HIGH',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    badgeText: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/40',
    dotBg: 'bg-orange-500',
    accent: '#F97316',
  },
  CRITICAL: {
    label: 'CRITICAL',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/40',
    dotBg: 'bg-rose-500',
    accent: '#EF4444',
  },
};

const BANK_BRANDING: Record<
  string,
  { name: string; city: string; color: string; bgLight: string }
> = {
  ALPHA: {
    name: 'Bank Alpha',
    city: 'Bengaluru',
    color: '#3157D5',
    bgLight: 'rgba(49, 87, 213, 0.08)',
  },
  NOVA: {
    name: 'Bank Nova',
    city: 'Mumbai',
    color: '#6C63D9',
    bgLight: 'rgba(108, 99, 217, 0.08)',
  },
  HORIZON: {
    name: 'Bank Horizon',
    city: 'Delhi',
    color: '#159A9C',
    bgLight: 'rgba(21, 154, 156, 0.08)',
  },
};

interface EnrichedTransaction extends Transaction {
  riskScore: number;
  riskLevel: RiskLevel;
  decision: DecisionAction;
  reasons: string[];
  customerName: string;
  bankName: string;
  bankId: string;
  riskResult?: RiskAssessmentResult;
}

export const CommandCenter: React.FC = () => {
  // 1. Clock state (live ticking)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Real-time Firestore State Collections
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [activeCases, setActiveCases] = useState<Case[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);

  // 3. Selection & Filter State
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [centerTab, setCenterTab] = useState<'topology' | 'graph' | 'chain'>('topology');

  // 4. Investigation Execution State (11 agents)
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [investigationResults, setInvestigationResults] = useState<{
    txnId: string;
    investigation: Investigation;
    agentResults: AgentResult[];
    caseCreated?: Case;
    riskResult: RiskAssessmentResult;
  } | null>(null);
  const [investigationProgress, setInvestigationProgress] = useState<{
    agentName: string;
    completed: number;
    total: number;
  }>({ agentName: '', completed: 0, total: 11 });

  // 5. Explainable Fraud Case Report Modal State
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    caseData?: Case | null;
    transactionData?: Transaction | null;
  }>({
    isOpen: false,
    caseData: null,
    transactionData: null,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FIRESTORE LISTENERS (CLEANUP-SECURED, NO POLLING)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // 1. Real-time Transactions Listener
    const txMap = new Map<string, Transaction>();
    SYNTHETIC_TRANSACTIONS.forEach((t) => txMap.set(t.transaction_id, t));

    const unsubTx = onSnapshot(
      query(transactionsCol(), orderBy('timestamp', 'desc'), limit(100)),
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Transaction;
          const id = docSnap.id;
          txMap.set(id, { ...data, transaction_id: id, id });
        });
        const sorted = Array.from(txMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRawTransactions(sorted);
      },
      (err) => {
        console.warn('[FinGuard SOC] Transactions snapshot warning:', err);
      }
    );

    // 2. Real-time Devices Listener
    const unsubDevices = onSnapshot(
      query(devicesCol(), limit(30)),
      (snapshot) => {
        const devs: Device[] = [];
        snapshot.forEach((docSnap) => {
          devs.push({ ...docSnap.data(), device_id: docSnap.id } as Device);
        });
        setConnectedDevices(devs);
      },
      (err) => {
        console.warn('[FinGuard SOC] Devices snapshot warning:', err);
      }
    );

    // 3. Real-time Cases Listener
    const unsubCases = onSnapshot(
      query(casesCol(), orderBy('createdAt', 'desc'), limit(20)),
      (snapshot) => {
        const cList: Case[] = [];
        snapshot.forEach((docSnap) => {
          cList.push({ ...docSnap.data(), id: docSnap.id } as Case);
        });
        setActiveCases(cList);
      },
      (err) => {
        console.warn('[FinGuard SOC] Cases snapshot warning:', err);
      }
    );

    // 4. Real-time Audit Logs Listener
    const unsubAudit = onSnapshot(
      query(auditLogsCol(), orderBy('createdAt', 'desc'), limit(25)),
      (snapshot) => {
        const aList: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          aList.push({ ...docSnap.data(), id: docSnap.id } as AuditLog);
        });
        setRecentAuditLogs(aList);
      },
      (err) => {
        console.warn('[FinGuard SOC] Audit snapshot warning:', err);
      }
    );

    return () => {
      unsubTx();
      unsubDevices();
      unsubCases();
      unsubAudit();
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // RISK ENGINE ENRICHMENT PIPELINE
  // ══════════════════════════════════════════════════════════════════════════
  const enrichedTransactions = useMemo<EnrichedTransaction[]>(() => {
    return rawTransactions.map((tx) => {
      const demoId = DEMO_IDENTITIES[tx.customer_id];
      const customer = SYNTHETIC_CUSTOMERS[tx.customer_id];
      const customerName = demoId?.name || customer?.name || tx.customer_id;

      let bankId = 'ALPHA';
      if (demoId) {
        bankId = demoId.bankId;
      } else if (tx.account_id?.includes('1002') || tx.account_id?.includes('NOVA')) {
        bankId = 'NOVA';
      } else if (tx.account_id?.includes('1008') || tx.account_id?.includes('HORIZON')) {
        bankId = 'HORIZON';
      }
      const bankName = BANK_BRANDING[bankId]?.name || 'Bank Alpha';

      let riskResult: RiskAssessmentResult;
      if (tx.risk_score !== undefined && tx.decision) {
        riskResult = {
          riskScore: tx.risk_score,
          riskLevel:
            tx.risk_level ||
            (tx.risk_score <= 30
              ? 'LOW'
              : tx.risk_score <= 70
              ? 'MEDIUM'
              : tx.risk_score <= 90
              ? 'HIGH'
              : 'CRITICAL'),
          decision: tx.decision,
          reasonCodes: (tx.risk_reasons || []).map((r) => ({
            code: r,
            title: r,
            points: 10,
            direction: 'RISK',
          })),
          triggeredSignals: (tx.risk_reasons || []).map((r) => ({
            signal: 'highAmountDeviation',
            code: r,
            domain: 'TRANSACTION',
            title: r,
            weight: 20,
            triggered: true,
            reason: r,
            pointsContribution: 20,
          })),
          scoreBreakdown: [],
          summary:
            tx.blocked_reason ||
            `Evaluated risk score ${tx.risk_score}/100 with decision ${tx.decision}.`,
          evaluatedAt: tx.timestamp,
        };
      } else {
        try {
          riskResult = evaluateTransactionContext(tx);
        } catch {
          const fallbackCustomer: Customer = customer || {
            customer_id: tx.customer_id,
            name: customerName,
            home_city: tx.city || 'Bengaluru',
            normal_amount_min: 100,
            normal_amount_max: 20000,
            usual_cities: [tx.city || 'Bengaluru'],
            usual_device_ids: [tx.device_id],
            risk_profile: tx.customer_id === 'C1003' ? 'HIGH' : 'LOW',
          };
          const input: RiskEvaluationInput = {
            transaction: tx,
            customer: fallbackCustomer,
            networkSignal:
              tx.customer_id === 'C1003'
                ? SYNTHETIC_NETWORK_SIGNALS[1]
                : SYNTHETIC_NETWORK_SIGNALS[0],
          };
          riskResult = evaluateTransactionRisk(input);
        }
      }

      const reasons =
        riskResult.reasonCodes && riskResult.reasonCodes.length > 0
          ? riskResult.reasonCodes.map((r) => r.title)
          : riskResult.triggeredSignals.map((s) => s.title);

      return {
        ...tx,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        decision: riskResult.decision,
        reasons: reasons.length > 0 ? reasons : ['Verified low-risk transaction pattern'],
        customerName,
        bankName,
        bankId,
        riskResult,
      };
    });
  }, [rawTransactions]);

  const selectedTxn = useMemo<EnrichedTransaction | null>(() => {
    if (selectedTxnId) {
      const found = enrichedTransactions.find((t) => t.transaction_id === selectedTxnId);
      if (found) return found;
    }
    const highRisk = enrichedTransactions.find(
      (t) => t.riskLevel === 'CRITICAL' || t.riskLevel === 'HIGH'
    );
    return highRisk || enrichedTransactions[0] || null;
  }, [selectedTxnId, enrichedTransactions]);

  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter((tx) => {
      const matchesRisk = riskFilter === 'ALL' || tx.riskLevel === riskFilter;
      const matchesSearch =
        !searchQuery ||
        tx.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.device_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRisk && matchesSearch;
    });
  }, [enrichedTransactions, riskFilter, searchQuery]);

  // ══════════════════════════════════════════════════════════════════════════
  // DYNAMIC KPIS
  // ══════════════════════════════════════════════════════════════════════════
  const kpis = useMemo(() => {
    const totalTx = enrichedTransactions.length;
    const riskyTx = enrichedTransactions.filter(
      (t) => t.riskLevel === 'MEDIUM' || t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL'
    ).length;
    const criticalAlerts = enrichedTransactions.filter(
      (t) => t.riskLevel === 'CRITICAL'
    ).length;
    const openCasesCount = activeCases.length;
    const onlineDevs = connectedDevices.filter(
      (d) => d.status === 'ONLINE'
    ).length;
    const activeInvestigationsCount = activeCases.filter(
      (c) => c.status === 'INVESTIGATING' || c.status === 'NEW'
    ).length;

    return {
      totalTx,
      riskyTx,
      criticalAlerts,
      activeInvestigations: activeInvestigationsCount || (criticalAlerts > 0 ? 1 : 0),
      connectedDevices: onlineDevs || connectedDevices.length || 4,
      openCases: openCasesCount,
    };
  }, [enrichedTransactions, activeCases, connectedDevices]);

  // ══════════════════════════════════════════════════════════════════════════
  // INVOKE 11-AGENT INVESTIGATION PIPELINE
  // ══════════════════════════════════════════════════════════════════════════
  const handleInvestigateSelected = useCallback(async () => {
    if (!selectedTxn || isInvestigating) return;

    setIsInvestigating(true);
    setInvestigationProgress({ agentName: 'Initializing Pipeline...', completed: 0, total: 11 });

    try {
      const result = await runInvestigationForTransaction(
        selectedTxn,
        (agentName, completed, total) => {
          setInvestigationProgress({ agentName, completed, total });
        }
      );
      setInvestigationResults({
        txnId: selectedTxn.transaction_id,
        investigation: result.investigation,
        agentResults: result.agentResults,
        caseCreated: result.caseCreated,
        riskResult: result.riskResult,
      });
    } catch (err) {
      console.error('[FinGuard SOC] Investigation pipeline error:', err);
    } finally {
      setIsInvestigating(false);
    }
  }, [selectedTxn, isInvestigating]);

  // ══════════════════════════════════════════════════════════════════════════
  // MULTI-BANK TOPOLOGY METRICS
  // ══════════════════════════════════════════════════════════════════════════
  const bankMetrics = useMemo(() => {
    const metrics: Record<
      string,
      { count: number; volume: number; critical: number; devices: number }
    > = {
      ALPHA: { count: 0, volume: 0, critical: 0, devices: 0 },
      NOVA: { count: 0, volume: 0, critical: 0, devices: 0 },
      HORIZON: { count: 0, volume: 0, critical: 0, devices: 0 },
    };

    enrichedTransactions.forEach((tx) => {
      const b = metrics[tx.bankId] || metrics.ALPHA;
      b.count += 1;
      b.volume += tx.amount;
      if (tx.riskLevel === 'CRITICAL' || tx.riskLevel === 'HIGH') {
        b.critical += 1;
      }
    });

    connectedDevices.forEach((dev) => {
      if (dev.bank && metrics[dev.bank]) {
        metrics[dev.bank].devices += 1;
      }
    });

    return metrics;
  }, [enrichedTransactions, connectedDevices]);

  return (
    <div className="min-h-screen bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. SOC COMMAND CENTER HEADER STRIP                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                  FinGuard AI <span className="text-[var(--accent)] font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/20 font-bold">SOC v3.2</span>
                </h1>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ACTIVE REALTIME STREAM
                </div>
              </div>
              <p className="terminal-text text-[11px] text-[var(--text-muted)] truncate">
                Autonomous Multi-Bank Fraud Operations &amp; 11-Agent Investigation Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            {/* Connected devices badge */}
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] px-3 py-1.5">
              <Smartphone className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[var(--text-secondary)] font-medium">Nodes:</span>
              <span className="font-bold text-[var(--text-primary)]">{kpis.connectedDevices} Online</span>
            </div>

            {/* Live Clock */}
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] px-3 py-1.5 text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="font-bold text-[var(--text-primary)]">
                {now.toLocaleTimeString('en-IN', { hour12: false })}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">IST</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. LIVE COMMAND CENTER KPI STRIP (UNIFORM 6-COLUMN GRID)           */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* Total Transactions */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-[var(--border-strong)] flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Transactions</span>
              <Activity className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--text-primary)]">
              {kpis.totalTx}
            </div>
            <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold truncate">
              Live Firestore Sync
            </div>
          </div>

          {/* Risky Transactions */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-[var(--border-strong)] flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Risky Activity</span>
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {kpis.riskyTx}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)] font-mono truncate">
              Score ≥ 40 pts
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-rose-400 flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <span>Critical Alerts</span>
              <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {kpis.criticalAlerts}
            </div>
            <div className="mt-1 text-[10px] text-rose-500 font-mono font-semibold truncate">
              Interdictions Required
            </div>
          </div>

          {/* Active Investigations */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-[var(--border-strong)] flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Investigations</span>
              <Cpu className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              {kpis.activeInvestigations}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)] font-mono truncate">
              11 Agents Standby
            </div>
          </div>

          {/* Connected Devices */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-[var(--border-strong)] flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Devices Active</span>
              <Smartphone className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--text-primary)]">
              {kpis.connectedDevices}
            </div>
            <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold truncate">
              Registered Fleet
            </div>
          </div>

          {/* Open Cases */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xs transition-all hover:border-[var(--border-strong)] flex flex-col justify-between min-w-0 h-full">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Open Cases</span>
              <FolderKanban className="h-4 w-4 text-purple-500 shrink-0" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--text-primary)]">
              {kpis.openCases}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)] font-mono truncate">
              Escalated / Active
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. PROMINENT CRITICAL FRAUD ALERT (WHEN HIGH/CRITICAL SELECTED)     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {selectedTxn && (selectedTxn.riskLevel === 'CRITICAL' || selectedTxn.riskLevel === 'HIGH') && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/80 bg-gradient-to-r from-rose-950/20 via-rose-900/10 to-transparent p-5 shadow-lg shadow-rose-950/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30 shrink-0 mt-0.5">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tracking-wider uppercase text-rose-600 dark:text-rose-400">
                      🚨 CRITICAL FRAUD INTERDICTION REQUIRED
                    </span>
                    <span className="font-mono text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                      RISK SCORE: {selectedTxn.riskScore}/100
                    </span>
                    <span className="font-mono text-[10px] bg-[var(--bg-surface)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-muted)] truncate">
                      {selectedTxn.transaction_id}
                    </span>
                  </div>

                  <h3 className="mt-1 text-base font-bold text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
                    <span>₹{selectedTxn.amount.toLocaleString('en-IN')}</span>
                    <span className="text-[var(--text-muted)] font-normal">to</span>
                    <span className="truncate">{selectedTxn.merchant}</span>
                    <span className="text-[var(--text-muted)] font-normal">•</span>
                    <span className="text-blue-500 font-semibold">{selectedTxn.customerName}</span>
                    <span className="text-[var(--text-muted)] font-normal text-xs font-mono">({selectedTxn.bankName})</span>
                  </h3>

                  {/* Triggered Reasons */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">Signals:</span>
                    {selectedTxn.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() =>
                    setReportModalData({
                      isOpen: true,
                      caseData:
                        activeCases.find((c) => c.transactionId === selectedTxn.transaction_id) || null,
                      transactionData: selectedTxn,
                    })
                  }
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2.5 text-xs font-bold text-purple-600 dark:text-purple-400 shadow-sm transition-all cursor-pointer"
                  title="Open Explainable Fraud Case Report"
                >
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span>CASE REPORT</span>
                </button>

                <button
                  onClick={handleInvestigateSelected}
                  disabled={isInvestigating}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isInvestigating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing ({investigationProgress.completed}/11)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-white text-white" />
                      <span>INVESTIGATE WITH 11 AGENTS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. MAIN OPERATIONS SPLIT WORKSPACE (5:7 / 40%:60% BALANCED GRID)   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN (5 cols / ~40%): LIVE TRANSACTION STREAM FEED       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 min-w-0 space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                    Live Transaction Stream
                  </h2>
                </div>
                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                  {filteredTransactions.length} Events
                </span>
              </div>

              {/* Search & Filter Bar */}
              <div className="mt-3.5 flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customer, ID, merchant..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-root)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-root)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none shrink-0"
                >
                  <option value="ALL">All Risk</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Real-time Event Cards Feed */}
              <div className="mt-3.5 space-y-2.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar min-w-0">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                    No transactions match the selected filter.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSelected = selectedTxn?.transaction_id === tx.transaction_id;
                    const rStyle = RISK_STYLES[tx.riskLevel];
                    const timeStr = new Date(tx.timestamp).toLocaleTimeString('en-IN', {
                      hour12: false,
                    });

                    return (
                      <div
                        key={tx.transaction_id}
                        onClick={() => setSelectedTxnId(tx.transaction_id)}
                        className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer min-w-0 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/5 shadow-xs ring-1 ring-blue-500/30'
                            : 'border-[var(--border)] bg-[var(--bg-root)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                                {timeStr}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[var(--text-primary)] truncate">
                                {tx.transaction_id}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${rStyle.badgeBg} ${rStyle.badgeText} ${rStyle.border}`}
                              >
                                {rStyle.label} ({tx.riskScore})
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 truncate">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {tx.customerName}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">•</span>
                              <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                                {tx.bankName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-black font-mono text-[var(--text-primary)]">
                              ₹{tx.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="mt-0.5 text-[10px] font-mono font-bold text-[var(--text-muted)] truncate max-w-[110px]">
                              {tx.merchant}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-[var(--border-subtle)] text-[var(--text-muted)] font-mono min-w-0 gap-2">
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <Smartphone className="h-3 w-3 shrink-0 text-amber-500" />
                            <span className="truncate">{tx.device_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                tx.status === 'BLOCKED'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                                  : tx.status === 'CANCELLED'
                                  ? 'bg-slate-500/15 text-slate-500 font-bold'
                                  : tx.status === 'APPROVAL_REQUIRED'
                                  ? 'bg-amber-500/15 text-amber-600 font-bold'
                                  : 'bg-emerald-500/15 text-emerald-600 font-bold'
                              }`}
                            >
                              {tx.status}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--text-muted)] hidden sm:inline">
                              • {tx.decision}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN (7 cols / ~60%): INTELLIGENCE WORKSPACE HASH HUB    */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 min-w-0 space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs min-w-0">
              {/* Tab Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5 bg-[var(--bg-root)] p-1 rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setCenterTab('topology')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      centerTab === 'topology'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Multi-Bank Topology</span>
                  </button>
                  <button
                    onClick={() => setCenterTab('graph')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      centerTab === 'graph'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    <span>Entity Graph</span>
                  </button>
                  <button
                    onClick={() => setCenterTab('chain')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      centerTab === 'chain'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Fraud Chain</span>
                  </button>
                </div>

                {selectedTxn && (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
                    Target: <strong className="text-[var(--text-primary)]">{selectedTxn.transaction_id}</strong>
                  </span>
                )}
              </div>

              <div className="mt-4 min-w-0">
                {/* ─── TAB 1: MULTI-BANK TOPOLOGY ─────────────────────────── */}
                {centerTab === 'topology' && (
                  <div className="space-y-4 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {SYNTHETIC_BANKS.map((b) => {
                        const m = bankMetrics[b.id] || { count: 0, volume: 0, critical: 0, devices: 0 };
                        return (
                          <div
                            key={b.id}
                            className="rounded-xl border p-4 bg-[var(--bg-root)] relative overflow-hidden shadow-xs hover:border-[var(--border-strong)] transition-all flex flex-col justify-between"
                            style={{ borderColor: `${b.color}40` }}
                          >
                            <div
                              className="absolute top-0 left-0 right-0 h-1"
                              style={{ backgroundColor: b.color }}
                            />
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black" style={{ color: b.color }}>
                                  {b.name}
                                </span>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                  {b.city}
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-[var(--text-muted)] truncate">
                                {b.tagline}
                              </p>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block">Txn Volume</span>
                                <span className="font-bold text-[var(--text-primary)]">
                                  ₹{m.volume.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--text-muted)] block">Critical</span>
                                <span className={`font-bold ${m.critical > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  {m.critical} Alerts
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-root)] p-4 text-xs space-y-3">
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                        <span>Connected Banking Nodes &amp; Inter-Bank Routing</span>
                        <span className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Secure TLS Mesh
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 items-center justify-between text-center gap-2">
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="font-bold text-blue-600 dark:text-blue-400">Bank Alpha</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Priya (C1001)</div>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <div className="font-bold text-purple-600 dark:text-purple-400">Bank Nova</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Rohan (C1002)</div>
                        </div>
                        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                          <div className="font-bold text-teal-600 dark:text-teal-400">Bank Horizon</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Neha (C1008)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: ENTITY RELATIONSHIP GRAPH ───────────────────── */}
                {centerTab === 'graph' && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-root)] p-5 min-h-[340px] flex flex-col justify-between min-w-0">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center justify-between">
                        <span>Entity Correlator Graph</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                          Subject: {selectedTxn ? selectedTxn.customerName : 'C1003 Attacker'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
                        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px]">
                            <User className="h-3.5 w-3.5 shrink-0" /> Customer Node
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.customerName || 'Vikram Malhotra'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            ID: {selectedTxn?.customer_id || 'C1003'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-purple-500 font-bold text-[11px]">
                            <CreditCard className="h-3.5 w-3.5 shrink-0" /> Account Node
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.account_id || 'ACC-1003-SAV'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                            Bank: {selectedTxn?.bankName || 'Bank Alpha'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px]">
                            <Smartphone className="h-3.5 w-3.5 shrink-0" /> Device Node
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.device_id || 'DEV-MOBILE-UNSET'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Fingerprint: Verified
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-teal-500/30 bg-teal-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-teal-500 font-bold text-[11px]">
                            <Store className="h-3.5 w-3.5 shrink-0" /> Merchant Node
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.merchant || 'FreshMart'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Category: Retail
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[11px]">
                            <Globe className="h-3.5 w-3.5 shrink-0" /> Network IP Node
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.ip_address || '122.167.45.12'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            City: {selectedTxn?.city || 'Bengaluru'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 min-w-0">
                          <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-[11px]">
                            <GitMerge className="h-3.5 w-3.5 shrink-0" /> Ring Linkage
                          </div>
                          <div className="mt-1 font-bold text-[var(--text-primary)] truncate">
                            {selectedTxn?.customer_id === 'C1003' ? 'CRITICAL FRAUD RING' : 'Single User'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            {selectedTxn?.customer_id === 'C1003' ? 'Cross-Bank Velocity' : 'Isolated Session'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Deep forensic topology across shared emulators, proxy clusters &amp; multi-mule accounts
                      </span>
                      <button
                        onClick={() => {
                          window.location.hash = 'entity-graph';
                        }}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
                      >
                        <Network className="h-3.5 w-3.5" />
                        <span>Open Fraud-Ring Workspace</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: FRAUD PROGRESSION CHAIN ─────────────────────── */}
                {centerTab === 'chain' && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-root)] p-5 space-y-4 min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      End-to-End Transaction &amp; Fraud Progression Chain
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 items-center justify-between text-center gap-2 py-2 font-mono">
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <Smartphone className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                        <div className="text-[10px] font-bold">1. DEVICE</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono truncate">
                          {selectedTxn?.device_id || 'DEV-MOBILE'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <User className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                        <div className="text-[10px] font-bold">2. CUSTOMER</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono truncate">
                          {selectedTxn?.customerName}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <CreditCard className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                        <div className="text-[10px] font-bold">3. ACCOUNT</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono truncate">
                          {selectedTxn?.account_id}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <Activity className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                        <div className="text-[10px] font-bold">4. PAYMENT</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono truncate font-bold">
                          ₹{selectedTxn?.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                        <ShieldAlert className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                        <div className="text-[10px] font-bold">5. DECISION</div>
                        <div className="text-[9px] text-rose-500 font-mono truncate font-bold">
                          {selectedTxn?.decision || 'EVALUATED'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 5. 11-AGENT INVESTIGATION WORKSPACE PANEL (ACTIVATED ON DEMAND)     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {investigationResults && (
          <div className="rounded-2xl border-2 border-indigo-500/40 bg-[var(--bg-surface)] p-5 shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border)] gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    11-Agent Autonomous Investigation Pipeline Result
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Transaction ID: <span className="font-mono text-indigo-500 font-bold">{investigationResults.txnId}</span> • Verdict: <span className="font-bold text-rose-500">{investigationResults.investigation.summary?.verdict || investigationResults.riskResult.summary}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {investigationResults.caseCreated && (
                  <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1.5">
                    <FolderKanban className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      Case #{investigationResults.caseCreated.caseNumber} Auto-Created
                    </span>
                  </div>
                )}
                <button
                  onClick={() =>
                    setReportModalData({
                      isOpen: true,
                      caseData: investigationResults.caseCreated || null,
                      transactionData: selectedTxn || null,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>View Full Case Report</span>
                </button>
              </div>
            </div>

            {/* 11 Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {investigationResults.agentResults.map((agent, i) => {
                const meta = AGENT_METAS.find((m) => m.name.toLowerCase() === agent.agent_name.toLowerCase()) || AGENT_METAS[0];
                const Icon = meta.icon;

                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-root)] space-y-2 shadow-xs hover:border-[var(--border-strong)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1 rounded-md"
                            style={{ backgroundColor: `${meta.accentColor}20`, color: meta.accentColor }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {agent.agent_name} Agent
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-blue-500/10 text-blue-600">
                          Stage {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {agent.summary}
                      </p>
                    </div>

                    {agent.evidence && agent.evidence.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono truncate">
                        <span className="font-bold text-[var(--text-secondary)]">Evidence:</span> {agent.evidence[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 6. LOWER DASHBOARD OPERATIONS GRID (UNIFORM 3-COLUMN EQUAL LAYOUT)  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* ─── COLUMN 1: DEVICE FLEET & SOC REGISTRY ────────────────────── */}
          <div className="min-w-0 h-full flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="h-4 w-4 text-blue-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                    Active Phone Fleet &amp; Registry
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold text-emerald-500 shrink-0">
                  {connectedDevices.length} Devices
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {connectedDevices.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                    No physical phones registered.
                  </div>
                ) : (
                  connectedDevices.map((dev) => {
                    const isOnline = dev.status === 'ONLINE';
                    return (
                      <div
                        key={dev.device_id}
                        className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] flex items-center justify-between text-xs min-w-0"
                      >
                        <div className="truncate mr-2 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] truncate">
                            <span className="truncate">{dev.device_id}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-600 shrink-0">
                              {dev.role || 'CUSTOMER'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                            {dev.customer_id ? `Customer: ${dev.customer_id}` : 'Unauthenticated'} • {dev.bank || 'ALPHA'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold font-mono ${
                              isOnline ? 'text-emerald-500' : 'text-slate-400'
                            }`}
                          >
                            {dev.status || 'ONLINE'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
              Live device status &amp; hardware session integrity registry
            </div>
          </div>

          {/* ─── COLUMN 2: ACTIVE FRAUD CASES ─────────────────────────────── */}
          <div className="min-w-0 h-full flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderKanban className="h-4 w-4 text-purple-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                    Active Fraud Cases (/cases)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] shrink-0">
                  {activeCases.length} Registered
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {activeCases.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                    No fraud cases created yet. High-risk transactions auto-escalate here.
                  </div>
                ) : (
                  activeCases.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] flex items-center justify-between text-xs min-w-0 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-[var(--text-primary)] truncate">
                          {c.caseNumber || c.id}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                          Cust: {c.customerId} • Txn: {c.transactionId}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-mono">
                            {c.riskLevel || 'CRITICAL'} ({c.riskScore || 90})
                          </span>
                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {c.status || 'INVESTIGATING'}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setReportModalData({
                              isOpen: true,
                              caseData: c,
                              transactionData:
                                rawTransactions.find((tx) => tx.transaction_id === c.transactionId) || null,
                            })
                          }
                          className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-purple-500/10 hover:border-purple-500/30 text-[var(--text-secondary)] hover:text-purple-600 transition cursor-pointer"
                          title="View Explainable Fraud Report"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
              SOC cases with assigned analyst workflow and explainable reports
            </div>
          </div>

          {/* ─── COLUMN 3: APPEND-ONLY AUDIT TRAIL ────────────────────────── */}
          <div className="min-w-0 h-full flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs col-span-1 md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                    Audit Trail (/audit_logs)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-500 shrink-0 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Hash-Chain
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {recentAuditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                    Audit events will stream here automatically.
                  </div>
                ) : (
                  recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] flex items-center justify-between text-xs font-mono min-w-0 gap-2"
                    >
                      <div className="truncate min-w-0 flex-1">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-1.5 truncate">
                          [{log.objectType}: {log.objectId}]
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour12: false })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
              Cryptographically verified non-repudiable log events
            </div>
          </div>
        </div>
      </div>

      {/* Explainable Fraud Case Report Modal */}
      <FraudCaseReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData((prev) => ({ ...prev, isOpen: false }))}
        caseData={reportModalData.caseData}
        transactionData={reportModalData.transactionData}
      />
    </div>
  );
};

export default CommandCenter;
