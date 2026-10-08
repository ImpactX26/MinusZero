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
  Zap,
  ChevronRight,
  Target,
  BarChart3,
  Lock,
  Unlock,
  RefreshCw,
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
    color: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-300 dark:border-emerald-800/40',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  MEDIUM: {
    label: 'MEDIUM RISK',
    color: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-800/40',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  HIGH: {
    label: 'HIGH RISK',
    color: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-800/40',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: 'text-rose-700 dark:text-rose-400',
    borderColor: 'border-rose-300 dark:border-rose-800/40',
    bgColor: 'bg-rose-50 dark:bg-rose-950/20',
  },
};

// ─── SMALL STAT CARD ──────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  status?: 'ok' | 'warn' | 'alert';
}> = ({ icon: Icon, label, value, sub, status = 'ok' }) => {
  const statusDot = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    alert: 'bg-rose-500',
  }[status];

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="terminal-text text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </div>
      <div>
        <div className="text-base font-bold text-[var(--text-primary)] stat-value">
          {value}
        </div>
        {sub && (
          <div className="terminal-text text-[var(--text-secondary)] text-[11px] truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── VALIDATION RESULT ROW ────────────────────────────────────────────────────
const ValidationRow: React.FC<{ r: ValidationCheckResult }> = ({ r }) => (
  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-[var(--text-primary)]">{r.name}</span>
      <span
        className={`badge text-[9px] ${
          r.passed
            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/40'
            : 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/40'
        }`}
      >
        {r.passed ? '✓ VERIFIED' : '✗ FAILED'}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {r.checks.slice(0, 4).map((c, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="terminal-text text-[var(--text-secondary)] truncate text-[10px]">{c.name}</span>
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

  return (
    <button
      onClick={() => onRun(id)}
      disabled={disabled}
      className="glass-card w-full text-left p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-150 disabled:opacity-50 cursor-pointer hover:border-[var(--border-default)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className={`badge ${cfg.color} ${cfg.bgColor} ${cfg.borderColor}`}>
            {scenarioLabel}
          </span>
          <span className="terminal-text text-[var(--text-muted)] text-[11px]">{customerId}</span>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${cfg.borderColor} ${cfg.bgColor}`}>
          {active ? (
            <RefreshCw className={`h-4 w-4 ${cfg.color} animate-spin`} />
          ) : riskLevel === 'LOW' ? (
            <Unlock className={`h-4 w-4 ${cfg.color}`} />
          ) : riskLevel === 'MEDIUM' ? (
            <Clock className={`h-4 w-4 ${cfg.color}`} />
          ) : (
            <Lock className={`h-4 w-4 ${cfg.color}`} />
          )}
        </div>
      </div>

      <div>
        <div className="text-base font-bold text-[var(--text-primary)] stat-value">{amount}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5">{customerName}</div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <MapPin className={`h-3 w-3 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[var(--text-secondary)] truncate">{city}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className={`h-3 w-3 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[var(--text-secondary)] truncate">{device}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className={`h-3 w-3 ${cfg.color} shrink-0`} />
          <span className="terminal-text text-[var(--text-secondary)] truncate">{time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[9px] uppercase tracking-wider">
          Target Outcome
        </span>
        <span className={`terminal-text font-bold text-xs ${cfg.color}`}>{outcome}</span>
      </div>

      <div className={`flex items-center justify-between rounded-md px-3 py-1.5 ${cfg.bgColor} border ${cfg.borderColor}`}>
        <span className={`terminal-text font-semibold text-xs ${cfg.color}`}>
          {active ? 'Running Simulation…' : 'Run Scenario'}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
    </button>
  );
};

// ─── SIMULATION RESULT PANEL ──────────────────────────────────────────────────
const SimulationResultPanel: React.FC<{ result: SimulationResult }> = ({ result }) => (
  <div className="glass-card p-5 border-emerald-500/40 bg-emerald-500/5 mt-4">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            SIMULATION COMPLETE
          </div>
          <div className="text-base font-bold text-[var(--text-primary)]">
            {result.scenario_name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="badge text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 font-mono text-[11px]">
          {result.status}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-1 text-xs">
      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Transaction
        </span>
        <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
          {result.transaction.transaction_id}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Customer
        </span>
        <span className="font-bold text-[var(--text-primary)] text-sm block">
          {result.customer.customer_id}
        </span>
        <span className="terminal-text text-[var(--text-secondary)] text-[11px]">
          {result.customer.name}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Amount
        </span>
        <span className="font-bold text-[var(--text-primary)] text-sm">
          {result.formatted_amount}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Location
        </span>
        <span className="font-semibold text-[var(--text-primary)] text-xs">
          {result.location}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Device
        </span>
        <span className="font-semibold text-[var(--text-primary)] text-xs">
          {result.device_label}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Login Signals
        </span>
        <span className="font-semibold text-[var(--text-primary)] text-xs">
          {result.login_signals_summary}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Status
        </span>
        <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
          {result.status}
        </span>
      </div>

      <div className="rounded-md p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
        <span className="terminal-text text-[var(--text-muted)] text-[10px] uppercase block mb-1">
          Next Stage
        </span>
        <span className="font-bold text-[var(--accent)] text-xs">
          {result.next_stage}
        </span>
      </div>
    </div>

    {/* Phase 3 Deterministic Risk Engine Assessment */}
    {result.risk_assessment && (
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="terminal-text text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Deterministic Risk Assessment
            </span>
            <span className="terminal-text text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
              Pure Rule Engine (No AI / LLM)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="terminal-text text-xs text-[var(--text-muted)]">Calculated:</span>
            <span className="terminal-text text-xs font-mono text-[var(--text-secondary)]">
              {new Date(result.risk_assessment.calculatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Score */}
          <div className="rounded-lg p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
              <span className="terminal-text uppercase text-[10px]">Deterministic Score</span>
              <span className="terminal-text text-[10px]">Max 100</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-[var(--text-primary)] stat-value">
                {result.risk_assessment.riskScore}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">/ 100</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-[var(--bg-surface-subtle)] h-2 rounded-full overflow-hidden mt-2 border border-[var(--border-subtle)]">
              <div
                className={`h-full transition-all duration-300 ${
                  result.risk_assessment.riskScore <= 30
                    ? 'bg-emerald-500'
                    : result.risk_assessment.riskScore <= 70
                    ? 'bg-amber-500'
                    : result.risk_assessment.riskScore <= 90
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, result.risk_assessment.riskScore))}%` }}
              />
            </div>
          </div>

          {/* Risk Band */}
          <div className="rounded-lg p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] flex flex-col justify-between">
            <div className="text-xs text-[var(--text-muted)] mb-1">
              <span className="terminal-text uppercase text-[10px]">Risk Band</span>
            </div>
            <div>
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                  riskConfig[result.risk_assessment.riskLevel as keyof typeof riskConfig]?.color || 'text-slate-600'
                } ${
                  riskConfig[result.risk_assessment.riskLevel as keyof typeof riskConfig]?.bgColor || 'bg-slate-100'
                } ${
                  riskConfig[result.risk_assessment.riskLevel as keyof typeof riskConfig]?.borderColor || 'border-slate-300'
                }`}
              >
                {result.risk_assessment.riskLevel}
              </span>
              <span className="block text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                {result.risk_assessment.riskLevel === 'LOW' && '0–30 (Normal baseline)'}
                {result.risk_assessment.riskLevel === 'MEDIUM' && '31–70 (Step-up required)'}
                {result.risk_assessment.riskLevel === 'HIGH' && '71–90 (Block & review)'}
                {result.risk_assessment.riskLevel === 'CRITICAL' && '91–100 (Block & case)'}
              </span>
            </div>
          </div>

          {/* Decision */}
          <div className="rounded-lg p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] flex flex-col justify-between">
            <div className="text-xs text-[var(--text-muted)] mb-1">
              <span className="terminal-text uppercase text-[10px]">Engine Decision</span>
            </div>
            <div>
              <span className="text-sm font-bold font-mono text-[var(--text-primary)] block">
                {result.risk_assessment.decision.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                {result.risk_assessment.decision === 'ALLOW' && 'Transaction cleared without disruption'}
                {result.risk_assessment.decision === 'STEP_UP_VERIFICATION' && 'MFA / Step-up challenge required'}
                {result.risk_assessment.decision === 'BLOCK_AND_REVIEW' && 'Payment halted; pending analyst review'}
                {result.risk_assessment.decision === 'BLOCK_AND_CREATE_CASE' && 'Transaction blocked; fraud case dispatched'}
              </span>
            </div>
          </div>
        </div>

        {/* Signals and Breakdown */}
        <div className="rounded-lg p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-2">
            <span className="terminal-text text-[11px] font-bold text-[var(--text-primary)] uppercase">
              Triggered Risk Signals ({result.risk_assessment.triggeredSignals.length})
            </span>
            <span className="terminal-text text-[10px] text-[var(--text-muted)]">
              V3 Mathematical Weights
            </span>
          </div>

          {result.risk_assessment.triggeredSignals.length === 0 ? (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-mono">
              ✓ No elevated risk signals detected. Clean transaction baseline (Score: 0 / 100).
            </div>
          ) : (
            <div className="space-y-2">
              {result.risk_assessment.scoreBreakdown
                .filter((item: any) => item.triggered)
                .map((item: any) => (
                  <div
                    key={item.signal}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="badge font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px]">
                        +{item.weight}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {item.signalName}
                      </span>
                      {item.reasonCode && (
                        <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                          {item.reasonCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[var(--text-secondary)] text-[11px] font-mono sm:text-right">
                      {item.reason}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Isolation Principle & Counterfactual Notice */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span><strong>Isolation Principle:</strong> City / IP change alone ≠ fraud (Weight ≤ 20 &lt; 31 LOW threshold)</span>
            </div>
            {result.risk_assessment.counterfactual && (
              <div className="font-mono text-[var(--accent)] font-medium">
                {result.risk_assessment.counterfactual}
              </div>
            )}
          </div>
        </div>

        {/* Action Button to Workspace */}
        <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex justify-end">
          <a
            href="#investigation-workspace"
            className="btn-primary px-6 py-2 flex items-center gap-2"
          >
            <span>Open Investigation Workspace</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    )}
  </div>
);

// ─── COMMAND CENTER COMPONENT ────────────────────────────────────────────────
export const CommandCenter: React.FC = () => {
  const { user } = useAuth();

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [activeSimulation, setActiveSimulation] = useState<ScenarioId | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const simResultRef = React.useRef<HTMLDivElement>(null);

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
      setTimeout(() => {
        simResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSimulationError(msg);
      setTimeout(() => {
        simResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } finally {
      setActiveSimulation(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--accent)]/30">
                Phase 2 Data Foundation
              </span>
              <span className="terminal-text text-[var(--text-muted)]">28 Profiles · 6 Canonical Scenarios</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Fraud Intelligence Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              Deterministic risk assessment foundation · 6 Canonical Scenarios · 60+ synthetic transactions across 16 V3 collections
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="terminal-text text-[var(--text-secondary)] text-[11px]">
                Isolation Principle: City / IP change alone ≠ fraud
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SYSTEM STATUS STAT GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Synthetic Dataset"
          value="28 Customers"
          sub="60+ Transactions"
          status="ok"
        />
        <StatCard
          icon={ShieldCheck}
          label="Investigator"
          value={user?.email ? user.email.split('@')[0] : 'Demo Investigator'}
          sub={user?.isAnonymous ? 'Guest session' : 'Authenticated'}
          status="ok"
        />
        <StatCard
          icon={Database}
          label="Firestore Schema"
          value="16 Collections"
          sub="Append-only audit ledger active"
          status="ok"
        />
        <StatCard
          icon={Target}
          label="Scenario Contracts"
          value={validationReport?.allPassed ? 'Verified (6/6)' : 'Pending'}
          sub="Scenarios A through F"
          status={validationReport?.allPassed ? 'ok' : 'alert'}
        />
      </div>

      {/* ─── SEEDER & VALIDATION ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seeder Card */}
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Rich Synthetic Data Seeder</h2>
                <div className="terminal-text text-[var(--text-muted)] text-[10px]">Deterministic batch seeding</div>
              </div>
            </div>
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              {seeding ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading → Seeding V3 dataset...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Seed All V3 Collections</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Idempotently populates 28 synthetic customers, linked accounts, devices, login telemetry, merchants, network signals, and 66 transactions into Firestore.
          </p>

          {seedResult && (
            <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>V3 synthetic dataset seeded successfully.</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs terminal-text text-[var(--text-secondary)]">
                <div>✓ <strong>{seedResult.customersCount}</strong> customers</div>
                <div>✓ <strong>{seedResult.accountsCount}</strong> accounts</div>
                <div>✓ <strong>{seedResult.devicesCount}</strong> devices</div>
                <div>✓ <strong>{seedResult.loginEventsCount}</strong> login events</div>
                <div>✓ <strong>{seedResult.merchantsCount}</strong> merchants</div>
                <div>✓ <strong>{seedResult.networkSignalsCount}</strong> network signals</div>
                <div>✓ <strong>{seedResult.transactionsCount}</strong> transactions</div>
              </div>
            </div>
          )}

          {seedError && (
            <div className="rounded-lg border border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <strong>Seed Error:</strong> {seedError}
              </div>
            </div>
          )}
        </div>

        {/* Validation Checks */}
        <div className="glass-card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Scenario Contract Validation</h2>
              <div className="terminal-text text-[var(--text-muted)] text-[10px]">Deterministic acceptance tests for 6 scenarios</div>
            </div>
          </div>

          {validationReport ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {validationReport.results.map((r) => (
                <ValidationRow key={r.scenarioId} r={r} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)] py-4 text-center">
              Running verification checks…
            </div>
          )}
        </div>
      </div>

      {/* ─── TRANSACTION SIMULATOR (6 CANONICAL SCENARIOS) ───────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Play className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">6 Canonical Scenario Simulators</h2>
              <p className="terminal-text text-[var(--text-muted)] text-[11px]">
                Writes pending transactions into Firestore for multi-agent evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>6 Scenarios (A through F)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <ScenarioCard
            id="legitimate"
            scenarioLabel="Scenario A · Legitimate"
            customerName="Priya Sharma"
            customerId="C1001"
            amount="₹1,500"
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
            scenarioLabel="Scenario B · Suspicious"
            customerName="Rohan Mehta"
            customerId="C1002"
            amount="₹25,000"
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
            scenarioLabel="Scenario C · High Risk ATO"
            customerName="Vikram Malhotra"
            customerId="C1003"
            amount="₹85,000"
            city="Bengaluru → Mumbai Jump"
            device="New Rogue VM + 3 Failed Logins"
            time="02:13 IST"
            outcome="CRITICAL → BLOCK & CASE"
            riskLevel="CRITICAL"
            active={activeSimulation === 'high_risk_c1003'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_d_traveller"
            scenarioLabel="Scenario D · Frequent Traveller"
            customerName="Rajiv Sen"
            customerId="C1004"
            amount="₹18,500"
            city="Mumbai Airport (from BLR)"
            device="Known iPhone (DEV-1004-TRAVEL-A)"
            time="14:00 IST"
            outcome="LOW → ALLOW"
            riskLevel="LOW"
            active={activeSimulation === 'scenario_d_traveller'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_e_fraud_ring"
            scenarioLabel="Scenario E · Fraud Ring Cluster"
            customerName="Rahul Varma"
            customerId="C1015"
            amount="₹49,500"
            city="Pune (Shared Proxy IP)"
            device="Shared Hardware Rig (DEV-RING-DEVICE-01)"
            time="03:10 IST"
            outcome="CRITICAL → BLOCK & CASE"
            riskLevel="CRITICAL"
            active={activeSimulation === 'scenario_e_fraud_ring'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_f_prompt_injection"
            scenarioLabel="Scenario F · Prompt Injection Test"
            customerName="Amit Joshi"
            customerId="C1020"
            amount="₹7,500"
            city="Bengaluru"
            device="Known Device (DEV-1020-A)"
            time="12:00 IST"
            outcome="LOW → ALLOW (Untrusted Text)"
            riskLevel="LOW"
            active={activeSimulation === 'scenario_f_prompt_injection'}
            disabled={activeSimulation !== null}
            onRun={handleRunScenario}
          />
        </div>

        <div ref={simResultRef}>
          {simulationResult && <SimulationResultPanel result={simulationResult} />}

          {simulationError && (
            <div className="rounded-lg border border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 mt-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Simulation failed</strong>
                <span>{simulationError}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
