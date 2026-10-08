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
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-4">
        
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCE3EE]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#3157D5] shadow-xs">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[#172033] tracking-tight uppercase">
                  Multi-Bank Real-Time Fraud Simulation
                </h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isRunning
                    ? 'bg-[#F0FDF4] text-[#159A75] border-[#BBF7D0]'
                    : 'bg-[#FEFCE8] text-[#B7791F] border-[#FEF08A]'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-[#159A75] animate-pulse' : 'bg-[#B7791F]'}`} />
                  <span>{isRunning ? '● LIVE SIMULATION' : '○ PAUSED'}</span>
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Simulated inter-bank telemetry streaming into FinGuard AI Fraud Intelligence hub · Synthetic Demonstration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-[#FEFCE8] dark:bg-amber-950/20 px-3 py-1.5 rounded-lg border border-[#FEF08A] text-[#B7791F] font-semibold">
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
                  ? 'bg-[#B7791F] hover:bg-[#975A16] text-white'
                  : 'bg-[#3157D5] hover:bg-[#2044BD] text-white ring-2 ring-[#3157D5]/20'
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
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#DCE3EE] text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>RESET</span>
            </button>
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAFD] p-1 rounded-lg border border-[#DCE3EE]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] px-2">Scenario:</span>
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
                    ? 'bg-[#3157D5] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172033] hover:bg-white'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[#F8FAFD] p-1 rounded-lg border border-[#DCE3EE]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] px-1.5">Speed:</span>
            {(['SLOW', 'NORMAL', 'FAST'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-white text-[#3157D5] shadow-xs border border-[#DCE3EE]'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic KPI Summary Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-[#F1F5F9]">
          <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
            <div className="text-[10px] font-bold uppercase text-[#64748B]">Events Generated</div>
            <div className="text-lg font-black font-mono text-[#172033] mt-0.5">{kpis.eventsGenerated}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
            <div className="text-[10px] font-bold uppercase text-[#64748B]">Fraud Signals</div>
            <div className="text-lg font-black font-mono text-[#B7791F] mt-0.5">{kpis.fraudSignals}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
            <div className="text-[10px] font-bold uppercase text-[#64748B]">Investigations Started</div>
            <div className="text-lg font-black font-mono text-[#3157D5] mt-0.5">{kpis.investigationsStarted}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
            <div className="text-[10px] font-bold uppercase text-[#64748B]">Cases Created</div>
            <div className="text-lg font-black font-mono text-[#D95C62] mt-0.5">{kpis.casesCreated}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
            <div className="text-[10px] font-bold uppercase text-[#64748B]">Amount Interdicted</div>
            <div className="text-lg font-black font-mono text-[#159A75] mt-0.5">₹{kpis.amountInterdicted.toLocaleString()}</div>
          </div>
        </div>

      </div>

      {/* ─── 2. TOP-LEVEL SYNTHETIC BANK NETWORK VISUALIZATION ──────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#3157D5]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Synthetic Multi-Bank Telemetry Topology
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#64748B]">
            Real-Time Cross-Institution Ingestion
          </span>
        </div>

        {/* SVG Animated Topology Flow */}
        <div className="relative w-full h-[150px] bg-[#FAFBFD] rounded-xl border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Connection Lines from 3 Banks to Center */}
            <line x1="20%" y1="35%" x2="50%" y2="50%" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="20%" y1="65%" x2="50%" y2="50%" stroke="#DDD6FE" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="#A7F3D0" strokeWidth="2" strokeDasharray="4 3" />

            {/* Pulsing Transaction Dots when running */}
            {isRunning && (
              <>
                <circle cx="32%" cy="41%" r="4" fill="#3157D5" className="animate-ping" />
                <circle cx="32%" cy="59%" r="4" fill="#6C63D9" className="animate-ping" />
                <circle cx="68%" cy="50%" r="4" fill="#159A75" className="animate-ping" />
              </>
            )}
          </svg>

          {/* Node 1: Bank Alpha */}
          <div className="absolute left-[6%] top-[18%] p-2 rounded-xl border border-[#C7D2FE] bg-white shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] text-[#3157D5] flex items-center justify-center font-bold font-mono text-xs">
              α
            </div>
            <div>
              <div className="text-xs font-bold text-[#172033]">Bank Alpha</div>
              <div className="text-[10px] text-[#64748B]">Bengaluru Hub</div>
            </div>
          </div>

          {/* Node 2: Bank Nova */}
          <div className="absolute left-[6%] bottom-[18%] p-2 rounded-xl border border-[#DDD6FE] bg-white shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[#F3F0FF] text-[#6C63D9] flex items-center justify-center font-bold font-mono text-xs">
              ν
            </div>
            <div>
              <div className="text-xs font-bold text-[#172033]">Bank Nova</div>
              <div className="text-[10px] text-[#64748B]">Mumbai Hub</div>
            </div>
          </div>

          {/* Central Brain: FinGuard AI Fraud Intelligence */}
          <div className="p-3 rounded-2xl border-2 border-[#3157D5] bg-white shadow-card flex flex-col items-center gap-1 z-20 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3157D5] text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="text-xs font-black text-[#172033] uppercase tracking-tight">
              FinGuard AI Hub
            </div>
            <div className="text-[10px] font-mono text-[#3157D5] font-bold">
              Autonomous Intelligence
            </div>
          </div>

          {/* Node 3: Bank Horizon */}
          <div className="absolute right-[6%] top-[35%] p-2 rounded-xl border border-[#A7F3D0] bg-white shadow-xs flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-lg bg-[#E6F7F7] text-[#159A75] flex items-center justify-center font-bold font-mono text-xs">
              H
            </div>
            <div>
              <div className="text-xs font-bold text-[#172033]">Bank Horizon</div>
              <div className="text-[10px] text-[#64748B]">Delhi Hub</div>
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
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isFocused ? 'border-[#3157D5] shadow-card ring-2 ring-[#3157D5]/20' : 'border-[#DCE3EE] shadow-xs hover:border-[#CBD5E1]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
                    style={{ backgroundColor: b.bgLight, color: b.color }}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#172033]">{b.name}</h3>
                    <div className="text-[10px] text-[#64748B]">{b.city} · {b.tagline}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#159A75]">
                  <span className="h-2 w-2 rounded-full bg-[#159A75] animate-pulse" />
                  <span>LIVE</span>
                </div>
              </div>

              {/* Metrics Counters */}
              <div className="grid grid-cols-4 gap-2 py-3 text-center">
                <div className="p-1.5 rounded bg-[#F8FAFD] border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold text-[#64748B] uppercase">Total</div>
                  <div className="text-xs font-black font-mono text-[#172033] mt-0.5">{metrics.total}</div>
                </div>
                <div className="p-1.5 rounded bg-[#F8FAFD] border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold text-[#159A75] uppercase">Normal</div>
                  <div className="text-xs font-black font-mono text-[#159A75] mt-0.5">{metrics.normal}</div>
                </div>
                <div className="p-1.5 rounded bg-[#F8FAFD] border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold text-[#B7791F] uppercase">Suspicious</div>
                  <div className="text-xs font-black font-mono text-[#B7791F] mt-0.5">{metrics.suspicious}</div>
                </div>
                <div className="p-1.5 rounded bg-[#F8FAFD] border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold text-[#D95C62] uppercase">Critical</div>
                  <div className="text-xs font-black font-mono text-[#D95C62] mt-0.5">{metrics.critical}</div>
                </div>
              </div>

              {/* Latest Transaction Box */}
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#DCE3EE] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#64748B]">
                  <span>Latest Telemetry</span>
                  {metrics.latestEvent && (
                    <span className={`px-1.5 py-0.2 rounded font-mono ${
                      metrics.latestEvent.riskLevel === 'CRITICAL' ? 'bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]' :
                      metrics.latestEvent.riskLevel === 'HIGH' ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5]' :
                      metrics.latestEvent.riskLevel === 'MEDIUM' ? 'bg-[#FEFCE8] text-[#B7791F] border border-[#FEF08A]' :
                      'bg-[#F0FDF4] text-[#159A75] border border-[#BBF7D0]'
                    }`}>
                      {metrics.latestEvent.riskLevel}
                    </span>
                  )}
                </div>

                {metrics.latestEvent ? (
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono font-bold text-[#172033]">
                      <span>₹{metrics.latestEvent.amount?.toLocaleString()}</span>
                      <span className="text-[11px] text-[#3157D5]">{metrics.latestEvent.city}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] truncate">
                      {metrics.latestEvent.deviceLabel} · {metrics.latestEvent.merchant}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#94A3B8] italic py-1">
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
                      ? 'bg-[#3157D5] text-white border-[#3157D5]'
                      : 'bg-white text-[#64748B] border-[#DCE3EE] hover:text-[#172033] hover:bg-[#F8FAFD]'
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
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#3157D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Fraud Intelligence Network Pipeline
                </h3>
              </div>
              <span className="badge text-[10px] font-mono font-bold bg-[#EEF2FF] text-[#3157D5] border border-[#C7D2FE]">
                AUTONOMOUS ORCHESTRATOR
              </span>
            </div>

            {/* Flow Stepper */}
            <div className="grid grid-cols-6 gap-1 text-center py-2 bg-[#F8FAFD] rounded-lg border border-[#DCE3EE] mb-3 text-[10px] font-bold font-mono">
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#172033]">1. BANK</div>
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#172033]">2. TXN</div>
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#B7791F]">3. SIGNALS</div>
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#3157D5]">4. CORRELATE</div>
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#6C63D9]">5. 11-AGENTS</div>
              <div className="p-1 rounded bg-white border border-[#E2E8F0] text-[#D95C62]">6. DECISION</div>
            </div>

            {/* Active Convergence Box */}
            <div className="p-3 rounded-lg border border-[#FFE4E6] bg-[#FFF1F2]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#D95C62] flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Signal Convergence Pattern</span>
                </span>
                <span className="badge text-[9px] font-bold bg-white text-[#D95C62] border border-[#FFE4E6]">
                  7 CORRELATED SIGNALS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-1.5 rounded bg-white border border-[#FFE4E6] text-[#D95C62]">
                  New Device
                </div>
                <div className="p-1.5 rounded bg-white border border-[#FFE4E6] text-[#D95C62]">
                  Failed Logins
                </div>
                <div className="p-1.5 rounded bg-white border border-[#FFE4E6] text-[#D95C62]">
                  Proxy IP Link
                </div>
                <div className="p-1.5 rounded bg-white border border-[#FFE4E6] text-[#D95C62]">
                  Amount Jump
                </div>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                {latestEvent ? latestEvent.summary : 'Awaiting simulated attack events...'}
              </p>
            </div>
          </div>

          {/* Quick CTA to open Investigation Workspace */}
          {latestEvent && (latestEvent.riskLevel === 'HIGH' || latestEvent.riskLevel === 'CRITICAL') && (
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#172033] font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[#D95C62]" />
                <span>Interdiction required for {latestEvent.transactionId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEntityGraph(latestEvent.customerId)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-[#DCE3EE] text-[#172033] hover:bg-[#F8FAFD] cursor-pointer flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5 text-[#3157D5]" />
                  <span>View Graph</span>
                </button>
                <button
                  onClick={() => handleOpenInvestigation(latestEvent)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#3157D5] text-white hover:bg-[#2044BD] cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Open Investigation Cockpit</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Cross-Bank Intelligence / Correlation (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[#6C63D9]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Cross-Bank Intelligence Correlation
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">
                Syndicate Detection
              </span>
            </div>

            {/* Tree Structure */}
            <div className="space-y-2 text-xs font-mono p-3 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE]">
              <div className="flex items-center justify-between font-bold text-[#172033] border-b border-[#E2E8F0] pb-1.5">
                <span className="text-[#3157D5]">BANK ALPHA (Bengaluru)</span>
                <span>₹75,000</span>
              </div>
              <div className="pl-4 border-l-2 border-[#CBD5E1] space-y-1.5 text-[11px] text-[#475569] my-1.5">
                <div className="flex items-center gap-1.5 text-[#D95C62] font-bold">
                  <span>├── Shared Hardware: DEV-RING-DEVICE-01</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#6C63D9] font-bold">
                  <span>├── Shared Proxy Subnet: 185.220.101.x (ASN 13335)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#159A75] font-bold">
                  <span>└── Common Destination: PeerTrade P2P Crypto Exchange</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-bold text-[#172033] border-t border-[#E2E8F0] pt-1.5">
                <span className="text-[#6C63D9]">BANK NOVA (Mumbai)</span>
                <span>₹72,000</span>
              </div>
              <div className="flex items-center justify-between font-bold text-[#172033] border-t border-[#E2E8F0] pt-1.5">
                <span className="text-[#159A75]">BANK HORIZON (Delhi)</span>
                <span>₹68,000</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] text-[11px] text-[#64748B] leading-relaxed">
            <strong className="text-[#172033]">Privacy-Safe Intelligence:</strong> FinGuard correlates encrypted hardware and network telemetry without exposing raw private banking data across bank perimeters.
          </div>
        </div>

      </div>

      {/* ─── 5. LIVE TRANSACTION STREAM ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between border-b border-[#DCE3EE] pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#3157D5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Real-Time Simulated Transaction Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge text-[10px] font-mono font-bold bg-[#F8FAFD] text-[#64748B] border border-[#DCE3EE]">
              {filteredEvents.length} Events on Record
            </span>
            {focusedBankId && (
              <button
                onClick={() => setFocusedBankId(null)}
                className="text-[10px] font-bold text-[#3157D5] hover:underline"
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
                  ? 'border-[#FFE4E6] bg-[#FFF1F2]/60 hover:bg-[#FFF1F2]'
                  : evt.riskLevel === 'HIGH'
                  ? 'border-[#FFEDD5] bg-[#FFF7ED]/50 hover:bg-[#FFF7ED]'
                  : 'border-[#DCE3EE] bg-white hover:bg-[#F8FAFD]'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-[#64748B] font-bold shrink-0">
                  {evt.timestamp}
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 border ${
                  evt.bankId === 'ALPHA' ? 'bg-[#EEF2FF] text-[#3157D5] border-[#C7D2FE]' :
                  evt.bankId === 'NOVA' ? 'bg-[#F3F0FF] text-[#6C63D9] border-[#DDD6FE]' :
                  'bg-[#E6F7F7] text-[#159A75] border-[#A7F3D0]'
                }`}>
                  {evt.bankName}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#172033]">
                      ₹{evt.amount?.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#64748B]">·</span>
                    <span className="font-mono text-xs text-[#3157D5] font-semibold">{evt.city}</span>
                    <span className="text-xs text-[#64748B]">·</span>
                    <span className="text-xs text-[#172033] font-medium truncate">{evt.customerName}</span>
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {evt.deviceLabel} · {evt.merchant} · {evt.signals.join(' · ')}
                  </div>
                </div>
              </div>

              {/* Right Badges & Action */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  evt.riskLevel === 'CRITICAL' ? 'bg-[#FFF1F2] text-[#D95C62] border-[#FFE4E6]' :
                  evt.riskLevel === 'HIGH' ? 'bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]' :
                  evt.riskLevel === 'MEDIUM' ? 'bg-[#FEFCE8] text-[#B7791F] border-[#FEF08A]' :
                  'bg-[#F0FDF4] text-[#159A75] border-[#BBF7D0]'
                }`}>
                  {evt.riskLevel} ({evt.riskScore})
                </span>

                <span className="text-[10px] font-mono font-bold text-[#64748B] hidden md:inline">
                  {evt.decision.replace(/_/g, ' ')}
                </span>

                {(evt.riskLevel === 'HIGH' || evt.riskLevel === 'CRITICAL') && (
                  <button
                    onClick={() => handleOpenInvestigation(evt)}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#3157D5] text-white hover:bg-[#2044BD] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Investigate</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-xs text-[#94A3B8] border border-dashed border-[#DCE3EE] rounded-xl">
              Simulation stream is paused. Click <strong>START SIMULATION</strong> above to generate real-time synthetic banking events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiBankSimulation;
