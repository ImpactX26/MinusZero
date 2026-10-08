import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  AlertTriangle,
  Activity,
  Radio,
  Zap,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SimulatedAlertStage {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  desc: string;
  action: string;
  severity: 'critical' | 'warning' | 'info' | 'action';
}

const ALERT_STAGES: SimulatedAlertStage[] = [
  {
    id: 1,
    badge: 'STAGE 1 • ANOMALY',
    badgeColor: 'text-amber-500 dark:text-amber-400 border-amber-500/40 bg-amber-500/10',
    title: 'FRAUD PATTERN DETECTED',
    desc: 'Simultaneous cross-bank velocity spike across 3 nodes',
    action: 'Telemetry Ingestion Active',
    severity: 'warning',
  },
  {
    id: 2,
    badge: 'STAGE 2 • MULTI-VECTOR',
    badgeColor: 'text-[#3157D5] dark:text-[#22D3EE] border-[#3157D5]/30 dark:border-[#22D3EE]/40 bg-[#3157D5]/10 dark:bg-[#22D3EE]/10',
    title: '7 CORRELATED SIGNALS',
    desc: 'Device mismatch, TOR exit node, impossible geo-speed',
    action: 'Cross-Correlating Graph',
    severity: 'info',
  },
  {
    id: 3,
    badge: 'STAGE 3 • AUTONOMOUS',
    badgeColor: 'text-[#6C63D9] dark:text-[#7C5CFC] border-[#6C63D9]/30 dark:border-[#7C5CFC]/40 bg-[#6C63D9]/10 dark:bg-[#7C5CFC]/10',
    title: 'INVESTIGATION INITIATED',
    desc: '11 AI agents dispatched across synthetic accounts',
    action: 'Evaluating Evidence Dossier',
    severity: 'info',
  },
  {
    id: 4,
    badge: 'STAGE 4 • VERDICT',
    badgeColor: 'text-[#D95C62] dark:text-[#FF6577] border-[#D95C62]/30 dark:border-[#FF6577]/40 bg-[#D95C62]/10 dark:bg-[#FF6577]/10',
    title: 'RISK SCORE 100 • CRITICAL',
    desc: 'Deterministic mathematical threshold breached (≥80)',
    action: 'Intervention Required',
    severity: 'critical',
  },
  {
    id: 5,
    badge: 'STAGE 5 • RESPONSE',
    badgeColor: 'text-[#159A75] dark:text-emerald-400 border-[#159A75]/30 dark:border-emerald-500/40 bg-[#159A75]/10 dark:bg-emerald-500/10',
    title: 'BLOCK & CREATE CASE',
    desc: 'Automated hold placed • Case C1003 routed to analyst',
    action: 'Audit Trail Ledger Sealed',
    severity: 'action',
  },
];

interface LiveTxRow {
  id: string;
  amount: string;
  city: string;
  status: 'CRITICAL' | 'MEDIUM' | 'LOW' | 'NORMAL';
  bank: string;
  time: string;
}

const SEED_TXS: LiveTxRow[] = [
  { id: 'TX-892', amount: '₹85,000', city: 'Mumbai', status: 'CRITICAL', bank: 'Alpha', time: 'Just now' },
  { id: 'TX-441', amount: '₹12,500', city: 'Bengaluru', status: 'LOW', bank: 'Nova', time: '1s ago' },
  { id: 'TX-903', amount: '₹48,000', city: 'Delhi', status: 'MEDIUM', bank: 'Horizon', time: '2s ago' },
  { id: 'TX-312', amount: '₹4,200', city: 'Chennai', status: 'LOW', bank: 'Alpha', time: '3s ago' },
  { id: 'TX-764', amount: '₹68,000', city: 'Delhi', status: 'CRITICAL', bank: 'Nova', time: '4s ago' },
  { id: 'TX-159', amount: '₹19,000', city: 'Hyderabad', status: 'NORMAL', bank: 'Horizon', time: '5s ago' },
];

