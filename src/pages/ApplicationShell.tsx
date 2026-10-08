import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Database,
  ShieldCheck,
  Layers,
  Server,
  Play,
  Download,
  AlertTriangle,
  Clock,
  MapPin,
  Smartphone,
  AlertCircle,
  Activity,
  Zap,
  TrendingUp,
  Eye,
  ChevronRight,
  Target,
  Cpu,
  BarChart3,
  Lock,
  Unlock,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ScenarioId, SimulationResult } from '../types';
import { seedSyntheticData, SeedResult } from '../data/seeder';
import { simulateScenario } from '../lib/simulator';
import { validateAllScenarios, ValidationCheckResult } from '../lib/validateScenarios';

// ─── RISK LEVEL CONFIG ────────────────────────────────────────────────────────
const riskConfig = {
  LOW: {
    label: 'LOW RISK',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-800/40',
    bgColor: 'bg-emerald-950/20',
    dotClass: 'bg-emerald-400 dot-emerald',
    glowClass: 'glow-emerald',
    textGlow: 'text-glow-emerald',
  },
  MEDIUM: {
    label: 'MEDIUM RISK',
    color: 'text-amber-400',
    borderColor: 'border-amber-800/40',
    bgColor: 'bg-amber-950/20',
    dotClass: 'bg-amber-400 dot-amber',
    glowClass: 'glow-amber',
    textGlow: 'text-glow-amber',
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: 'text-rose-400',
    borderColor: 'border-rose-800/40',
    bgColor: 'bg-rose-950/20',
    dotClass: 'bg-rose-400 dot-rose',
    glowClass: 'glow-rose',
    textGlow: 'text-glow-rose',
  },
};

