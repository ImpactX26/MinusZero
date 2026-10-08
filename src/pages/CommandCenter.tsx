import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
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
    label: 'LOW',
    color: 'text-[#159A75]',
    borderColor: 'border-[#BBF7D0]',
    bgColor: 'bg-[#F0FDF4]',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: 'text-[#D99425]',
    borderColor: 'border-[#FEF08A]',
    bgColor: 'bg-[#FEFCE8]',
  },
  HIGH: {
    label: 'HIGH',
    color: 'text-[#D95C62]',
    borderColor: 'border-[#FED7AA]',
    bgColor: 'bg-[#FFF7ED]',
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: 'text-[#D95C62]',
    borderColor: 'border-[#FFE4E6]',
    bgColor: 'bg-[#FFF1F2]',
  },
};

// ─── STAT CARD (CLEAN WHITE + COLORED ICON CONTAINER + ACCENT LINE) ─────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  trend?: string;
}> = ({ icon: Icon, label, value, sub, accentColor, iconBg, iconColor, trend }) => {
  return (
    <div className="bg-white rounded-xl p-4.5 flex flex-col justify-between min-h-[110px] border border-[#DCE3EE] shadow-xs relative overflow-hidden transition-all hover:border-[#CBD5E1] hover:shadow-card">
      {/* Subtle top accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1" 
        style={{ backgroundColor: accentColor }} 
      />

      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          {label}
        </div>
        <div 
          className="p-1.5 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      
      <div className="mt-2.5">
        <div className="text-2xl font-extrabold text-[#172033] font-mono tracking-tight">
          {value}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1 font-medium">
          {sub && <span className="truncate">{sub}</span>}
          {trend && (
            <span className="text-[10px] font-bold text-[#159A75] font-mono ml-auto">
              {trend}
            </span>
          )}
        </div>
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
      className={`bg-white rounded-xl flex flex-col border transition-all shadow-xs overflow-hidden ${
        active ? 'border-[#3157D5] ring-2 ring-[#3157D5]/20 shadow-md' : 'border-[#DCE3EE] hover:border-[#CBD5E1]'
      }`}
    >
      <div className={`px-3 py-1.5 border-b text-[11px] font-semibold flex justify-between items-center ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
        <span>{scenarioLabel}</span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/70 border border-current">{cfg.label}</span>
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-2.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold text-[#172033]">{customerName}</div>
            <div className="font-mono text-[10px] text-[#64748B]">{customerId}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-extrabold text-[#172033] font-mono">{amount}</div>
            <div className="text-[10px] text-[#64748B] font-mono">{time}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-[#F1F4F9]">
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <MapPin className="h-3 w-3 shrink-0 text-[#3157D5]" />
              <span className="truncate">{city}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Smartphone className="h-3 w-3 shrink-0 text-[#D99425]" />
              <span className="truncate">{device}</span>
            </div>
          </div>
          <div className="flex items-end justify-end">
            <div className="text-[10px] text-right font-mono font-semibold text-[#172033] bg-[#F8FAFD] px-2 py-0.5 rounded border border-[#DCE3EE]">
              {outcome}
            </div>
          </div>
        </div>
      </div>

      <div className="p-2.5 border-t border-[#DCE3EE] bg-[#F8FAFD]">
        <button
          onClick={() => onRun(id)}
          disabled={disabled}
          className={`w-full py-1.5 flex items-center justify-center gap-2 text-xs font-semibold rounded-lg transition-all shadow-xs ${
            active
              ? 'bg-[#3157D5] text-white cursor-wait'
              : 'bg-white text-[#172033] border border-[#DCE3EE] hover:bg-[#F1F4F9] hover:border-[#CBD5E1]'
          }`}
        >
          {active ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-[#3157D5]" />
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
  <div ref={simRef} className="mt-6 animate-in fade-in duration-300">
    {result.status === 'ERROR' ? (
      <div className="bg-white rounded-xl border border-[#FFE4E6] p-5 flex items-start gap-3 shadow-xs">
        <AlertCircle className="h-5 w-5 text-[#D95C62] shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-[#D95C62]">Simulation Failed</h3>
          <p className="text-xs text-[#64748B] mt-1">{result.next_stage}</p>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DCE3EE] flex items-center justify-between bg-[#F8FAFD]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#159A75]" />
            <h3 className="text-xs font-bold text-[#172033]">
              Simulation Complete: {result.scenario_name}
            </h3>
          </div>
          <span className="font-mono text-[11px] text-[#64748B]">{result.timestamp}</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-bold">Transaction ID</div>
              <div className="text-sm font-bold font-mono text-[#172033] mt-0.5">{result.formatted_amount}</div>
              <div className="font-mono text-[11px] text-[#3157D5] font-semibold">{result.transaction.transaction_id}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-bold">Customer</div>
              <div className="text-xs font-semibold text-[#172033] mt-0.5">{result.customer.name}</div>
              <div className="font-mono text-[10px] text-[#64748B]">{result.customer.customer_id}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase text-[#64748B] font-bold">Context Signals</div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <MapPin className="h-3.5 w-3.5 text-[#3157D5]" />
              <span className="text-[#172033] font-medium">{result.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Smartphone className="h-3.5 w-3.5 text-[#D99425]" />
              <span className="text-[#172033] font-medium">{result.device_label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Lock className="h-3.5 w-3.5 text-[#D95C62]" />
              <span className="text-[#172033] font-medium">{result.login_signals_summary}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase text-[#64748B] font-bold">Risk Status</div>
            <div className="text-xs font-bold text-[#172033]">{result.status}</div>
            <div className="text-xs text-[#64748B]">{result.next_stage}</div>
          </div>

          <div className="flex items-center justify-end">
            <a
              href="#investigation-workspace"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#3157D5] text-white hover:bg-[#2645AB] transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Inspect in Workspace</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ─── MAIN COMMAND CENTER COMPONENT ────────────────────────────────────────────
export const CommandCenter: React.FC = () => {
  const [stats, setStats] = useState({
    totalTx: 0,
    investigations: 0,
    criticalCases: 0,
    blockedTx: 0
  });

  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [networkNodes, setNetworkNodes] = useState<{ id: string; risk: string; amount: number }[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<ScenarioId | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const simResultRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubTx = onSnapshot(collection(transactionsCol().firestore, 'transactions'), (snap) => {
      let blocked = 0;
      const nodes: { id: string; risk: string; amount: number }[] = [];
      snap.forEach(doc => {
        const tx = doc.data() as Transaction;
        let risk = 'LOW';
        if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') {
          blocked++;
          risk = tx.amount > 50000 ? 'CRITICAL' : 'HIGH';
        } else if (tx.status === 'STEP_UP_VERIFICATION') {
          risk = 'MEDIUM';
        }
        nodes.push({ id: doc.id, risk, amount: tx.amount });
      });
      setStats(s => ({ ...s, totalTx: snap.size, blockedTx: blocked }));
      setNetworkNodes(nodes.slice(0, 48));
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
    <div className="space-y-5">
      {/* ─── WORKSTATION HERO BAR ─────────────────────────────────────────────── */}
      <div className="glass-card p-5 border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-[var(--accent)] font-mono">
              Live Workstation
            </span>
            <span className="text-[#64748B] text-xs">•</span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Deterministic Multi-Agent Engine
            </span>
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Fraud Intelligence Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xl">
            Real-time transaction anomaly monitoring, synthetic pipeline execution, and case queue management.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="#live-events"
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Event Stream</span>
          </a>
          <a
            href="#investigation-workspace"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Cockpit</span>
          </a>
        </div>
      </div>

      {/* ─── SYSTEM STATUS STAT GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          icon={Activity}
          label="Total Transactions"
          value={stats.totalTx.toLocaleString()}
          trend="+12% /hr"
          accentColor="#3157D5"
          iconBg="#EEF2FF"
          iconColor="#3157D5"
          sub="Live transaction stream"
        />
        <StatCard
          icon={ShieldCheck}
          label="Investigations"
          value={stats.investigations}
          accentColor="#6C63D9"
          iconBg="#F3F0FF"
          iconColor="#6C63D9"
          sub="Autonomous 11-agent pipeline"
        />
        <StatCard
          icon={AlertCircle}
          label="Critical Cases"
          value={stats.criticalCases}
          accentColor="#D95C62"
          iconBg="#FFF1F2"
          iconColor="#D95C62"
          sub="Requires human triage"
        />
        <StatCard
          icon={Lock}
          label="Blocked High-Risk"
          value={stats.blockedTx}
          accentColor="#D99425"
          iconBg="#FEFCE8"
          iconColor="#D99425"
          sub="Deterministic containment"
        />
      </div>

      {/* ─── DASHBOARD PANELS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Fraud Intelligence Network Visualization (Subtle 3D Depth & Floating Clusters) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2.5">
            <h2 className="text-xs font-bold text-[#172033] flex items-center gap-2 uppercase tracking-wider">
              <Network className="h-4 w-4 text-[#3157D5]" /> Fraud Intelligence Network
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[#64748B]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#159A75]" /> Low</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D99425]" /> Step-Up</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D95C62]" /> High</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D95C62] animate-pulse" /> Critical</span>
            </div>
          </div>
          
          <div 
            className="flex-1 bg-[#F7F9FC] border border-[#DCE3EE] rounded-xl p-5 relative min-h-[240px] overflow-hidden flex flex-wrap content-start gap-3"
            style={{ perspective: '900px' }}
          >
            {/* Soft grid background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40" 
              style={{ 
                backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', 
                backgroundSize: '24px 24px' 
              }} 
            />

            {/* Floating Transaction Nodes with subtle 3D depth */}
            {networkNodes.map((node, nIdx) => {
              const isCritical = node.risk === 'CRITICAL';
              const isHigh = node.risk === 'HIGH';
              const isMedium = node.risk === 'MEDIUM';

              let nodeColor = 'bg-[#159A75] border-[#159A75]';
              let glowColor = 'rgba(21, 154, 117, 0.2)';
              if (isCritical) {
                nodeColor = 'bg-[#D95C62] border-[#D95C62]';
                glowColor = 'rgba(217, 92, 98, 0.4)';
              } else if (isHigh) {
                nodeColor = 'bg-[#D95C62] border-[#D95C62]';
                glowColor = 'rgba(217, 92, 98, 0.25)';
              } else if (isMedium) {
                nodeColor = 'bg-[#D99425] border-[#D99425]';
                glowColor = 'rgba(217, 148, 37, 0.25)';
              }

              // Varying node sizes based on transaction amount
              let sizeClass = 'h-3.5 w-3.5';
              if (node.amount > 60000) sizeClass = 'h-5 w-5';
              else if (node.amount > 20000) sizeClass = 'h-4 w-4';

              // Alternate floating animations for depth
              const floatAnim = nIdx % 2 === 0 ? 'animate-float-1' : 'animate-float-2';

              return (
                <div 
                  key={node.id}
                  className={`group relative flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-135 hover:z-30 ${floatAnim}`}
                >
                  {/* Subtle pulse ring for critical events */}
                  {isCritical && (
                    <span className="absolute -inset-1.5 rounded-full bg-[#D95C62] opacity-75 animate-pulse-ring pointer-events-none" />
                  )}

                  <div 
                    className={`rounded-full border shadow-xs ${sizeClass} ${nodeColor} transition-all duration-200`}
                    style={{ boxShadow: `0 2px 6px ${glowColor}` }}
                  />

                  {/* Rich hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-white border border-[#DCE3EE] shadow-elevated rounded-lg p-2 text-[10px] font-mono z-40 whitespace-nowrap min-w-[120px] pointer-events-none">
                    <span className="text-[#64748B] font-semibold">{node.id}</span>
                    <span className="text-xs font-bold text-[#172033]">₹{node.amount.toLocaleString()}</span>
                    <span className={`font-semibold mt-0.5 ${isCritical ? 'text-[#D95C62]' : isMedium ? 'text-[#D99425]' : 'text-[#159A75]'}`}>
                      Status: {node.risk}
                    </span>
                  </div>
                </div>
              );
            })}

            {networkNodes.length === 0 && (
              <div className="m-auto text-xs text-[#64748B] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3157D5] animate-ping" />
                <span>Synchronizing live transaction intelligence stream...</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Cases Queue */}
        <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EE] bg-[#F8FAFD] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#172033] flex items-center gap-2 uppercase tracking-wider">
              <FolderKanban className="h-4 w-4 text-[#6C63D9]" /> Active Investigation Cases
            </h2>
            <a href="#cases" className="text-xs text-[#3157D5] hover:underline font-semibold">View All</a>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[260px]">
            {recentCases.map(c => (
              <a href="#cases" key={c.id} className="block p-2.5 rounded-lg border border-[#DCE3EE] bg-white hover:border-[#3157D5] hover:shadow-xs transition-all">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-bold text-[#172033]">
                    {c.caseNumber}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    c.riskLevel === 'CRITICAL' ? 'bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]' : 'bg-[#FFF7ED] text-[#D95C62] border border-[#FED7AA]'
                  }`}>
                    {c.riskLevel}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 truncate">
                  <FileText className="h-3 w-3 text-[#64748B] shrink-0" />
                  <span className="truncate font-medium">{c.recommendation.replace(/_/g, ' ')}</span>
                </div>
              </a>
            ))}
            {recentCases.length === 0 && (
              <div className="p-6 text-center text-xs text-[#64748B]">
                No open investigation cases.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION SIMULATOR (6 CANONICAL SCENARIOS) ───────────────────── */}
      <div className="glass-card p-5 border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-light)] text-[var(--accent)]">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Canonical Demo Scenarios</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Deterministic fraud simulation triggers for pipeline verification
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-2">
          <ScenarioCard
            id="legitimate"
            scenarioLabel="Scenario A · Legitimate"
            customerName="Priya Sharma"
            customerId="C1001"
            amount="₹1,500.00"
            city="Bengaluru"
            device="Known Mobile"
            time="07:30 PM"
            outcome="ALLOW"
            riskLevel="LOW"
            active={activeSimulation === 'legitimate'}
            disabled={activeSimulation !== null && activeSimulation !== 'legitimate'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="suspicious"
            scenarioLabel="Scenario B · Suspicious"
            customerName="Rohan Mehta"
            customerId="C1002"
            amount="₹25,000.00"
            city="Delhi"
            device="New Desktop"
            time="11:15 PM"
            outcome="STEP-UP (OTP)"
            riskLevel="MEDIUM"
            active={activeSimulation === 'suspicious'}
            disabled={activeSimulation !== null && activeSimulation !== 'suspicious'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="high_risk_c1003"
            scenarioLabel="Scenario C · Hero ATO"
            customerName="Vikram Malhotra"
            customerId="C1003"
            amount="₹85,000.00"
            city="Mumbai (VPN)"
            device="Kali Linux VM"
            time="02:13 AM"
            outcome="BLOCK & CASE"
            riskLevel="CRITICAL"
            active={activeSimulation === 'high_risk_c1003'}
            disabled={activeSimulation !== null && activeSimulation !== 'high_risk_c1003'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_d_traveller"
            scenarioLabel="Scenario D · Frequent Traveller"
            customerName="Rajiv Sen"
            customerId="C1004"
            amount="₹18,500.00"
            city="Mumbai Airport"
            device="Known iPhone"
            time="02:00 PM"
            outcome="ALLOW (Isolation)"
            riskLevel="LOW"
            active={activeSimulation === 'scenario_d_traveller'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_d_traveller'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_e_fraud_ring"
            scenarioLabel="Scenario E · Mule Ring Cluster"
            customerName="Rahul Varma"
            customerId="C1015"
            amount="₹49,500.00"
            city="Pune (Tor)"
            device="Shared Emulator"
            time="03:10 AM"
            outcome="BLOCK & CASE"
            riskLevel="CRITICAL"
            active={activeSimulation === 'scenario_e_fraud_ring'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_e_fraud_ring'}
            onRun={handleRunScenario}
          />
          <ScenarioCard
            id="scenario_f_prompt_injection"
            scenarioLabel="Scenario F · Input Injection"
            customerName="Amit Joshi"
            customerId="C1020"
            amount="₹7,500.00"
            city="Bengaluru"
            device="Known Device"
            time="12:00 PM"
            outcome="ALLOW (Sanitized)"
            riskLevel="LOW"
            active={activeSimulation === 'scenario_f_prompt_injection'}
            disabled={activeSimulation !== null && activeSimulation !== 'scenario_f_prompt_injection'}
            onRun={handleRunScenario}
          />
        </div>
        
        {simulationError && (
          <div className="rounded border border-[#FEE2E2] dark:border-rose-900/40 bg-[#FEF2F2] dark:bg-rose-950/20 p-3 text-xs text-[#C43D4B] mt-3">
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