export const HeroNetworkVisual: React.FC = () => {
  const { actualTheme } = useTheme();
  const [alertStageIndex, setAlertStageIndex] = useState(0);
  const [liveTxs, setLiveTxs] = useState<LiveTxRow[]>(SEED_TXS.slice(0, 4));

  // Rotate simulated fraud alert stages every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAlertStageIndex((prev) => (prev + 1) % ALERT_STAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Gently rotate live transactions every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTxs((prev) => {
        const nextPool = [...SEED_TXS];
        const nextItem = nextPool[Math.floor(Math.random() * nextPool.length)];
        return [{ ...nextItem, id: `TX-${Math.floor(100 + Math.random() * 899)}`, time: 'Just now' }, ...prev.slice(0, 3)];
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentAlert = ALERT_STAGES[alertStageIndex];
  const isLight = actualTheme === 'light';

  return (
    <div className="relative w-full max-w-[620px] aspect-[1/0.95] sm:aspect-square mx-auto select-none">
      {/* Outer ambient glow circles */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#3157D5]/15 via-[#22D3EE]/10 to-[#7C5CFC]/15 blur-3xl -z-10 pointer-events-none" />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border ${isLight ? 'border-[#3157D5]/10' : 'border-white/5'} animate-pulse-halo -z-10 pointer-events-none`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border ${isLight ? 'border-[#3157D5]/5' : 'border-white/[0.03]'} -z-10 pointer-events-none`} />

      {/* SVG Connecting Vector Mesh */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad-alpha" x1="140" y1="160" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3157D5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="grad-nova" x1="460" y1="170" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="grad-horizon" x1="300" y1="460" x2="300" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#19C37D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="shield-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3157D5" stopOpacity="0.4" />
            <stop offset="100%" stopColor={isLight ? "#F6F8FC" : "#07111F"} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient mesh ring connecting bank nodes */}
        <path
          d="M 140 160 Q 300 110 460 170 Q 420 360 300 460 Q 180 360 140 160 Z"
          stroke={isLight ? "rgba(49, 87, 213, 0.15)" : "rgba(255, 255, 255, 0.06)"}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Primary Network Vector Rays */}
        {/* Bank Alpha -> FinGuard Core */}
        <line x1="140" y1="160" x2="300" y2="300" stroke="url(#grad-alpha)" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="140" y1="160" x2="300" y2="300" stroke="#22D3EE" strokeWidth="2.5" className="animate-beam" />

        {/* Bank Nova -> FinGuard Core */}
        <line x1="460" y1="170" x2="300" y2="300" stroke="url(#grad-nova)" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="460" y1="170" x2="300" y2="300" stroke="#7C5CFC" strokeWidth="2.5" className="animate-beam-reverse" />

        {/* Bank Horizon -> FinGuard Core */}
        <line x1="300" y1="460" x2="300" y2="300" stroke="url(#grad-horizon)" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="300" y1="460" x2="300" y2="300" stroke="#19C37D" strokeWidth="2.5" className="animate-beam" />

        {/* Dynamic moving pulse particle on Alpha -> Core */}
        <circle r="4" fill="#22D3EE" filter="drop-shadow(0 0 6px #22D3EE)">
          <animateMotion path="M 140 160 L 300 300" dur="2.4s" repeatCount="indefinite" />
        </circle>
        {/* Dynamic moving pulse particle on Nova -> Core */}
        <circle r="4" fill="#7C5CFC" filter="drop-shadow(0 0 6px #7C5CFC)">
          <animateMotion path="M 460 170 L 300 300" dur="2.8s" repeatCount="indefinite" />
        </circle>
        {/* Dynamic moving pulse particle on Horizon -> Core */}
        <circle r="4" fill="#19C37D" filter="drop-shadow(0 0 6px #19C37D)">
          <animateMotion path="M 300 460 L 300 300" dur="3.1s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* ─── NODE 1: BANK ALPHA (Top-Left) ─── */}
      <div className="absolute top-[20%] left-[8%] sm:left-[12%] -translate-x-1/2 -translate-y-1/2 z-10 animate-float-slow">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/95 dark:bg-[#0B1730]/90 p-2.5 shadow-card dark:shadow-xl dark:shadow-black/40 backdrop-blur-md ring-1 ring-[#3157D5]/20 hover:border-[#3157D5] dark:hover:border-[#22D3EE]/60 transition-all cursor-default">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#3157D5] to-[#22D3EE] text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white tracking-wide">Bank Alpha</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Gateway Alpha-01</div>
          </div>
        </div>
      </div>

      {/* ─── NODE 2: BANK NOVA (Top-Right) ─── */}
      <div className="absolute top-[22%] right-[8%] sm:right-[10%] translate-x-1/2 -translate-y-1/2 z-10 animate-float-reverse">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/95 dark:bg-[#0B1730]/90 p-2.5 shadow-card dark:shadow-xl dark:shadow-black/40 backdrop-blur-md ring-1 ring-[#7C5CFC]/20 hover:border-[#7C5CFC] dark:hover:border-[#7C5CFC]/60 transition-all cursor-default">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#FF6577] text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white tracking-wide">Bank Nova</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] animate-pulse" />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Gateway Nova-99</div>
          </div>
        </div>
      </div>

      {/* ─── NODE 3: BANK HORIZON (Bottom-Center) ─── */}
      <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 z-10 animate-float-slow">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/95 dark:bg-[#0B1730]/90 p-2.5 shadow-card dark:shadow-xl dark:shadow-black/40 backdrop-blur-md ring-1 ring-[#19C37D]/20 hover:border-[#19C37D] dark:hover:border-[#19C37D]/60 transition-all cursor-default">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#19C37D] to-[#22D3EE] text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white tracking-wide">Bank Horizon</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#19C37D] animate-pulse" />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Gateway Horizon-04</div>
          </div>
        </div>
      </div>

      {/* ─── CENTRAL FINGUARD CORE SHIELD ─── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative flex flex-col items-center">
          {/* Animated concentric radar rings */}
          <div className="absolute inset-0 -m-8 rounded-full border border-[#3157D5]/20 dark:border-[#22D3EE]/25 animate-pulse-ring pointer-events-none" />
          <div className="absolute inset-0 -m-16 rounded-full border border-[#3157D5]/15 dark:border-[#3157D5]/20 animate-pulse-ring [animation-delay:1.2s] pointer-events-none" />

          {/* Central Shield Orb */}
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-b from-[#EEF2FF] to-[#FFFFFF] dark:from-[#112349] dark:to-[#07111F] border-2 border-[#3157D5] dark:border-[#22D3EE]/70 shadow-xl dark:shadow-2xl shadow-[#3157D5]/20 dark:shadow-[#3157D5]/50 ring-4 ring-[#3157D5]/15 dark:ring-[#3157D5]/20 group hover:scale-105 transition-transform duration-300">
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-[#3157D5] dark:text-[#22D3EE] filter drop-shadow-[0_0_12px_rgba(49,87,213,0.4)] dark:drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
            <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-[var(--surface)] dark:bg-[#07111F] border border-[#3157D5]/30 dark:border-[#22D3EE]/40 text-[9px] font-mono text-[#3157D5] dark:text-[#22D3EE] font-bold tracking-wider shadow-xs">
              CORE AI
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs font-bold text-[var(--text-primary)] dark:text-white tracking-wider flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              <span>FIN GUARD ENGINE</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">11 Agents Active</div>
          </div>
        </div>
      </div>

      {/* ─── FLOATING TRANSACTION CARDS ─── */}
      {/* Floating Card 1: Critical ₹85,000 Mumbai */}
      <div className="absolute top-[35%] left-[2%] sm:left-[6%] z-15 animate-float-reverse">
        <div className="rounded-lg border border-[#D95C62]/40 dark:border-[#FF6577]/40 bg-[var(--surface)]/95 dark:bg-[#0B1730]/95 p-2 sm:p-2.5 shadow-card dark:shadow-lg dark:shadow-black/50 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-mono font-bold text-[var(--text-primary)] dark:text-white">₹85,000</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D95C62]/10 dark:bg-[#FF6577]/20 border border-[#D95C62]/30 dark:border-[#FF6577]/40 text-[#D95C62] dark:text-[#FF6577] flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-[#D95C62] dark:bg-[#FF6577] animate-ping" />
              CRITICAL
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] dark:text-slate-400">
            <span>Mumbai</span>
            <span className="font-mono text-[var(--text-muted)] dark:text-slate-500">Score 100</span>
          </div>
        </div>
      </div>

      {/* Floating Card 2: Normal ₹12,500 Bengaluru */}
      <div className="absolute top-[40%] right-[2%] sm:right-[6%] z-15 animate-float-slow">
        <div className="rounded-lg border border-emerald-500/30 bg-[var(--surface)]/95 dark:bg-[#0B1730]/95 p-2 sm:p-2.5 shadow-card dark:shadow-lg dark:shadow-black/50 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-mono font-bold text-[var(--text-primary)] dark:text-white">₹12,500</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              NORMAL
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] dark:text-slate-400">
            <span>Bengaluru</span>
            <span className="font-mono text-[var(--text-muted)] dark:text-slate-500">Score 12</span>
          </div>
        </div>
      </div>

      {/* Floating Card 3: Suspicious ₹68,000 Delhi */}
      <div className="absolute bottom-[30%] left-[8%] sm:left-[14%] z-15 animate-float-slow">
        <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-[var(--surface)]/95 dark:bg-[#0B1730]/95 p-2 sm:p-2.5 shadow-card dark:shadow-lg dark:shadow-black/50 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-mono font-bold text-[var(--text-primary)] dark:text-white">₹68,000</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-400">
              SUSPICIOUS
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] dark:text-slate-400">
            <span>Delhi</span>
            <span className="font-mono text-[var(--text-muted)] dark:text-slate-500">Score 65</span>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC SIMULATED FRAUD ALERT BADGE (Center-Top) ─── */}
      <div className="absolute top-[6%] left-1/2 -translate-x-1/2 z-25 w-[90%] max-w-[320px]">
        <div className="rounded-xl border border-[var(--border)] dark:border-white/15 bg-[var(--surface)]/95 dark:bg-[#07111F]/90 p-3 shadow-elevated dark:shadow-2xl dark:shadow-black/60 backdrop-blur-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${currentAlert.badgeColor}`}>
              {currentAlert.badge}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">
              <Radio className="h-3 w-3 text-[#3157D5] dark:text-[#22D3EE] animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <div className="text-xs font-bold text-[var(--text-primary)] dark:text-white flex items-center gap-1.5 mb-0.5">
            {currentAlert.severity === 'critical' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-[#D95C62] dark:text-[#FF6577] shrink-0" />
            ) : currentAlert.severity === 'action' ? (
              <Lock className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            ) : (
              <Activity className="h-3.5 w-3.5 text-[#3157D5] dark:text-[#22D3EE] shrink-0" />
            )}
            <span className="truncate">{currentAlert.title}</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] dark:text-slate-300 line-clamp-1">{currentAlert.desc}</p>
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] dark:border-white/10 flex items-center justify-between text-[9px] font-mono text-[#3157D5] dark:text-[#22D3EE]">
            <span>{currentAlert.action}</span>
            <Zap className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* ─── LIVE TRANSACTION HUD (Bottom-Right Panel) ─── */}
      <div className="absolute bottom-[4%] right-[0%] sm:right-[2%] z-20 w-[92%] sm:w-[260px] animate-hud-stream">
        <div className="rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/95 dark:bg-[#0B1730]/95 p-3 shadow-elevated dark:shadow-2xl dark:shadow-black/60 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-[var(--text-primary)] dark:text-white tracking-wide">LIVE TRANSACTIONS</span>
            </div>
            <span className="text-[9px] font-mono text-[var(--text-muted)] dark:text-slate-400">Stream • Synthetic</span>
          </div>

          <div className="space-y-1.5">
            {liveTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded hover:bg-[var(--surface-muted)] dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[var(--text-primary)] dark:text-white">{tx.amount}</span>
                  <span className="text-[var(--text-muted)] dark:text-slate-400 text-[10px]">{tx.city}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      tx.status === 'CRITICAL'
                        ? 'bg-[#D95C62]/10 dark:bg-[#FF6577]/20 text-[#D95C62] dark:text-[#FF6577] border border-[#D95C62]/30 dark:border-[#FF6577]/40'
                        : tx.status === 'MEDIUM'
                        ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/40'
                        : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/40'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
