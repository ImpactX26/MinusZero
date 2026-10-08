import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Database,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Smartphone,
  AlertCircle,
  ChevronRight,
  Lock,
  RefreshCw,
  Activity,
  Network,
  FolderKanban,
  FileText,
  Play
} from 'lucide-react';
import { ScenarioId, SimulationResult, Case, Transaction } from '../types';
import { simulateScenario } from '../lib/simulator';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { transactionsCol, casesCol } from '../firebase/collections';

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

// ─── STAT CARD ──────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  status?: 'ok' | 'warn' | 'alert';
  trend?: string;
}> = ({ icon: Icon, label, value, sub, status = 'ok', trend }) => {
  const statusColors = {
    ok: 'text-emerald-500 bg-emerald-500/10',
    warn: 'text-amber-500 bg-amber-500/10',
    alert: 'text-rose-500 bg-rose-500/10',
  }[status];

  return (
    <div className="glass-card p-4 flex flex-col justify-between min-h-[100px] border border-[var(--border-subtle)] relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 opacity-10 transition-opacity group-hover:opacity-20 ${statusColors.split(' ')[0].replace('text', 'bg')}`} />
      
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${statusColors}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>
      
      <div className="mt-3">
        <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
          {value}
        </div>
        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mt-0.5">
          {label}
        </div>
        {sub && (
          <div className="text-[10px] text-[var(--text-secondary)] mt-1 truncate max-w-full">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

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
    <div
      className={`glass-card flex flex-col border transition-all duration-200 overflow-hidden ${
        active ? 'ring-2 ring-[var(--accent)] border-transparent' : 'border-[var(--border-subtle)]'
      }`}
    >
      <div className={`px-4 py-2 border-b text-[10px] font-bold tracking-wider flex justify-between items-center ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
        <span className="uppercase">{scenarioLabel}</span>
        <span>{cfg.label}</span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">{customerName}</div>
            <div className="terminal-text text-[10px] text-[var(--text-secondary)]">{customerId}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-[var(--text-primary)]">{amount}</div>
            <div className="terminal-text text-[10px] text-[var(--text-secondary)]">{time}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{city}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Smartphone className="h-3 w-3 shrink-0" />
              <span className="truncate">{device}</span>
            </div>
          </div>
          <div className="flex items-end justify-end">
            <div className="text-[10px] text-right font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] px-2 py-1 rounded border border-[var(--border-subtle)]">
              Expected: {outcome}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/50">
        <button
          onClick={() => onRun(id)}
          disabled={disabled}
          className={`w-full py-2 flex items-center justify-center gap-2 text-xs font-bold rounded-md transition-all ${
            active
              ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20 cursor-wait'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-subtle)] hover:border-[var(--text-muted)]'
          }`}
        >
          {active ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run Scenario
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── SIMULATION RESULT PANEL ──────────────────────────────────────────────────
const SimulationResultPanel: React.FC<{ result: SimulationResult; simRef: any }> = ({
  result,
  simRef,
}) => (
  <div ref={simRef} className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {result.status === 'ERROR' ? (
      <div className="glass-card border-rose-300 dark:border-rose-800/40 p-6 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Simulation Failed</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md">{result.next_stage}</p>
        </div>
      </div>
    ) : (
      <div className="glass-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface-subtle)]/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Simulation Complete: {result.scenario_name}
            </h3>
          </div>
          <span className="terminal-text text-[10px] text-[var(--text-muted)]">{result.timestamp}</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1 tracking-wider">Transaction</div>
              <div className="text-lg font-black text-[var(--text-primary)]">{result.formatted_amount}</div>
              <div className="text-xs text-[var(--text-secondary)]">{result.transaction.transaction_id}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1 tracking-wider">Customer</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">{result.customer.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{result.customer.customer_id}</div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1 tracking-wider">Context Signals</div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] mb-1">
                <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {result.location}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] mb-1">
                <Smartphone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {result.device_label}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {result.login_signals_summary}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6">
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-2 tracking-wider">Pipeline Execution</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px]">
                  ✓ Orchestrator
                </span>
                <span className="badge bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px]">
                  ✓ Feature Engine
                </span>
                <span className="badge bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px]">
                  ✓ Agent Framework
                </span>
              </div>
            </div>

            {result.risk_assessment && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-auto">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Counterfactual Agent Active
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {result.risk_assessment.counterfactual}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button to Workspace */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 flex justify-end">
          <a
            href="#investigation-workspace"
            className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-md shadow-[var(--accent)]/20"
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
  const [activeSimulation, setActiveSimulation] = useState<ScenarioId | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const simResultRef = React.useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({
    totalTx: 0,
    blockedTx: 0,
    criticalCases: 0,
    investigations: 0,
  });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [networkNodes, setNetworkNodes] = useState<{id: string, risk: string, amount: number}[]>([]);


  useEffect(() => {
    const unsubTx = onSnapshot(collection(transactionsCol().firestore, 'transactions'), (snap) => {
      let blocked = 0;
      const nodes: any[] = [];
      snap.forEach(doc => {
        const data = doc.data() as Transaction;
        if (data.status === 'BLOCK_AND_REVIEW' || data.status === 'BLOCKED') blocked++;
        
        let risk = 'LOW';
        if (data.status === 'BLOCK_AND_REVIEW' || data.status === 'BLOCKED') risk = 'CRITICAL';
        else if (data.status === 'STEP_UP_VERIFICATION') risk = 'HIGH';
        else if (data.amount > 50000) risk = 'MEDIUM';
        
        nodes.push({ id: doc.id, risk, amount: data.amount });
      });
      setStats(s => ({ ...s, totalTx: snap.size, blockedTx: blocked }));
      setNetworkNodes(nodes.slice(0, 48)); // Show up to 48 nodes in visualization
    });

    const unsubCases = onSnapshot(query(casesCol(), orderBy('createdAt', 'desc'), limit(5)), (snap) => {
      let critical = 0;
      const rCases: Case[] = [];
      snap.forEach(doc => {
        const data = doc.data() as Case;
        rCases.push(data);
        if (data.riskLevel === 'CRITICAL') critical++;
      });
      setStats(s => ({ ...s, investigations: snap.size, criticalCases: critical }));
      setRecentCases(rCases);
    });

    return () => {
      unsubTx();
      unsubCases();
    };
  }, []);

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
      <div className="glass-card p-6 border-[var(--border-subtle)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--accent)]/30 font-mono">
                Active Intelligence
              </span>
              <span className="badge text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] font-mono text-[10px]">
                <Database className="h-3 w-3 inline mr-1" />
                Synthetic Data • Demo Environment
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Fraud Intelligence Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              Real-time multi-agent orchestration, anomaly detection, and synthetic transaction monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* ─── SYSTEM STATUS STAT GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Total Transactions"
          value={stats.totalTx.toLocaleString()}
          trend="+12% /hr"
          status="ok"
        />
        <StatCard
          icon={ShieldCheck}
          label="Investigations"
          value={stats.investigations}
          status="ok"
        />
        <StatCard
          icon={AlertCircle}
          label="Critical Cases"
          value={stats.criticalCases}
          sub="Requires immediate review"
          status={stats.criticalCases > 0 ? 'alert' : 'ok'}
        />
        <StatCard
          icon={Lock}
          label="Blocked High-Risk"
          value={stats.blockedTx}
          sub="Automatically mitigated"
          status="warn"
        />
      </div>

      {/* ─── DASHBOARD PANELS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fraud Intelligence Network Visualization */}
        <div className="lg:col-span-2 glass-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Network className="h-4 w-4 text-[var(--accent)]" /> Fraud Intelligence Network
            </h2>
            <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Normal</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> Step-Up</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span> Critical</span>
            </div>
          </div>
          
          <div className="flex-1 bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-lg p-6 flex flex-wrap content-start gap-3 relative overflow-hidden min-h-[250px] shadow-inner">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(var(--border-default) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            {networkNodes.map((node, i) => {
              const colorClass = 
                node.risk === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] border-rose-400 z-10' :
                node.risk === 'HIGH' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.7)] border-orange-400 z-10' :
                node.risk === 'MEDIUM' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] border-amber-300' :
                'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] border-emerald-400 opacity-70';
              
              const size = node.amount > 50000 ? 'h-5 w-5' : node.amount > 10000 ? 'h-4 w-4' : 'h-3 w-3';
              
              return (
                <div 
                  key={node.id}
                  title={`Risk: ${node.risk} | Amount: ₹${node.amount}`}
                  className={`rounded-full border ${size} ${colorClass} transition-all duration-500 hover:scale-150 cursor-crosshair animate-in fade-in zoom-in`}
                  style={{ animationDelay: `${i * 20}ms` }}
                />
              );
            })}
            {networkNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                Waiting for telemetry...
              </div>
            )}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="glass-card p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[var(--accent)]" /> Active Cases
            </h2>
            <a href="#cases" className="text-xs text-[var(--accent)] hover:underline font-medium">View All</a>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {recentCases.map(c => (
              <a href="#cases" key={c.id} className="block p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-root)] hover:border-[var(--accent)] transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {c.caseNumber}
                  </div>
                  <span className={`badge text-[9px] ${
                    c.riskLevel === 'CRITICAL' ? 'bg-rose-500 text-white border-transparent' : 'bg-orange-500 text-white border-transparent'
                  }`}>
                    {c.riskLevel}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-1 truncate">
                  <FileText className="h-3 w-3" /> {c.recommendation.replace(/_/g, ' ')}
                </div>
              </a>
            ))}
            {recentCases.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                Queue is empty.
              </div>
            )}
          </div>
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
              <h2 className="text-base font-bold text-[var(--text-primary)]">Hackathon Demo Scenarios</h2>
              <p className="terminal-text text-[var(--text-muted)] text-[11px]">
                Writes pending transactions into Firestore for multi-agent evaluation
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <ScenarioCard
            id="legitimate"
            scenarioLabel="Scenario A · Legitimate"
            customerName="Arjun Mehta"
            customerId="CUST-1001"
            amount="₹12,500.00"
            city="Mumbai"
            device="Known iPhone"
            time="09:15 AM"
            outcome="ALLOW"
            riskLevel="LOW"
            active={activeSimulation === 'legitimate'}
            disabled={activeSimulation !== null && activeSimulation !== 'legitimate'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="suspicious"
            scenarioLabel="Scenario B · Suspicious"
            customerName="Priya Sharma"
            customerId="CUST-1002"
            amount="₹48,000.00"
            city="Delhi"
            device="New Device"
            time="02:30 AM"
            outcome="STEP-UP (MFA)"
            riskLevel="MEDIUM"
            active={activeSimulation === 'suspicious'}
            disabled={activeSimulation !== null && activeSimulation !== 'suspicious'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="high_risk_c1003"
            scenarioLabel="Scenario C · High Risk"
            customerName="Rahul Verma"
            customerId="CUST-1003"
            amount="₹1,50,000.00"
            city="Dubai (VPN)"
            device="New Emulator"
            time="11:45 PM"
            outcome="BLOCK & REVIEW"
            riskLevel="CRITICAL"
            active={activeSimulation === 'high_risk_c1003'}
            disabled={activeSimulation !== null && activeSimulation !== 'high_risk_c1003'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_d_traveller"
            scenarioLabel="Scenario D · Traveller"
            customerName="Anita Desai"
            customerId="CUST-1004"
            amount="₹35,000.00"
            city="Singapore"
            device="Known iPad"
            time="08:20 AM"
            outcome="ALLOW (Travel Pattern)"
            riskLevel="LOW"
            active={activeSimulation === 'scenario_d_traveller'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_d_traveller'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_e_fraud_ring"
            scenarioLabel="Scenario E · Fraud Ring"
            customerName="Vikram Singh"
            customerId="CUST-1005"
            amount="₹85,000.00"
            city="Kolkata"
            device="Shared Device (Known Fraud)"
            time="04:10 PM"
            outcome="BLOCK & REVIEW"
            riskLevel="CRITICAL"
            active={activeSimulation === 'scenario_e_fraud_ring'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_e_fraud_ring'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_f_prompt_injection"
            scenarioLabel="Scenario F · Deepfake / Injection"
            customerName="Neha Gupta"
            customerId="CUST-1006"
            amount="₹2,00,000.00"
            city="Bangalore"
            device="New Android"
            time="03:00 AM"
            outcome="BLOCK (Behavior Anomaly)"
            riskLevel="CRITICAL"
            active={activeSimulation === 'scenario_f_prompt_injection'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_f_prompt_injection'}
            onRun={handleRunScenario}
          />
        </div>
        
        {simulationError && (
          <div className="rounded-lg border border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-700 dark:text-rose-400 mt-4">
            <strong>Simulation Error:</strong> {simulationError}
          </div>
        )}
      </div>

      {simulationResult && (
        <SimulationResultPanel result={simulationResult} simRef={simResultRef} />
      )}
    </div>
  );
};