// ─── SMALL STAT CARD ──────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  status?: 'ok' | 'warn' | 'alert';
  delay?: number;
}> = ({ icon: Icon, label, value, sub, status = 'ok', delay = 0 }) => {
  const statusDot = {
    ok: 'bg-emerald-400 dot-emerald',
    warn: 'bg-amber-400 dot-amber',
    alert: 'bg-rose-400 dot-rose',
  }[status];

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="terminal-text text-[#506080] uppercase tracking-widest" style={{ fontSize: 9 }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          <Icon className="h-4 w-4 text-[#38BDF8]" />
        </div>
      </div>
      <div>
        <div className="text-base font-bold text-white stat-value" style={{ letterSpacing: '-0.01em' }}>
          {value}
        </div>
        {sub && (
          <div className="terminal-text text-[#506080] mt-0.5 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
};

// ─── VALIDATION RESULT ROW ────────────────────────────────────────────────────
const ValidationRow: React.FC<{ r: ValidationCheckResult }> = ({ r }) => (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-white">{r.name}</span>
      <span
        className={`badge ${
          r.passed
            ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
            : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
        }`}
      >
        {r.passed ? '✓ VERIFIED' : '✗ FAILED'}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {r.checks.slice(0, 4).map((c, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="terminal-text text-[#94A3B8] truncate">{c.name}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── SCENARIO CARD ────────────────────────────────────────────────────────────
interface ScenarioCardProps {
  id: ScenarioId;
  scenarioLabel: string;
  customerName: string;
  customerId: string;
  amount: string;
  city: string;
  device: string;
  time: string;
  outcome: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'CRITICAL';
  active: boolean;
  disabled: boolean;
  onRun: (id: ScenarioId) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  id,
  scenarioLabel,
  customerName,
  customerId,
  amount,
  city,
  device,
  time,
  outcome,
  riskLevel,
  active,
  disabled,
  onRun,
}) => {
  const cfg = riskConfig[riskLevel];
  const cardClass =
    riskLevel === 'LOW'
      ? 'scenario-card-legitimate'
      : riskLevel === 'MEDIUM'
      ? 'scenario-card-suspicious'
      : 'scenario-card-highrisk';

  return (
    <button
      onClick={() => onRun(id)}
      disabled={disabled}
      className={`glass-card ${cardClass} w-full text-left p-5 flex flex-col gap-4 transition-all duration-200 disabled:opacity-50 cursor-pointer`}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className={`badge ${cfg.color} ${cfg.bgColor} ${cfg.borderColor}`}>
            {scenarioLabel}
          </span>
          <span className="terminal-text text-[#506080]">{customerId}</span>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cfg.borderColor} ${cfg.bgColor}`}>
          {active ? (
            <RefreshCw className={`h-4 w-4 ${cfg.color} animate-spin`} />
          ) : riskLevel === 'LOW' ? (
            <Unlock className={`h-4 w-4 ${cfg.color}`} />
          ) : riskLevel === 'MEDIUM' ? (
            <Eye className={`h-4 w-4 ${cfg.color}`} />
          ) : (
            <Lock className={`h-4 w-4 ${cfg.color}`} />
          )}
        </div>
      </div>

      {/* Customer + amount */}
      <div>
        <div className="text-lg font-bold text-white stat-value">{amount}</div>
        <div className="text-sm text-[#94A3B8] mt-0.5">{customerName}</div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <MapPin className={`h-3.5 w-3.5 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[#94A3B8]">{city}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className={`h-3.5 w-3.5 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[#94A3B8]">{device}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={`h-3.5 w-3.5 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[#94A3B8]">{time}</span>
        </div>
      </div>

      {/* Outcome */}
      <div className={`flex items-center justify-between pt-3 border-t ${cfg.borderColor}`}>
        <span className="terminal-text text-[#506080] uppercase tracking-widest" style={{ fontSize: 9 }}>
          Target Outcome
        </span>
        <span className={`terminal-text font-bold ${cfg.color} ${cfg.textGlow}`}>{outcome}</span>
      </div>

      {/* Run CTA */}
      <div className={`flex items-center justify-between rounded-md px-3 py-2 ${cfg.bgColor} border ${cfg.borderColor}`}>
        <span className={`terminal-text font-semibold ${cfg.color}`}>
          {active ? 'Running Simulation…' : 'Run Scenario'}
        </span>
        <ChevronRight className={`h-4 w-4 ${cfg.color}`} />
      </div>
    </button>
  );
};

// ─── SIMULATION RESULT PANEL ──────────────────────────────────────────────────
const SimulationResultPanel: React.FC<{ result: SimulationResult }> = ({ result }) => (
  <div className="glass-card p-6 animate-fade-in-up border-[#38BDF8]/20 glow-accent">
    <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#1A2844]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-800/40">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Simulation Persisted to Firestore</div>
          <div className="terminal-text text-[#506080]">Transaction queued for Phase 3 agent pipeline</div>
        </div>
      </div>
      <span className="badge text-amber-400 bg-amber-950/40 border-amber-800/40">
        {result.transaction.status}
      </span>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
      {[
        { label: 'Transaction ID', value: result.transaction.transaction_id },
        { label: 'Customer', value: `${result.customer.name} (${result.customer.customer_id})` },
        { label: 'Amount · City', value: `INR ${result.transaction.amount.toLocaleString()} · ${result.transaction.city}` },
        {
          label: 'Device Trust',
          value: `${result.device.device_id}`,
          sub: result.device.known ? 'Known Device' : 'New / Rogue',
          isDevice: true,
          known: result.device.known,
        },
      ].map((item, idx) => (
        <div key={idx}>
          <div className="terminal-text text-[#506080] uppercase tracking-widest mb-1.5" style={{ fontSize: 9 }}>
            {item.label}
          </div>
          <div className="terminal-text text-white font-medium truncate">{item.value}</div>
          {'sub' in item && item.sub && (
            <div className={`terminal-text mt-0.5 ${'known' in item && item.known ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.sub}
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="mt-5 pt-4 border-t border-[#1A2844]">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-[#38BDF8]" />
        <span className="terminal-text text-[#94A3B8]">
          Ready for <span className="text-[#38BDF8] font-semibold">Phase 3</span>: Deterministic scoring engine &amp; 6-agent investigation orchestrator will consume this pending transaction.
        </span>
      </div>
    </div>
  </div>
);

// ─── MAIN SHELL ───────────────────────────────────────────────────────────────
export const ApplicationShell: React.FC = () => {
  const { user } = useAuth();

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [activeSimulation, setActiveSimulation] = useState<ScenarioId | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const [validationReport, setValidationReport] = useState<{
    allPassed: boolean;
    results: ValidationCheckResult[];
  } | null>(null);

  useEffect(() => {
    try {
      const report = validateAllScenarios();
      setValidationReport(report);
    } catch (err: unknown) {
      console.error('[FinGuard Validation] Error:', err);
    }
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await seedSyntheticData();
      setSeedResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);
    } finally {
      setSeeding(false);
    }
  };

  const handleRunScenario = async (scenarioId: ScenarioId) => {
    setActiveSimulation(scenarioId);
    setSimulationError(null);
    setSimulationResult(null);
    try {
      const res = await simulateScenario(scenarioId);
      setSimulationResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSimulationError(msg);
    } finally {
      setActiveSimulation(null);
    }
  };

  return (
    <main className="relative mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 15% 20%, rgba(56,189,248,0.03) 0%, transparent 55%), radial-gradient(ellipse 50% 70% at 85% 80%, rgba(52,211,153,0.02) 0%, transparent 55%)',
        }}
      />

      {/* ─── COMMAND CENTER HEADER ──────────────────────────────────────────── */}
      <div className="relative animate-fade-in-up">
        <div className="glass-card p-6 overflow-hidden">
          {/* Background grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30 bg-grid-pattern rounded-xl"
            style={{ maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)' }}
          />
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              {/* Phase badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="badge text-[#38BDF8] bg-[#38BDF8]/08 border-[#38BDF8]/20" style={{ background: 'rgba(56,189,248,0.08)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] dot-accent" />
                  Phase 2 Complete
                </span>
                <span className="terminal-text text-[#506080]">finguard-ai-prototype</span>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                Investigation Command Center
              </h1>
              <p className="text-sm text-[#94A3B8] max-w-xl">
                Synthetic Banking Fraud-Investigation Prototype · Transaction Simulator &amp; Canonical Scenario Engine · Deterministic Risk Assessment
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              {/* Synthetic data badge */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/15 px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dot-amber" />
                <div>
                  <div className="terminal-text text-amber-300 font-semibold">Synthetic data · demo prototype</div>
                  <div className="terminal-text text-amber-400/60">3 Canonical Scenarios · Zero Randomness</div>
                </div>
              </div>
              {/* Isolation rule */}
              <div className="flex items-center gap-2 rounded-md border border-[#1A2844] bg-[#0D1420] px-3 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
                <span className="terminal-text text-[#506080]">
                  Isolation Rule: City / IP change alone ≠ fraud
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TOP STAT GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Firebase Project"
          value="finguard-ai-prototype"
          sub="Project No: 222304542392"
          status="ok"
          delay={0}
        />
        <StatCard
          icon={ShieldCheck}
          label="Investigator Session"
          value={user?.email ? user.email.split('@')[0] : 'Demo Investigator'}
          sub={user?.uid ? `UID: ${user.uid.slice(0, 14)}…` : 'Anonymous session'}
          status="ok"
          delay={100}
        />
        <StatCard
          icon={Database}
          label="Collection Schema"
          value="7 Collections"
          sub="customers · txns · devices · logins · …"
          status="ok"
          delay={200}
        />
        <StatCard
          icon={Target}
          label="Scenario Validation"
          value={validationReport?.allPassed ? 'All Passed' : validationReport ? 'Check Failed' : 'Running…'}
          sub="3 canonical deterministic scenarios"
          status={validationReport?.allPassed ? 'ok' : validationReport ? 'alert' : 'ok'}
          delay={300}
        />
      </div>

      {/* ─── SEEDER + VALIDATION SECTION ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Idempotent Seeder ── */}
        <div className="glass-card p-6 flex flex-col gap-5 animate-fade-in-up-delay-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0284C7]/10 border border-[#38BDF8]/20">
                <Download className="h-4 w-4 text-[#38BDF8]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Synthetic Data Seeder</h2>
                <div className="terminal-text text-[#506080]">Idempotent · deterministic IDs</div>
              </div>
            </div>
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="btn-primary py-2 px-4 text-xs"
              style={{ borderRadius: 8 }}
            >
              {seeding ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Seeding…</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Seed Firestore</span>
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Idempotently seeds customers{' '}
            <span className="terminal-text text-white">C1001, C1002, C1003</span>,
            known/new devices, login event telemetry, and canonical baseline transactions into Firestore.
            Safe to run multiple times — no duplicate documents.
          </p>

          {/* Seed preview badges */}
          <div className="flex flex-wrap gap-2">
            {['3 Customers', '5 Devices', '10 Login Events', '3 Transactions'].map((label) => (
              <span
                key={label}
                className="badge text-[#94A3B8]"
                style={{ background: 'rgba(26,40,68,0.6)', borderColor: '#1F3055' }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Seed result */}
          {seedResult && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                {seedResult.message}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Customers', seedResult.customersCount],
                  ['Devices', seedResult.devicesCount],
                  ['Login Events', seedResult.loginEventsCount],
                  ['Transactions', seedResult.transactionsCount],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="terminal-text text-[#506080]">{label}</span>
                    <span className="terminal-text text-emerald-400 font-semibold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seedError && (
            <div className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-4 text-sm text-rose-300 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{seedError}</span>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-[#1A2844] flex items-center justify-between terminal-text text-[#506080]">
            <span>Zero duplication · safe re-runs</span>
            <span className="text-emerald-400 font-semibold">Deterministic IDs</span>
          </div>
        </div>

        {/* ── Canonical Scenario Validation ── */}
        <div className="glass-card p-6 flex flex-col gap-5 animate-fade-in-up-delay-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0284C7]/10 border border-[#38BDF8]/20">
              <Layers className="h-4 w-4 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Canonical Scenario Validation</h2>
              <div className="terminal-text text-[#506080]">Deterministic acceptance targets</div>
            </div>
          </div>

          {validationReport ? (
            <div className="space-y-3 flex-1">
              {validationReport.results.map((r) => (
                <ValidationRow key={r.scenarioId} r={r} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-[#94A3B8]">
                <RefreshCw className="h-4 w-4 animate-spin text-[#38BDF8]" />
                <span className="text-sm">Running validation checks…</span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-[#1A2844] flex items-center justify-between terminal-text text-[#506080]">
            <span>3 acceptance targets</span>
            <span className={validationReport?.allPassed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {validationReport?.allPassed ? 'All Scenarios Ready' : 'Validation Failed'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION SIMULATOR ─────────────────────────────────────────────── */}
      <div className="glass-card p-6 animate-fade-in-up-delay-3">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0284C7]/20 to-[#38BDF8]/10 border border-[#38BDF8]/25">
              <Play className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transaction Simulator</h2>
              <p className="terminal-text text-[#506080]">
                Persists <span className="text-[#38BDF8]">PENDING</span> transaction to Firestore · Ready for Phase 3 orchestrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-[#1A2844] bg-[#0D1420] px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span className="terminal-text text-[#94A3B8]">
                <span className="text-white font-semibold">3</span> scenarios ·{' '}
                <span className="text-white font-semibold">0</span> randomness
              </span>
            </div>
          </div>
        </div>

        {/* Top accent line under header */}
        <div className="mb-6 h-px bg-gradient-to-r from-[#38BDF8]/20 via-[#38BDF8]/10 to-transparent" />

        {/* 3 Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <ScenarioCard
            id="legitimate"
            scenarioLabel="Scenario 1 · Legitimate"
            customerName="Priya Sharma"
            customerId="C1001"
            amount="INR 1,500"
            city="Bengaluru"
            device="Known Device (DEV-1001-A)"
            time="19:30 IST"
            outcome="LOW → ALLOW"
            riskLevel="LOW"
            active={activeSimulation === 'legitimate'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="suspicious"
            scenarioLabel="Scenario 2 · Suspicious"
            customerName="Rohan Mehta"
            customerId="C1002"
            amount="INR 25,000"
            city="Delhi"
            device="New Device (DEV-1002-NEW)"
            time="23:15 IST"
            outcome="MEDIUM → STEP_UP"
            riskLevel="MEDIUM"
            active={activeSimulation === 'suspicious'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="high_risk_c1003"
            scenarioLabel="Scenario 3 · High Risk"
            customerName="Vikram Malhotra"
            customerId="C1003"
            amount="INR 85,000"
            city="Bengaluru → Mumbai Jump"
            device="New Device + 3 Failed Logins"
            time="02:13 IST (Unusual Hour)"
            outcome="CRITICAL → BLOCK & CASE"
            riskLevel="CRITICAL"
            active={activeSimulation === 'high_risk_c1003'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
        </div>

        {/* Simulation result */}
        {simulationResult && <SimulationResultPanel result={simulationResult} />}

        {simulationError && (
          <div className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-5 text-sm text-rose-300 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <div className="font-semibold text-rose-400 mb-1">Simulator Error</div>
              <div>{simulationError}</div>
            </div>
          </div>
        )}
      </div>

      {/* ─── PHASE ROADMAP STRIP ──────────────────────────────────────────────── */}
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#38BDF8]" />
          <span className="text-sm font-bold text-white">Implementation Roadmap</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { phase: 'Phase 1', label: 'Project Foundation', done: true },
            { phase: 'Phase 2', label: 'Synthetic Data', done: true, current: false },
            { phase: 'Phase 3', label: 'Scoring Engine', done: false, next: true },
            { phase: 'Phase 4', label: 'Investigation UI', done: false },
            { phase: 'Phase 5', label: 'Gemini Layer', done: false },
            { phase: 'Phase 6', label: 'E2E Hardening', done: false },
          ].map(({ phase, label, done, next }) => (
            <div
              key={phase}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${
                done
                  ? 'border-emerald-800/40 bg-emerald-950/20'
                  : next
                  ? 'border-[#38BDF8]/30 bg-[#38BDF8]/05'
                  : 'border-[#1A2844] bg-[#0D1420]'
              }`}
              style={next ? { background: 'rgba(56,189,248,0.05)' } : {}}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : next ? (
                <Zap className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-[#2A4070] shrink-0" />
              )}
              <div>
                <div className="terminal-text" style={{ fontSize: 9 }}>
                  <span className={done ? 'text-emerald-400' : next ? 'text-[#38BDF8]' : 'text-[#506080]'}>
                    {phase}
                  </span>
                </div>
                <div className={`text-xs font-medium ${done ? 'text-white' : next ? 'text-[#38BDF8]' : 'text-[#506080]'}`}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── COLLECTION SCHEMA STRIP ─────────────────────────────────────────── */}
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-[#38BDF8]" />
          <span className="text-sm font-bold text-white">Firestore Collection Schema</span>
          <span className="badge ml-auto text-[#94A3B8]" style={{ background: 'rgba(26,40,68,0.6)', borderColor: '#1F3055' }}>
            7 Collections · Strictly Enforced
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'customers', icon: '👤' },
            { name: 'transactions', icon: '💳' },
            { name: 'devices', icon: '📱' },
            { name: 'login_events', icon: '🔐' },
            { name: 'investigations', icon: '🔍' },
            { name: 'agent_logs', icon: '🤖' },
            { name: 'feedback', icon: '📝' },
          ].map(({ name, icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-md border border-[#1F3055] bg-[#0D1420] px-3 py-2 hover:border-[#2A4070] transition-colors"
            >
              <span style={{ fontSize: 12 }}>{icon}</span>
              <span className="terminal-text text-[#94A3B8]">{name}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="terminal-text text-emerald-400">
            Strict Firestore rules enforced · Authenticated access guard active
          </span>
        </div>
      </div>

      {/* Phase 3 teaser */}
      <div
        className="rounded-xl border border-[#38BDF8]/20 p-5 text-center animate-fade-in-up"
        style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.04) 0%, rgba(56,189,248,0.02) 100%)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Cpu className="h-5 w-5 text-[#38BDF8]" />
          <span className="text-sm font-bold text-[#38BDF8]">Phase 3 Ready to Begin</span>
        </div>
        <p className="text-sm text-[#94A3B8] max-w-2xl mx-auto">
          Deterministic Scoring Engine &amp; 6-Agent Investigation Pipeline · Pure function risk calculators ·
          Velocity, amount anomaly &amp; device mismatch evaluators ·{' '}
          <span className="text-white font-medium">ALLOW / STEP_UP / BLOCK_AND_REVIEW / BLOCK_AND_CREATE_CASE</span> decision bands
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Activity className="h-3.5 w-3.5 text-[#38BDF8]" />
          <span className="terminal-text text-[#38BDF8]">
            src/agents/orchestrator.ts · awaiting implementation
          </span>
        </div>
      </div>
    </main>
  );
};
