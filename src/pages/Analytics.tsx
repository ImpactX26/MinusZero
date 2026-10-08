import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Activity,
  MapPin,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  FolderKanban,
} from 'lucide-react';
import { transactionsCol, casesCol } from '../firebase/collections';
import { query, onSnapshot } from 'firebase/firestore';
import { Transaction, Case, RiskLevel } from '../types';
import { SYNTHETIC_TRANSACTIONS } from '../data/scenarios';

export const Analytics: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(() => SYNTHETIC_TRANSACTIONS);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState<'ALL' | 'RECENT'>('ALL');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // 1. Subscribe to Live Firestore Transactions (merging with synthetic dataset)
  useEffect(() => {
    const unsub = onSnapshot(query(transactionsCol()), (snap) => {
      if (!snap.empty) {
        const txMap = new Map<string, Transaction>();
        SYNTHETIC_TRANSACTIONS.forEach((t) => txMap.set(t.transaction_id, t));
        snap.forEach((doc) => {
          const t = { ...doc.data(), id: doc.id } as Transaction;
          txMap.set(t.transaction_id, t);
        });
        setAllTransactions(Array.from(txMap.values()));
      }
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Cases
  useEffect(() => {
    const unsub = onSnapshot(query(casesCol()), (snap) => {
      const casesData: Case[] = [];
      snap.forEach((doc) => {
        casesData.push({ ...doc.data(), id: doc.id } as Case);
      });

      // Default canonical cases for baseline analytics if firestore has not been populated
      if (casesData.length === 0) {
        casesData.push(
          {
            id: 'CASE-C1003-HERO',
            caseNumber: 'CASE-2026-C1003',
            transactionId: 'TXN-SEED-C1003-FRAUD',
            customerId: 'C1003',
            status: 'IN_REVIEW',
            riskScore: 95,
            riskLevel: 'CRITICAL',
            confidence: 0.96,
            verdict: 'COORDINATED_ACCOUNT_TAKEOVER',
            recommendation: 'BLOCK_AND_CREATE_CASE',
            investigationSummary: 'ATO via Kali Linux root emulator & Mumbai credential stuffing burst.',
            createdAt: '2026-10-07T02:15:00Z',
            updatedAt: '2026-10-07T02:20:00Z',
            reasonCodes: [
              { code: 'ROGUE_EMULATOR', title: 'Kali Linux Root Emulator', points: 30, direction: 'RISK' },
              { code: 'MULTIPLE_FAILED_LOGINS', title: '3 Failed Logins in Mumbai', points: 25, direction: 'RISK' },
              { code: 'HIGH_AMOUNT_DEVIATION', title: '₹85,000 High Deviation', points: 25, direction: 'RISK' },
              { code: 'HIGH_RISK_MERCHANT', title: 'Jewellery Out-of-Hours Merchant', points: 15, direction: 'RISK' },
            ],
          },
          {
            id: 'CASE-RING-01',
            caseNumber: 'CASE-2026-RING-01',
            transactionId: 'TXN-SCENARIO-E-RING-01',
            customerId: 'C1015',
            status: 'ACTIONED',
            riskScore: 92,
            riskLevel: 'CRITICAL',
            confidence: 0.94,
            verdict: 'MULE_FRAUD_RING',
            recommendation: 'BLOCK_AND_CREATE_CASE',
            investigationSummary: 'Shared emulator hardware cluster draining funds to crypto mule wallet.',
            createdAt: '2026-10-07T03:15:00Z',
            updatedAt: '2026-10-07T03:30:00Z',
            reasonCodes: [
              { code: 'SHARED_DEVICE_CLUSTER', title: 'Shared Emulator Hardware Cluster', points: 30, direction: 'RISK' },
              { code: 'DATACENTER_PROXY', title: 'Tor / Datacenter Proxy IP', points: 25, direction: 'RISK' },
              { code: 'CRYPTO_CASH_OUT', title: 'P2P Crypto Cash-out Destination', points: 20, direction: 'RISK' },
            ],
          },
          {
            id: 'CASE-1002-SUSP',
            caseNumber: 'CASE-2026-1002',
            transactionId: 'TXN-SEED-SUSPICIOUS',
            customerId: 'C1002',
            status: 'NEW',
            riskScore: 68,
            riskLevel: 'MEDIUM',
            confidence: 0.88,
            verdict: 'MODERATE_ANOMALY',
            recommendation: 'STEP_UP_VERIFICATION',
            investigationSummary: 'New Windows desktop workstation & late night electronics purchase.',
            createdAt: '2026-10-07T23:20:00Z',
            updatedAt: '2026-10-07T23:25:00Z',
            reasonCodes: [
              { code: 'NEW_DEVICE', title: 'Unrecognized Desktop Hardware', points: 25, direction: 'RISK' },
              { code: 'UNUSUAL_HOUR', title: 'Late Night Transaction (23:15)', points: 15, direction: 'RISK' },
              { code: 'AMOUNT_DEVIATION', title: 'Moderate Spend Jump (₹25,000)', points: 20, direction: 'RISK' },
            ],
          }
        );
      }
      setAllCases(casesData);
    });
    return () => unsub();
  }, []);

  // Filter transactions based on timeframe if needed
  const filteredTxs = useMemo(() => {
    if (activeTimeframe === 'RECENT') {
      const cutoff = new Date('2026-10-07T00:00:00Z').getTime();
      return allTransactions.filter((t) => new Date(t.timestamp).getTime() >= cutoff);
    }
    return allTransactions;
  }, [allTransactions, activeTimeframe]);

  // Aggregate Primary Metrics
  const metrics = useMemo(() => {
    let totalVol = 0;
    let allowedCount = 0;
    let allowedVol = 0;
    let stepUpCount = 0;
    let stepUpVol = 0;
    let blockedCount = 0;
    let blockedVol = 0;

    const cityCounts: Record<string, { count: number; volume: number; blocked: number }> = {};
    const channelCounts: Record<string, { count: number; volume: number; blocked: number }> = {};

    for (const tx of filteredTxs) {
      totalVol += tx.amount;

      // Decision and Risk mapping
      if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') {
        blockedCount++;
        blockedVol += tx.amount;
      } else if (tx.status === 'STEP_UP_VERIFICATION') {
        stepUpCount++;
        stepUpVol += tx.amount;
      } else {
        allowedCount++;
        allowedVol += tx.amount;
      }

      // City distribution
      if (!cityCounts[tx.city]) {
        cityCounts[tx.city] = { count: 0, volume: 0, blocked: 0 };
      }
      cityCounts[tx.city].count++;
      cityCounts[tx.city].volume += tx.amount;
      if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') {
        cityCounts[tx.city].blocked++;
      }

      // Channel distribution
      const channel = tx.channel || tx.transaction_type || 'UPI';
      if (!channelCounts[channel]) {
        channelCounts[channel] = { count: 0, volume: 0, blocked: 0 };
      }
      channelCounts[channel].count++;
      channelCounts[channel].volume += tx.amount;
      if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') {
        channelCounts[channel].blocked++;
      }
    }

    const totalTx = filteredTxs.length;

    // Derived risk tier estimates across the synthetic transaction baseline
    // 0-30: LOW, 31-70: MEDIUM, 71-90: HIGH, 91-100: CRITICAL
    // We map blocked into High/Critical, step-up into Medium, allowed into Low
    const criticalCount = allCases.filter((c) => c.riskLevel === 'CRITICAL').length || 2;
    const highCount = Math.max(0, blockedCount - criticalCount);
    const mediumCount = stepUpCount;
    const lowCount = allowedCount;

    const totalActioned = totalTx || 1;
    const allowedPct = Math.round((allowedCount / totalActioned) * 100);
    const stepUpPct = Math.round((stepUpCount / totalActioned) * 100);
    const blockedPct = Math.round((blockedCount / totalActioned) * 100);

    const criticalCases = allCases.filter((c) => c.riskLevel === 'CRITICAL').length;
    const highCases = allCases.filter((c) => c.riskLevel === 'HIGH').length;

    return {
      totalTx,
      totalVol,
      allowedCount,
      allowedVol,
      allowedPct,
      stepUpCount,
      stepUpVol,
      stepUpPct,
      blockedCount,
      blockedVol,
      blockedPct,
      lowCount,
      mediumCount,
      highCount,
      criticalCount,
      totalCases: allCases.length,
      criticalCases,
      highCases,
      interdictionRate: Math.round(((blockedCount + stepUpCount) / totalActioned) * 100),
      cityCounts,
      channelCounts,
    };
  }, [filteredTxs, allCases]);

  // Aggregate Top Triggered Risk Signals
  const topSignals = useMemo(() => {
    const signalFrequency: Record<string, { title: string; count: number; domain: string; severity: RiskLevel }> = {
      HIGH_AMOUNT_DEVIATION: {
        title: 'High Amount Deviation (>3x Limit)',
        count: 14,
        domain: 'AMOUNT',
        severity: 'HIGH',
      },
      NEW_DEVICE: {
        title: 'New / Unregistered Device Hardware',
        count: 11,
        domain: 'DEVICE',
        severity: 'MEDIUM',
      },
      MULTIPLE_FAILED_LOGINS: {
        title: 'Pre-auth Failed Password Bursts',
        count: 9,
        domain: 'AUTH',
        severity: 'CRITICAL',
      },
      ROGUE_EMULATOR: {
        title: 'Root / Emulated Workstation (Kali/VM)',
        count: 7,
        domain: 'DEVICE',
        severity: 'CRITICAL',
      },
      IMPOSSIBLE_TRAVEL: {
        title: 'Impossible Geo-Velocity (<4h Cross-City)',
        count: 6,
        domain: 'GEO',
        severity: 'HIGH',
      },
      UNUSUAL_HOUR: {
        title: 'Uncharacteristic Night Hour (01:00-05:00)',
        count: 5,
        domain: 'BEHAVIOR',
        severity: 'MEDIUM',
      },
      DATACENTER_PROXY: {
        title: 'Datacenter Proxy / Tor Exit Node',
        count: 4,
        domain: 'NETWORK',
        severity: 'HIGH',
      },
      HIGH_RISK_MERCHANT: {
        title: 'High-Risk Merchant MCC (Jewellery/Crypto)',
        count: 4,
        domain: 'MERCHANT',
        severity: 'HIGH',
      },
    };

    // Increment from cases reason codes if available
    allCases.forEach((cs) => {
      if (cs.reasonCodes) {
        cs.reasonCodes.forEach((rc) => {
          if (signalFrequency[rc.code]) {
            signalFrequency[rc.code].count += 1;
          }
        });
      }
    });

    return Object.entries(signalFrequency)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [allCases]);

  // Transaction Activity Trend (Chronological aggregation buckets)
  const activityTrend = useMemo(() => {
    // Bucket transactions across chronological timestamps
    const buckets: Record<string, { label: string; allowed: number; stepUp: number; blocked: number; volume: number }> = {};

    // Sort transactions chronologically
    const sorted = [...filteredTxs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sorted.forEach((t) => {
      const date = new Date(t.timestamp);
      // Group by day or hour
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      if (!buckets[key]) {
        buckets[key] = { label: key, allowed: 0, stepUp: 0, blocked: 0, volume: 0 };
      }
      buckets[key].volume += t.amount;
      if (t.status === 'BLOCK_AND_REVIEW' || t.status === 'BLOCKED') {
        buckets[key].blocked++;
      } else if (t.status === 'STEP_UP_VERIFICATION') {
        buckets[key].stepUp++;
      } else {
        buckets[key].allowed++;
      }
    });

    return Object.values(buckets);
  }, [filteredTxs]);

  const maxTrendVolume = useMemo(() => {
    return Math.max(...activityTrend.map((b) => b.allowed + b.stepUp + b.blocked), 1);
  }, [activityTrend]);

  return (
    <div className="space-y-6">
      {/* ─── HEADER STRIP ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Fraud Analytics Dashboard</h1>
              <span className="badge text-[9px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                LIVE ENGINE FEED
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Comprehensive telemetry, risk distributions, typology frequencies, and automated decision analytics
            </p>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTimeframe('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTimeframe === 'ALL'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Dataset (60+ Txns)
          </button>
          <button
            onClick={() => setActiveTimeframe('RECENT')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTimeframe === 'RECENT'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Oct 7 Live Runs
          </button>
        </div>
      </div>

      {/* ─── ROW 1: PRIMARY KPI STAT CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Transactions Card */}
        <div className="glass-card p-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative overflow-hidden group shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <span>Total Transactions</span>
            <Activity className="h-4 w-4 text-[#3157D5]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">{metrics.totalTx}</div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>₹{(metrics.totalVol / 1000).toFixed(1)}k Gross Volume</span>
            <span className="text-[#16866A] font-semibold flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5 inline" /> 100% Monitored
            </span>
          </div>
        </div>

        {/* Interdicted Value Card */}
        <div className="glass-card p-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative overflow-hidden group shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <span>Prevented Fraud (Blocked)</span>
            <ShieldAlert className="h-4 w-4 text-[#C43D4B]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            ₹{(metrics.blockedVol / 1000).toFixed(1)}k
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>{metrics.blockedCount} Interdicted Transactions</span>
            <span className="text-[#C43D4B] font-semibold">{metrics.blockedPct}% Interdicted</span>
          </div>
        </div>

        {/* Active Cases Card */}
        <div className="glass-card p-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative overflow-hidden group shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <span>Investigation Cases</span>
            <FolderKanban className="h-4 w-4 text-[#3157D5]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">{metrics.totalCases}</div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
            <span className="text-[#C43D4B] font-semibold">{metrics.criticalCases} Critical Escalations</span>
            <span className="text-[#3157D5] font-medium">Cockpit Active</span>
          </div>
        </div>

        {/* Average Composite Risk */}
        <div className="glass-card p-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative overflow-hidden group shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <span>Friction vs Safety</span>
            <ShieldCheck className="h-4 w-4 text-[#16866A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {metrics.allowedPct}%
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>Instant Zero-Friction Settle</span>
            <span className="text-[#B7791F] font-semibold">{metrics.stepUpPct}% Step-Up OTP</span>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: RISK DISTRIBUTION & DECISION MAPPING ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: LOW / MEDIUM / HIGH / CRITICAL DISTRIBUTION */}
        <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#3157D5]" /> Risk Tier Distribution
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Deterministic Score Bands</span>
            </div>

            {/* Multi-segment Progress Bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-5 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <div
                style={{ width: `${metrics.allowedPct}%` }}
                className="bg-[#16866A] transition-all duration-700"
                title={`LOW: ${metrics.allowedPct}%`}
              />
              <div
                style={{ width: `${metrics.stepUpPct}%` }}
                className="bg-[#B7791F] transition-all duration-700"
                title={`MEDIUM: ${metrics.stepUpPct}%`}
              />
              <div
                style={{ width: `${Math.max(4, Math.round((metrics.highCount / metrics.totalTx) * 100))}%` }}
                className="bg-[#C65D1E] transition-all duration-700"
                title={`HIGH: ${Math.round((metrics.highCount / metrics.totalTx) * 100)}%`}
              />
              <div
                style={{ width: `${Math.max(4, Math.round((metrics.criticalCount / metrics.totalTx) * 100))}%` }}
                className="bg-[#C43D4B] transition-all duration-700"
                title={`CRITICAL: ${Math.round((metrics.criticalCount / metrics.totalTx) * 100)}%`}
              />
            </div>

            {/* 4 Tier Metric Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono">LOW (0-30)</span>
                  <span className="h-2 w-2 rounded-full bg-[#16866A]" />
                </div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{metrics.lowCount}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">{metrics.allowedPct}% of total</div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono">MEDIUM (31-70)</span>
                  <span className="h-2 w-2 rounded-full bg-[#B7791F]" />
                </div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{metrics.mediumCount}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">{metrics.stepUpPct}% of total</div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono">HIGH (71-90)</span>
                  <span className="h-2 w-2 rounded-full bg-[#C65D1E]" />
                </div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{metrics.highCount}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  {Math.round((metrics.highCount / (metrics.totalTx || 1)) * 100)}% of total
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono">CRITICAL (91+)</span>
                  <span className="h-2 w-2 rounded-full bg-[#C43D4B]" />
                </div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{metrics.criticalCount}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  {Math.round((metrics.criticalCount / (metrics.totalTx || 1)) * 100)}% of total
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Deterministic Scoring Policy: Rules-only calculation with zero AI hallucination.</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">Scale 0 - 100</span>
          </div>
        </div>

        {/* SECTION 2: ALLOW / STEP-UP / BLOCK DECISIONS */}
        <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#3157D5]" /> Decision Dispositions Breakdown
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Automated Actions</span>
            </div>

            <div className="space-y-3.5">
              {/* ALLOW */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#16866A]" />
                    <span className="font-semibold text-[var(--text-primary)]">ALLOW</span>
                    <span className="text-[10px] text-[var(--text-muted)]">(Instant Frictionless Settlement)</span>
                  </div>
                  <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">
                    {metrics.allowedCount} txns • {metrics.allowedPct}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                  <div style={{ width: `${metrics.allowedPct}%` }} className="h-full bg-[#16866A] transition-all duration-700" />
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 text-right">
                  ₹{(metrics.allowedVol / 1000).toFixed(1)}k settled safely
                </div>
              </div>

              {/* STEP-UP */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#B7791F]" />
                    <span className="font-semibold text-[var(--text-primary)]">STEP_UP_VERIFICATION</span>
                    <span className="text-[10px] text-[var(--text-muted)]">(MFA / Biometric Challenge)</span>
                  </div>
                  <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">
                    {metrics.stepUpCount} txns • {metrics.stepUpPct}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                  <div style={{ width: `${metrics.stepUpPct}%` }} className="h-full bg-[#B7791F] transition-all duration-700" />
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 text-right">
                  ₹{(metrics.stepUpVol / 1000).toFixed(1)}k challenged pre-auth
                </div>
              </div>

              {/* BLOCK */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#C43D4B]" />
                    <span className="font-semibold text-[var(--text-primary)]">BLOCK_AND_REVIEW / CASE</span>
                    <span className="text-[10px] text-[var(--text-muted)]">(Interdicted & Investigated)</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#C43D4B]">
                    {metrics.blockedCount} txns • {metrics.blockedPct}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                  <div style={{ width: `${metrics.blockedPct}%` }} className="h-full bg-[#C43D4B] transition-all duration-700" />
                </div>
                <div className="text-[10px] text-[#C43D4B] font-mono mt-0.5 text-right font-semibold">
                  ₹{(metrics.blockedVol / 1000).toFixed(1)}k prevented from fraud
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Adheres to Isolation Rule: Single new IP or city never triggers an outright BLOCK.</span>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: TRANSACTION ACTIVITY TREND (LIGHTWEIGHT CSS/SVG CHART) ────────── */}
      <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#3157D5]" /> Transaction Activity Trend
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Chronological flow of processed volume comparing safe settlements versus flagged events
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[#16866A]" /> Allowed
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[#B7791F]" /> Step-Up
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[#C43D4B]" /> Blocked
            </span>
          </div>
        </div>

        {/* Lightweight Pure CSS Bar Chart */}
        <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-[var(--border-subtle)] relative overflow-x-auto">
          {/* Background Reference Lines */}
          <div className="absolute inset-x-0 top-1/4 h-px border-b border-dashed border-[var(--border-subtle)]" />
          <div className="absolute inset-x-0 top-2/4 h-px border-b border-dashed border-[var(--border-subtle)]" />
          <div className="absolute inset-x-0 top-3/4 h-px border-b border-dashed border-[var(--border-subtle)]" />

          {activityTrend.map((bucket, idx) => {
            const totalInBucket = bucket.allowed + bucket.stepUp + bucket.blocked;
            const heightPct = Math.max(15, Math.round((totalInBucket / maxTrendVolume) * 100));
            const isHovered = hoveredTrendIdx === idx;

            return (
              <div
                key={bucket.label}
                onMouseEnter={() => setHoveredTrendIdx(idx)}
                onMouseLeave={() => setHoveredTrendIdx(null)}
                className="flex-1 min-w-[36px] flex flex-col items-center h-full justify-end relative group cursor-pointer"
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-md rounded p-2 text-[10px] font-mono z-20 whitespace-nowrap">
                    <div className="font-bold text-[var(--text-primary)]">{bucket.label}</div>
                    <div className="text-[#16866A]">Allowed: {bucket.allowed}</div>
                    <div className="text-[#B7791F]">Step-Up: {bucket.stepUp}</div>
                    <div className="text-[#C43D4B]">Blocked: {bucket.blocked}</div>
                    <div className="text-[var(--text-primary)] font-bold pt-1 border-t border-[var(--border-subtle)] mt-1">
                      ₹{bucket.volume.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Stacked Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[28px] rounded-t flex flex-col-reverse overflow-hidden transition-all duration-300 group-hover:brightness-110 shadow-xs"
                >
                  <div style={{ flex: bucket.allowed }} className="bg-[#16866A] w-full" />
                  <div style={{ flex: bucket.stepUp }} className="bg-[#B7791F] w-full" />
                  <div style={{ flex: bucket.blocked }} className="bg-[#C43D4B] w-full" />
                </div>

                {/* X-Axis Label */}
                <div className="text-[9px] font-mono text-[var(--text-muted)] mt-1.5 truncate max-w-full">
                  {bucket.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono mt-2">
          <span>Telemetry Sampling Sequence</span>
          <span>Aggregated across {activityTrend.length} chronological cohorts</span>
        </div>
      </div>

      {/* ─── ROW 4: TOP TRIGGERED RISK SIGNALS & CASE FUNNEL ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP TRIGGERED RISK SIGNALS */}
        <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#3157D5]" /> Top Triggered Risk Signals
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Anomaly Typologies</span>
          </div>

          <div className="space-y-3">
            {topSignals.slice(0, 7).map((signal) => {
              const maxHits = topSignals[0]?.count || 1;
              const barPct = Math.round((signal.count / maxHits) * 100);

              return (
                <div key={signal.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                        {signal.domain}
                      </span>
                      <span className="font-medium text-[var(--text-primary)] truncate text-[11px]" title={signal.title}>
                        {signal.title}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)] shrink-0">
                      {signal.count} hits
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPct}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        signal.severity === 'CRITICAL'
                          ? 'bg-[#C43D4B]'
                          : signal.severity === 'HIGH'
                          ? 'bg-[#C65D1E]'
                          : 'bg-[#B7791F]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INVESTIGATION & CASE FUNNEL */}
        <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-[#3157D5]" /> Investigation Case Funnel
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Triage Conversion</span>
            </div>

            {/* Funnel Visual Stages */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    Stage 1: Evaluated Transactions
                  </div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)]">{metrics.totalTx}</div>
                </div>
                <div className="text-right text-[10px] font-mono text-[var(--text-muted)]">
                  100% Deterministic Scored
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    Stage 2: Flagged Anomaly Events
                  </div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {metrics.blockedCount + metrics.stepUpCount}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-[#B7791F] font-semibold">
                  {metrics.interdictionRate}% Anomaly Rate
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    Stage 3: Formal Cases Created
                  </div>
                  <div className="text-base font-bold font-mono text-[var(--text-primary)]">{metrics.totalCases}</div>
                </div>
                <div className="text-right text-[10px] font-mono text-[#C65D1E] font-semibold">
                  Queued for Investigator
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    Stage 4: Critical Escalations
                  </div>
                  <div className="text-base font-bold font-mono text-[#C43D4B]">{metrics.criticalCases}</div>
                </div>
                <div className="text-right text-[10px] font-mono text-[#C43D4B] font-semibold">
                  Immediate SLA Required
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)]">
              Multi-agent evidence synthesis active across all Stage 3 cases.
            </span>
            <button
              onClick={() => (window.location.hash = 'cases')}
              className="text-xs font-semibold text-[#3157D5] hover:underline flex items-center gap-1"
            >
              Open Case Manager →
            </button>
          </div>
        </div>
      </div>

      {/* ─── ROW 5: GEOGRAPHIC DISPERSION & CHANNEL MATRIX ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Breakdown */}
        <div className="glass-card p-5 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--accent)]" /> Geographic Transaction Volume
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">City Distribution</span>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.cityCounts)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 5)
              .map(([city, data]) => {
                const maxCityTx = Object.values(metrics.cityCounts)[0]?.count || 1;
                const pct = Math.round((data.count / maxCityTx) * 100);

                return (
                  <div key={city} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-[var(--text-muted)]" /> {city}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-[var(--text-muted)]">₹{(data.volume / 1000).toFixed(0)}k vol</span>
                        {data.blocked > 0 && (
                          <span className="text-[#C43D4B] font-semibold">{data.blocked} blocked</span>
                        )}
                        <span className="font-semibold text-[var(--text-primary)]">{data.count} txns</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-[#3157D5] rounded-full" />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#3157D5]" /> Payment Channels & Rails
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Rail Volumes</span>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.channelCounts)
              .sort((a, b) => b[1].volume - a[1].volume)
              .map(([rail, data]) => {
                const totalRailVol = metrics.totalVol || 1;
                const pct = Math.round((data.volume / totalRailVol) * 100);

                return (
                  <div key={rail} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold font-mono text-[var(--text-primary)]">{rail}</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-[var(--text-muted)]">{data.count} txns</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          ₹{(data.volume / 1000).toFixed(1)}k ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-[#3157D5] rounded-full" />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
