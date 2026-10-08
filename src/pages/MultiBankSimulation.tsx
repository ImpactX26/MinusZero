import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Shield,
  ShieldAlert,
  Activity,
  AlertCircle,
  Building2,
  Zap,
  ChevronRight,
  GitMerge,
  Eye,
} from 'lucide-react';
import {
  SimulationAttackType,
  SimulationSpeed,
  SimulationEvent,
  SimulationKPIs,
  BankMetrics,
  SyntheticBankId,
} from '../types/simulation';
import { SYNTHETIC_BANKS, getScenarioEvents } from '../lib/simulationEngine';

export const MultiBankSimulation: React.FC = () => {
  // Engine Controls
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAttack, setSelectedAttack] = useState<SimulationAttackType>('ACCOUNT_TAKEOVER');
  const [speed, setSpeed] = useState<SimulationSpeed>('NORMAL');

  // Simulation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [focusedBankId, setFocusedBankId] = useState<SyntheticBankId | null>(null);

  // Active Attack Stream template
  const scenarioTemplates = useRef<SimulationEvent[]>(getScenarioEvents('ACCOUNT_TAKEOVER'));

  // Update scenario templates when attack type changes
  useEffect(() => {
    scenarioTemplates.current = getScenarioEvents(selectedAttack);
    setCurrentStepIndex(0);
  }, [selectedAttack]);

  // Speed milliseconds mapping
  const speedIntervalMs = speed === 'SLOW' ? 3000 : speed === 'FAST' ? 800 : 1500;

  // Real-time ticking engine
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const templates = scenarioTemplates.current;
      if (templates.length === 0) return;

      const nextTemplate = templates[currentStepIndex % templates.length];
      const newEvent: SimulationEvent = {
        ...nextTemplate,
        id: `SIM-EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toTimeString().split(' ')[0],
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]); // Keep latest 50
      setCurrentStepIndex((prev) => prev + 1);
    }, speedIntervalMs);

    return () => clearInterval(interval);
  }, [isRunning, currentStepIndex, speedIntervalMs]);

  // Reset Simulation
  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setEvents([]);
  };

  // Calculate live dynamic KPIs from real simulation state
  const kpis: SimulationKPIs = {
    eventsGenerated: events.length,
    fraudSignals: events.reduce((acc, ev) => acc + (ev.signals?.length || 0), 0),
    investigationsStarted: events.filter((ev) => ev.riskLevel === 'HIGH' || ev.riskLevel === 'CRITICAL').length,
    casesCreated: events.filter((ev) => ev.decision === 'BLOCK_AND_CREATE_CASE').length,
    amountInterdicted: events
      .filter((ev) => ev.decision === 'BLOCK_AND_CREATE_CASE' || ev.decision === 'BLOCK_AND_REVIEW')
      .reduce((acc, ev) => acc + ev.amount, 0),
  };

  // Calculate Bank Metrics per institution
  const getBankMetrics = (bankId: SyntheticBankId): BankMetrics => {
    const bankEvents = events.filter((e) => e.bankId === bankId);
    return {
      total: bankEvents.length,
      normal: bankEvents.filter((e) => e.riskLevel === 'LOW').length,
      suspicious: bankEvents.filter((e) => e.riskLevel === 'MEDIUM' || e.riskLevel === 'HIGH').length,
      critical: bankEvents.filter((e) => e.riskLevel === 'CRITICAL').length,
      latestEvent: bankEvents[0],
    };
  };

  // Filtered Events stream
  const filteredEvents = focusedBankId ? events.filter((e) => e.bankId === focusedBankId) : events;
  const latestEvent = events[0];

  // Navigation handlers linking to existing pages
  const handleOpenInvestigation = (evt: SimulationEvent) => {
    // Map simulated event to authoritative scenario context
    let targetScenarioKey = 'high_risk_c1003';
    if (evt.attackType === 'CROSS_BANK_RING') targetScenarioKey = 'scenario_e_fraud_ring';
    if (evt.attackType === 'IMPOSSIBLE_TRAVEL') targetScenarioKey = 'scenario_d_traveller';

    window.sessionStorage.setItem('finguard_active_scenario', targetScenarioKey);
    window.sessionStorage.setItem('finguard_active_sim_data', JSON.stringify(evt));
    window.location.hash = 'investigation-workspace';
  };

  const handleOpenEntityGraph = (customerId: string) => {
    window.sessionStorage.setItem('finguard_selected_customer', customerId);
    window.location.hash = 'entity-graph';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] space-y-4">
      {/* ─── 1. SIMULATION HEADER & CONTROL PANEL ───────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs p-4 flex flex-col gap-4 transition-colors duration-200">
        
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] shadow-xs">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight uppercase">
                  Multi-Bank Real-Time Fraud Simulation
                </h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isRunning
                    ? 'bg-[#F0FDF4] dark:bg-emerald-950/30 text-[#159A75] border-[#BBF7D0] dark:border-emerald-800/40'
                    : 'bg-[#FEFCE8] dark:bg-amber-950/30 text-[#B7791F] dark:text-amber-400 border-[#FEF08A] dark:border-amber-800/40'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-[#159A75] animate-pulse' : 'bg-[#B7791F] dark:bg-amber-400'}`} />
                  <span>{isRunning ? '● LIVE SIMULATION' : '○ PAUSED'}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Simulated inter-bank telemetry streaming into FinGuard AI Fraud Intelligence hub · Synthetic Demonstration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold">
            <span>Synthetic Data • Demo Environment</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[var(--primary)] hover:brightness-110 text-white ring-2 ring-[var(--primary)]/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>PAUSE STREAM</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>START SIMULATION</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>RESET</span>
            </button>
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--surface-muted)] p-1 rounded-lg border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] px-2">Scenario:</span>
            {(
              [
                { id: 'ACCOUNT_TAKEOVER', label: '1. Account Takeover' },
                { id: 'CROSS_BANK_RING', label: '2. Cross-Bank Ring' },
                { id: 'IMPOSSIBLE_TRAVEL', label: '3. Impossible Travel' },
                { id: 'RAPID_BURST', label: '4. Rapid Burst' },
              ] as const
            ).map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedAttack(sc.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedAttack === sc.id
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-muted)] p-1 rounded-lg border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] px-1.5">Speed:</span>
            {(['SLOW', 'NORMAL', 'FAST'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic KPI Summary Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-[var(--border)]">
          <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Events Generated</div>
            <div className="text-lg font-black font-mono text-[var(--text-primary)] mt-0.5">{kpis.eventsGenerated}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Fraud Signals</div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">{kpis.fraudSignals}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Investigations Started</div>
            <div className="text-lg font-black font-mono text-[var(--primary)] mt-0.5">{kpis.investigationsStarted}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Cases Created</div>
            <div className="text-lg font-black font-mono text-[var(--danger)] mt-0.5">{kpis.casesCreated}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Amount Interdicted</div>
            <div className="text-lg font-black font-mono text-[var(--success)] mt-0.5">₹{kpis.amountInterdicted.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ─── 2. TOP-LEVEL SYNTHETIC BANK NETWORK VISUALIZATION ──────────────── */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Synthetic Multi-Bank Telemetry Topology
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            Real-Time Cross-Institution Ingestion
          </span>
        </div>

        {/* SVG Animated Topology Flow */}
        <div className="relative w-full h-[150px] bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Connection Lines from 3 Banks to Center */}
            <line x1="20%" y1="35%" x2="50%" y2="50%" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="20%" y1="65%" x2="50%" y2="50%" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />

            {/* Pulsing Transaction Dots when running */}
            {isRunning && (
              <>
                <circle cx="32%" cy="41%" r="4" fill="var(--primary)" className="animate-ping" />
                <circle cx="32%" cy="59%" r="4" fill="var(--secondary)" className="animate-ping" />
                <circle cx="68%" cy="50%" r="4" fill="var(--success)" className="animate-ping" />
              </>
            )}
          </svg>

          {/* Node 1: Bank Alpha */}
          <div className="absolute left-[6%] top-[18%] p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold font-mono text-xs">
              α
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Bank Alpha</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Bengaluru Hub</div>
            </div>
          </div>

          {/* Node 2: Bank Nova */}
          <div className="absolute left-[6%] bottom-[18%] p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[var(--secondary)]/10 text-[var(--secondary)] flex items-center justify-center font-bold font-mono text-xs">
              ν
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Bank Nova</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Mumbai Hub</div>
            </div>
          </div>

          {/* Central Brain: FinGuard AI Fraud Intelligence */}
          <div className="p-3 rounded-2xl border-2 border-[var(--primary)] bg-[var(--surface)] shadow-card flex flex-col items-center gap-1 z-20 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">
              FinGuard AI Hub
            </div>
            <div className="text-[10px] font-mono text-[var(--primary)] font-bold">
              Autonomous Intelligence
            </div>
          </div>

          {/* Node 3: Bank Horizon */}
          <div className="absolute right-[6%] top-[35%] p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold font-mono text-xs">
              H
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Bank Horizon</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Delhi Hub</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. THREE LIVE BANK PANELS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SYNTHETIC_BANKS.map((b) => {
          const metrics = getBankMetrics(b.id);
          const isFocused = focusedBankId === b.id;

          return (
            <div
              key={b.id}
              className={`bg-[var(--surface)] rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isFocused ? 'border-[var(--primary)] shadow-card ring-2 ring-[var(--primary)]/20' : 'border-[var(--border)] shadow-xs hover:border-[var(--border-strong)]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
                    style={{ backgroundColor: `${b.color}18`, color: b.color }}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">{b.name}</h3>
                    <div className="text-[10px] text-[var(--text-secondary)]">{b.city} · {b.tagline}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--success)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                  <span>LIVE</span>
                </div>
              </div>

              {/* Metrics Counters */}
              <div className="grid grid-cols-4 gap-2 py-3 text-center">
                <div className="p-1.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Total</div>
                  <div className="text-xs font-black font-mono text-[var(--text-primary)] mt-0.5">{metrics.total}</div>
                </div>
                <div className="p-1.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div className="text-[9px] font-bold text-[var(--success)] uppercase">Normal</div>
                  <div className="text-xs font-black font-mono text-[var(--success)] mt-0.5">{metrics.normal}</div>
                </div>
                <div className="p-1.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div className="text-[9px] font-bold text-[var(--warning)] uppercase">Suspicious</div>
                  <div className="text-xs font-black font-mono text-[var(--warning)] mt-0.5">{metrics.suspicious}</div>
                </div>
                <div className="p-1.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div className="text-[9px] font-bold text-[var(--danger)] uppercase">Critical</div>
                  <div className="text-xs font-black font-mono text-[var(--danger)] mt-0.5">{metrics.critical}</div>
                </div>
              </div>

              {/* Latest Transaction Box */}
              <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                  <span>Latest Telemetry</span>
                  {metrics.latestEvent && (
                    <span className={`px-1.5 py-0.2 rounded font-mono ${
                      metrics.latestEvent.riskLevel === 'CRITICAL' ? 'bg-rose-500/10 text-[var(--danger)] border border-rose-500/20' :
                      metrics.latestEvent.riskLevel === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      metrics.latestEvent.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-[var(--warning)] border border-amber-500/20' :
                      'bg-emerald-500/10 text-[var(--success)] border border-emerald-500/20'
                    }`}>
                      {metrics.latestEvent.riskLevel}
                    </span>
                  )}
                </div>

                {metrics.latestEvent ? (
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono font-bold text-[var(--text-primary)]">
                      <span>₹{metrics.latestEvent.amount?.toLocaleString()}</span>
                      <span className="text-[11px] text-[var(--primary)]">{metrics.latestEvent.city}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {metrics.latestEvent.deviceLabel} · {metrics.latestEvent.merchant}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--text-muted)] italic py-1">
                    Awaiting live transactions...
                  </div>
                )}
              </div>

              {/* Filter Button */}
              <div className="pt-2.5 flex justify-end">
                <button
                  onClick={() => setFocusedBankId(isFocused ? null : b.id)}
                  className={`text-xs font-bold px-3 py-1 rounded-md border transition-colors cursor-pointer ${
                    isFocused
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {isFocused ? 'CLEAR FILTER' : 'VIEW STREAM'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 4. FRAUD INTELLIGENCE CENTER & CROSS-BANK CORRELATION ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Fraud Intelligence Pipeline Flow (7 Cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Fraud Intelligence Network Pipeline
                </h3>
              </div>
              <span className="badge text-[10px] font-mono font-bold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                AUTONOMOUS ORCHESTRATOR
              </span>
            </div>

            {/* Flow Stepper */}
            <div className="grid grid-cols-6 gap-1 text-center py-2 bg-[var(--surface-muted)] rounded-lg border border-[var(--border)] mb-3 text-[10px] font-bold font-mono">
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">1. BANK</div>
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">2. TXN</div>
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--warning)]">3. SIGNALS</div>
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--primary)]">4. CORRELATE</div>
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--secondary)]">5. 11-AGENTS</div>
              <div className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--danger)]">6. DECISION</div>
            </div>

            {/* Active Convergence Box */}
            <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[var(--danger)] flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Signal Convergence Pattern</span>
                </span>
                <span className="badge text-[9px] font-bold bg-[var(--surface)] text-[var(--danger)] border border-rose-500/30">
                  7 CORRELATED SIGNALS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-1.5 rounded bg-[var(--surface)] border border-rose-500/20 text-[var(--danger)]">
                  New Device
                </div>
                <div className="p-1.5 rounded bg-[var(--surface)] border border-rose-500/20 text-[var(--danger)]">
                  Failed Logins
                </div>
                <div className="p-1.5 rounded bg-[var(--surface)] border border-rose-500/20 text-[var(--danger)]">
                  Proxy IP Link
                </div>
                <div className="p-1.5 rounded bg-[var(--surface)] border border-rose-500/20 text-[var(--danger)]">
                  Amount Jump
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {latestEvent ? latestEvent.summary : 'Awaiting simulated attack events...'}
              </p>
            </div>
          </div>

          {/* Quick CTA to open Investigation Workspace */}
          {latestEvent && (latestEvent.riskLevel === 'HIGH' || latestEvent.riskLevel === 'CRITICAL') && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[var(--text-primary)] font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[var(--danger)]" />
                <span>Interdiction required for {latestEvent.transactionId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEntityGraph(latestEvent.customerId)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] cursor-pointer flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span>View Graph</span>
                </button>
                <button
                  onClick={() => handleOpenInvestigation(latestEvent)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Open Investigation Cockpit</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Cross-Bank Intelligence / Correlation (5 Cols) */}
        <div className="lg:col-span-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[var(--secondary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Cross-Bank Intelligence Correlation
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                Syndicate Detection
              </span>
            </div>

            {/* Tree Structure */}
            <div className="space-y-2 text-xs font-mono p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1.5">
                <span className="text-[var(--primary)]">BANK ALPHA (Bengaluru)</span>
                <span>₹75,000</span>
              </div>
              <div className="pl-4 border-l-2 border-[var(--border-strong)] space-y-1.5 text-[11px] text-[var(--text-secondary)] my-1.5">
                <div className="flex items-center gap-1.5 text-[var(--danger)] font-bold">
                  <span>├── Shared Hardware: DEV-RING-DEVICE-01</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--secondary)] font-bold">
                  <span>├── Shared Proxy Subnet: 185.220.101.x (ASN 13335)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--success)] font-bold">
                  <span>└── Common Destination: PeerTrade P2P Crypto Exchange</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-t border-[var(--border)] pt-1.5">
                <span className="text-[var(--secondary)]">BANK NOVA (Mumbai)</span>
                <span>₹72,000</span>
              </div>
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-t border-[var(--border)] pt-1.5">
                <span className="text-[var(--accent)]">BANK HORIZON (Delhi)</span>
                <span>₹68,000</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Privacy-Safe Intelligence:</strong> FinGuard correlates encrypted hardware and network telemetry without exposing raw private banking data across bank perimeters.
          </div>
        </div>

      </div>

      {/* ─── 5. LIVE TRANSACTION STREAM ─────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xs p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Real-Time Simulated Transaction Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge text-[10px] font-mono font-bold bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
              {filteredEvents.length} Events on Record
            </span>
            {focusedBankId && (
              <button
                onClick={() => setFocusedBankId(null)}
                className="text-[10px] font-bold text-[var(--primary)] hover:underline"
              >
                Clear Filter ({focusedBankId})
              </button>
            )}
          </div>
        </div>

        {/* Transaction Stream Table / Feed */}
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                evt.riskLevel === 'CRITICAL'
                  ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10'
                  : evt.riskLevel === 'HIGH'
                  ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-[var(--text-secondary)] font-bold shrink-0">
                  {evt.timestamp}
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 border ${
                  evt.bankId === 'ALPHA' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' :
                  evt.bankId === 'NOVA' ? 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20' :
                  'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                }`}>
                  {evt.bankName}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[var(--text-primary)]">
                      ₹{evt.amount?.toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">·</span>
                    <span className="font-mono text-xs text-[var(--primary)] font-semibold">{evt.city}</span>
                    <span className="text-xs text-[var(--text-secondary)]">·</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium truncate">{evt.customerName}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                    {evt.deviceLabel} · {evt.merchant} · {evt.signals.join(' · ')}
                  </div>
                </div>
              </div>

              {/* Right Badges & Action */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  evt.riskLevel === 'CRITICAL' ? 'bg-rose-500/10 text-[var(--danger)] border-rose-500/20' :
                  evt.riskLevel === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                  evt.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-[var(--warning)] border-amber-500/20' :
                  'bg-emerald-500/10 text-[var(--success)] border-emerald-500/20'
                }`}>
                  {evt.riskLevel} ({evt.riskScore})
                </span>

                <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] hidden md:inline">
                  {evt.decision.replace(/_/g, ' ')}
                </span>

                {(evt.riskLevel === 'HIGH' || evt.riskLevel === 'CRITICAL') && (
                  <button
                    onClick={() => handleOpenInvestigation(evt)}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Investigate</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
              Simulation stream is paused. Click <strong>START SIMULATION</strong> above to generate real-time synthetic banking events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiBankSimulation;
