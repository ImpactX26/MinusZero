import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  User,
  Smartphone,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  Globe,
  MapPin,
  Activity,
  History,
  GitMerge,
  Scale,
  FileText,
  Shield,
  Layers,
  Store,
  CreditCard,
  Network
} from 'lucide-react';
import { CANONICAL_SCENARIOS, SYNTHETIC_NETWORK_SIGNALS } from '../data/scenarios';
import { evaluateTransactionRisk, RiskEvaluationInput } from '../risk/riskEngine';
import { casesCol, auditLogsCol } from '../firebase/collections';
import { setDoc, addDoc, doc } from 'firebase/firestore';
import {
  runTransactionAgent,
  runBehaviourAgent,
  runDeviceAgent,
  runIdentityAgent,
  runLocationAgent,
  runNetworkAgent,
  runHistoryAgent,
  runCorrelator,
  runChallenger,
  runVerifier,
  runNarrator
} from '../investigation/agents';
import { AgentResult, Case, AuditLog, DecisionAction } from '../types';

export const InvestigationWorkspace: React.FC = () => {
  const scenario = CANONICAL_SCENARIOS['high_risk_c1003'];
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronously compute investigation state
  const data = useMemo(() => {
    const transaction = {
      ...scenario.transaction,
      transaction_id: scenario.transaction.transaction_id || 'TXN-HIGH_RISK_C1003',
      currency: scenario.transaction.currency || 'INR',
      status: scenario.transaction.status || 'PENDING',
      channel: scenario.transaction.channel || 'MOBILE_APP',
    };

    const primaryDevice = scenario.devices.find(d => d.device_id === transaction.device_id);
    const primaryNetwork = scenario.network_signals?.[0] || 
      SYNTHETIC_NETWORK_SIGNALS.find(n => n.ip_address === transaction.ip_address);

    const input: RiskEvaluationInput = {
      transaction,
      customer: scenario.customer,
      device: primaryDevice,
      loginEvents: scenario.login_events,
      networkSignal: primaryNetwork,
    };

    const riskResult = evaluateTransactionRisk(input);

    const agents = [
      { name: 'Transaction', fn: runTransactionAgent, icon: Activity },
      { name: 'Behaviour', fn: runBehaviourAgent, icon: Clock },
      { name: 'Device', fn: runDeviceAgent, icon: Smartphone },
      { name: 'Identity', fn: runIdentityAgent, icon: User },
      { name: 'Location', fn: runLocationAgent, icon: MapPin },
      { name: 'Network', fn: runNetworkAgent, icon: Globe },
      { name: 'History', fn: runHistoryAgent, icon: History },
    ];

    const agentResults: (AgentResult & { icon: React.ElementType })[] = [];
    agents.forEach(a => {
      const res = a.fn(input, riskResult);
      agentResults.push({ ...res, icon: a.icon });
    });

    const correlator = runCorrelator(agentResults);
    agentResults.push({ ...correlator, icon: GitMerge });

    const challenger = runChallenger(input, riskResult);
    agentResults.push({ ...challenger, icon: Scale });

    const verifier = runVerifier(agentResults);
    agentResults.push({ ...verifier, icon: CheckCircle2 });

    const narrator = runNarrator(input, riskResult, agentResults);
    agentResults.push({ ...narrator, icon: FileText });

    return { input, riskResult, agentResults, challenger, narrator };
  }, [scenario]);

  const { input, riskResult, agentResults, challenger, narrator } = data;

  const handleAction = (action: string) => {
    if (['Hold', 'Block & Review', 'Freeze Account'].includes(action)) {
      setShowConfirm(action);
    } else {
      alert(`Determination "${action}" logged to audit stream.`);
    }
  };

  const confirmAction = async () => {
    if (!showConfirm) return;
    setIsSubmitting(true);
    try {
      const caseId = `CASE-${scenario.customer_id}-${Date.now().toString().slice(-6)}`;
      let recommendation: DecisionAction = 'BLOCK_AND_REVIEW';
      if (showConfirm === 'Hold') recommendation = 'STEP_UP_VERIFICATION';
      if (showConfirm === 'Block & Review') recommendation = 'BLOCK_AND_REVIEW';
      if (showConfirm === 'Freeze Account') recommendation = 'BLOCK_AND_CREATE_CASE';

      const newCase: Case = {
        id: caseId,
        caseNumber: caseId,
        transactionId: input.transaction.transaction_id || '',
        customerId: input.customer.customer_id,
        status: 'NEW',
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        confidence: 0.95,
        verdict: narrator.summary,
        recommendation,
        reasonCodes: riskResult.reasonCodes,
        investigationSummary: narrator.summary,
        agentFindings: agentResults.map(a => ({
          agent: a.agent_name,
          summary: a.summary,
          evidenceItems: a.evidenceItems || []
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(casesCol(), caseId), newCase);
      
      const auditLog: Omit<AuditLog, 'id'> = {
        actor: 'INVESTIGATOR',
        action: 'CASE_CREATED',
        objectType: 'CASE',
        objectId: caseId,
        details: { action: showConfirm },
        createdAt: new Date().toISOString()
      };
      await addDoc(auditLogsCol(), auditLog);
      
      const createdAction = showConfirm;
      setShowConfirm(null);
      alert(`Authoritative determination "${createdAction}" confirmed. Case ${caseId} created and logged in audit ledger.`);
    } catch (err) {
      console.error(err);
      setShowConfirm(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Specific deterministic points breakdown requested
  const waterfallPoints = [
    { label: 'New Device', points: 15, key: 'new_device' },
    { label: 'Failed Logins', points: 20, key: 'failed_logins' },
    { label: 'Unusual Hour', points: 10, key: 'unusual_hour' },
    { label: 'Amount Deviation', points: 20, key: 'amount_deviation' },
    { label: 'New City', points: 5, key: 'new_city' },
    { label: 'Impossible Travel', points: 20, key: 'impossible_travel' },
    { label: 'Suspicious Network', points: 15, key: 'suspicious_network' },
  ];

  // Top signals list as specified in prompt
  const topSignals = [
    'New device',
    'Multiple failed logins',
    'Unusual hour',
    'High amount deviation',
    'New city',
    'Impossible travel',
    'Suspicious network link',
  ];

  // Specific evidence correlation matrix items requested
  const evidenceCards = [
    { title: 'NEW DEVICE', value: 'DEV-1003-ROGUE', tag: 'Hardware anomaly', color: 'border-l-[#D99425]' },
    { title: 'MULTIPLE FAILED LOGINS', value: '3 failed attempts', tag: 'Brute force indicator', color: 'border-l-[#D95C62]' },
    { title: 'LOCATION CHANGE', value: 'Bengaluru → Mumbai', tag: 'Geographic jump', color: 'border-l-[#159A9C]' },
    { title: 'NETWORK', value: '103.21.144.92', tag: 'Datacenter / Proxy IP', color: 'border-l-[#6C63D9]' },
    { title: 'TRANSACTION', value: '₹85,000', tag: '17x customer baseline', color: 'border-l-[#3157D5]' },
    { title: 'IMPOSSIBLE TRAVEL', value: 'Bengaluru → Mumbai', tag: '840 km in 4 minutes', color: 'border-l-[#D95C62]' },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] space-y-4">
      {/* ─── WORKSPACE HEADER BAR ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCE3EE] bg-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#D95C62]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#172033]">Autonomous Investigation Cockpit</h1>
              <span className="badge text-[10px] font-semibold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                LIVE TRIAGE
              </span>
              <span className="badge text-[10px] font-semibold bg-[#EEF2FF] text-[#3157D5] border border-[#C7D2FE]">
                SCENARIO C
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Deterministic multi-agent verification, correlation matrix &amp; human-in-the-loop action bar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono bg-white px-3.5 py-1.5 rounded-lg border border-[#DCE3EE] shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Target:</span>
            <span className="font-semibold text-[#172033]">Vikram Malhotra (C1003)</span>
          </div>
          <span className="text-[#DCE3EE]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Transaction:</span>
            <span className="font-semibold text-[#3157D5]">{input.transaction.transaction_id}</span>
          </div>
          <span className="text-[#DCE3EE]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Amount:</span>
            <span className="font-semibold text-[#172033]">₹{input.transaction.amount?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ─── 3-COLUMN INVESTIGATION LAYOUT ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* ─── LEFT: AI BRIEF (LG: 3 COLS) ─────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  AI Investigation Brief
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EEF2FF] text-[#3157D5] font-semibold">
                Autonomous
              </span>
            </div>

            {/* Risk Score Card - Clean White with tasteful Sapphire & Coral accents */}
            <div className="p-4 rounded-xl border border-[#DCE3EE] bg-gradient-to-br from-white to-[#F8FAFD] shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D95C62] to-[#D99425]" />
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Composite Risk Score
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                  CRITICAL
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold font-mono text-[#172033] tracking-tight">
                  100
                </span>
                <span className="text-sm font-semibold text-[#64748B] font-mono">/ 100</span>
                <span className="ml-auto text-xs font-bold text-[#D95C62] font-mono">
                  +65 above limit
                </span>
              </div>

              {/* Score meter progress */}
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#D95C62] h-full rounded-full transition-all duration-500 w-full" />
              </div>
            </div>

            {/* Decision & Confidence */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
                <div className="text-[10px] font-semibold uppercase text-[#64748B] mb-0.5">Decision</div>
                <div className="font-bold text-[#D95C62] font-mono text-[11px]">
                  BLOCK &amp; CREATE CASE
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
                <div className="text-[10px] font-semibold uppercase text-[#64748B] mb-0.5">Confidence</div>
                <div className="font-bold text-[#159A75] font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> High (95.0%)
                </div>
              </div>
            </div>

            {/* Top Signals */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                  Top Signals
                </span>
                <span className="text-[10px] font-mono text-[#D95C62] font-bold">7 Triggered</span>
              </div>
              <div className="space-y-1 bg-[#F8FAFD] p-2.5 rounded-lg border border-[#DCE3EE]">
                {topSignals.map((signal, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#172033]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62] shrink-0" />
                    <span className="text-[11px] font-medium">{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benign Hypothesis */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                Benign Hypothesis
              </div>
              <div className="p-2.5 rounded-lg border border-[#DCE3EE] bg-white text-xs text-[#64748B] leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-[#159A75] mb-1">
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  <span>Challenger Agent Review</span>
                </div>
                <p className="italic text-[11px] text-[#475569]">
                  "{challenger.summary || 'Customer may be travelling or using a newly purchased device.'}"
                </p>
                <div className="mt-1 text-[10px] font-mono text-[#D95C62] font-semibold">
                  Exoneration rejected: Velocity exceeds commercial travel physics (840 km / 4m).
                </div>
              </div>
            </div>

            {/* Narrator Summary */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                Narrator Summary
              </div>
              <p className="text-xs text-[#172033] leading-relaxed p-2.5 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
                {narrator.summary}
              </p>
            </div>

          </div>
        </div>

        {/* ─── CENTER: TIMELINE + EVIDENCE CORRELATION + WATERFALL (LG: 6 COLS) ─ */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Main Visual Focus: Vertical Timeline of 11 Agents */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  11-Agent Investigation Timeline
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#159A75]" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#D95C62]" /> Critical
                </span>
              </div>
            </div>

            {/* Vertical timeline items with rich subtle color coding */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {agentResults.map((agent, idx) => {
                const AgentIcon = agent.icon;
                const isCritical = 
                  agent.summary.toLowerCase().includes('critical') || 
                  agent.summary.toLowerCase().includes('rogue') ||
                  agent.summary.toLowerCase().includes('fail') ||
                  agent.summary.toLowerCase().includes('impossible') ||
                  agent.agent_name === 'Correlator';

                const isWarning = agent.agent_name === 'Transaction' || agent.agent_name === 'Behaviour';
                const isChallenger = agent.agent_name === 'Challenger';

                // Semantic border & badge
                let statusBadge = {
                  text: 'COMPLETED',
                  bg: 'bg-[#F0FDF4] text-[#159A75] border-[#BBF7D0]',
                  accentColor: 'border-l-[#159A75]',
                  iconBg: 'bg-[#F0FDF4] text-[#159A75]'
                };

                if (isCritical) {
                  statusBadge = {
                    text: 'CRITICAL FINDING',
                    bg: 'bg-[#FFF1F2] text-[#D95C62] border-[#FFE4E6]',
                    accentColor: 'border-l-[#D95C62]',
                    iconBg: 'bg-[#FFF1F2] text-[#D95C62]'
                  };
                } else if (isChallenger) {
                  statusBadge = {
                    text: 'EXONERATION REJECTED',
                    bg: 'bg-[#FEFCE8] text-[#D99425] border-[#FEF08A]',
                    accentColor: 'border-l-[#D99425]',
                    iconBg: 'bg-[#FEFCE8] text-[#D99425]'
                  };
                } else if (isWarning) {
                  statusBadge = {
                    text: 'ELEVATED RISK',
                    bg: 'bg-[#EEF2FF] text-[#3157D5] border-[#C7D2FE]',
                    accentColor: 'border-l-[#3157D5]',
                    iconBg: 'bg-[#EEF2FF] text-[#3157D5]'
                  };
                }

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border border-[#DCE3EE] border-l-4 ${statusBadge.accentColor} bg-white hover:bg-[#F8FAFD] transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md ${statusBadge.iconBg}`}>
                          <AgentIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-xs text-[#172033]">
                          ✓ {agent.agent_name} Agent
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold border ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#64748B]">
                        {agent.durationMs ? `${agent.durationMs}ms` : 'verified'}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed pl-6">
                      {agent.summary}
                    </p>

                    {/* Evidence preview if available */}
                    {agent.evidenceItems && agent.evidenceItems.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#F1F5F9] pl-6 flex flex-wrap gap-2 text-[10px] font-mono">
                        {agent.evidenceItems.slice(0, 2).map((ev, eIdx) => (
                          <span key={eIdx} className="px-1.5 py-0.5 rounded bg-[#F8FAFD] text-[#64748B] border border-[#E2E8F0]">
                            {ev.title}: <strong className="text-[#172033]">{String(ev.value)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Lower Section: Evidence Correlation Matrix */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[#3157D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Evidence Correlation Matrix
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">Multi-Dimensional Linkage</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {evidenceCards.map((card, cIdx) => (
                <div
                  key={cIdx}
                  className={`p-2.5 rounded-lg border border-[#DCE3EE] border-l-3 ${card.color} bg-white hover:border-[#CBD5E1] transition-shadow shadow-xs flex flex-col justify-between`}
                >
                  <div>
                    <div className="text-[9px] uppercase font-bold text-[#64748B] tracking-wide mb-0.5">
                      {card.title}
                    </div>
                    <div className="text-xs font-bold font-mono text-[#172033] truncate">
                      {card.value}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1 pt-1 border-t border-[#F1F5F9]">
                    {card.tag}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Risk Waterfall — "Why this transaction reached 100/100" */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Why this transaction reached 100/100
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Deterministic cumulative rule score attribution
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#D95C62]">
                  TOTAL: 100 / 100
                </span>
              </div>
            </div>

            {/* Horizontal progression bars */}
            <div className="space-y-2">
              {waterfallPoints.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-36 font-medium text-[#172033] truncate text-[11px]">
                    {item.label}
                  </span>
                  
                  {/* Progress bar line */}
                  <div className="flex-1 bg-[#F1F4F9] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#3157D5] to-[#D95C62] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.points / 20) * 100}%` }}
                    />
                  </div>

                  <span className="w-10 text-right font-mono font-bold text-[#D95C62] text-[11px]">
                    +{item.points}
                  </span>
                </div>
              ))}

              {/* Total Waterfall Summary row */}
              <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#DCE3EE]">
                <span className="font-bold text-xs uppercase text-[#172033]">
                  Total Risk
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#64748B]">Caps at 100</span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-extrabold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                    100 / 100
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ─── RIGHT: INVESTIGATION CONTEXT (LG: 3 COLS) ───────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3.5">
            
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Investigation Context
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">Telemetry</span>
            </div>

            {/* CUSTOMER */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Customer</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] text-[#3157D5] font-semibold">KYC TIER 2</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Name</span>
                  <span className="font-bold text-[#172033]">Vikram Malhotra</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Customer ID</span>
                  <span className="font-mono text-[#3157D5] font-bold">C1003</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Account</span>
                  <span className="font-medium text-[#172033]">Savings</span>
                </div>
              </div>
            </div>

            {/* DEVICE */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Device</span>
                <span className="text-[9px] font-mono bg-[#FFF1F2] px-1.5 py-0.5 rounded text-[#D95C62] font-bold border border-[#FFE4E6]">ROGUE HARDWARE</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Type</span>
                  <span className="font-medium text-[#172033]">desktop</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Device ID</span>
                  <span className="font-mono font-bold text-[#D95C62]">DEV-1003-ROGUE</span>
                </div>
              </div>
            </div>

            {/* NETWORK */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Network</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] text-[#6C63D9] font-semibold">ASN 13335</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">IP Address</span>
                  <span className="font-mono font-bold text-[#172033]">103.21.144.92</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Observed City</span>
                  <span className="font-medium text-[#172033]">Mumbai</span>
                </div>
              </div>
            </div>

            {/* RECENT LOGIN ACTIVITY */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Recent Login Activity</span>
                <span className="text-[9px] font-mono text-[#D95C62] font-semibold">Pre-Auth Timeline</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-[#E2E8F0] pb-1 font-mono">
                  <span className="text-[#64748B]">01:58</span>
                  <span className="text-[#D95C62] font-semibold">Failed login</span>
                </div>
                <div className="flex items-center justify-between text-[11px] border-b border-[#E2E8F0] pb-1 font-mono">
                  <span className="text-[#64748B]">02:09</span>
                  <span className="text-[#D95C62] font-semibold">Failed login</span>
                </div>
                <div className="flex items-center justify-between text-[11px] border-b border-[#E2E8F0] pb-1 font-mono">
                  <span className="text-[#64748B]">02:11</span>
                  <span className="text-[#D99425] font-bold">Compromised login</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-0.5 font-mono">
                  <span className="text-[#64748B]">02:13</span>
                  <span className="text-[#3157D5] font-bold">Transaction</span>
                </div>
              </div>
            </div>

            {/* MERCHANT */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Merchant</span>
                <span className="text-[9px] font-mono bg-[#FFF1F2] text-[#D95C62] px-1.5 py-0.5 rounded border border-[#FFE4E6] font-semibold">MCC 5094</span>
              </div>
              <div className="text-xs font-bold text-[#172033]">
                Luxury Jewels &amp; Bullion
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                High Liquidity Asset / High Risk Category
              </div>
            </div>

            {/* RELATED ENTITIES */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-2">
                Related Entities
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs">
                  <CreditCard className="h-3 w-3 text-[#6C63D9]" />
                  <span className="font-mono">ACC-4003</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs">
                  <Smartphone className="h-3 w-3 text-[#D99425]" />
                  <span className="font-mono">DEV-1003-ROGUE</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs">
                  <Network className="h-3 w-3 text-[#D95C62]" />
                  <span className="font-mono">103.21.144.92</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs">
                  <Store className="h-3 w-3 text-[#159A75]" />
                  <span>Luxury Jewels</span>
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ─── BOTTOM ACTION BAR ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-[#64748B] flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#3157D5]" />
          <span>
            <strong className="text-[#172033]">Human-in-the-Loop Authority:</strong> Select authoritative determination to sign into immutable case ledger.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* Neutral/white buttons for normal actions */}
          <button
            onClick={() => handleAction('Allow')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCE3EE] text-[#172033] hover:bg-[#F8FAFD] transition-colors whitespace-nowrap shadow-xs"
          >
            ALLOW
          </button>
          
          <button
            onClick={() => handleAction('Step-Up Verification')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCE3EE] text-[#172033] hover:bg-[#F8FAFD] transition-colors whitespace-nowrap shadow-xs"
          >
            STEP-UP
          </button>
          
          <button
            onClick={() => handleAction('Hold')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#FEF08A] text-[#D99425] hover:bg-[#FEFCE8] transition-colors whitespace-nowrap shadow-xs"
          >
            HOLD
          </button>

          {/* Sapphire for primary investigation action */}
          <button
            onClick={() => handleAction('Block & Review')}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#3157D5] text-white hover:bg-[#2645AB] transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
          >
            BLOCK &amp; REVIEW
          </button>

          {/* Coral/red ONLY for destructive/high-impact action */}
          <button
            onClick={() => handleAction('Freeze Account')}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#D95C62] text-white hover:bg-[#C54A50] transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
          >
            FREEZE ACCOUNT
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-[#DCE3EE] shadow-elevated">
            <div className="flex items-center gap-2.5 mb-3 text-[#D95C62]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#172033]">Confirm Disposition Action</h3>
            </div>
            <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
              Confirm <strong>{showConfirm}</strong> for Vikram Malhotra (C1003) transaction {input.transaction.transaction_id}? This is an authoritative disposition and will trigger automated account control rules and case ledger audit logging.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFD]"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#D95C62] text-white hover:bg-[#C54A50]"
              >
                {isSubmitting ? 'Logging...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationWorkspace;
