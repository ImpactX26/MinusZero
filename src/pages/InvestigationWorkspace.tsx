import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  User,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Lock,
  FileText,
  AlertCircle
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
      { name: 'Transaction', fn: runTransactionAgent },
      { name: 'Behaviour', fn: runBehaviourAgent },
      { name: 'Device', fn: runDeviceAgent },
      { name: 'Identity', fn: runIdentityAgent },
      { name: 'Location', fn: runLocationAgent },
      { name: 'Network', fn: runNetworkAgent },
      { name: 'History', fn: runHistoryAgent }
    ];

    const agentResults: AgentResult[] = [];
    agents.forEach(a => agentResults.push(a.fn(input, riskResult)));

    const correlator = runCorrelator(agentResults);
    agentResults.push(correlator);

    const challenger = runChallenger(input, riskResult);
    agentResults.push(challenger);

    const verifier = runVerifier(agentResults);
    agentResults.push(verifier);

    const narrator = runNarrator(input, riskResult, agentResults);
    agentResults.push(narrator);

    return { input, riskResult, agentResults, challenger, narrator, correlator };
  }, [scenario]);

  const { input, riskResult, agentResults, challenger, narrator } = data;

  const handleAction = (action: string) => {
    if (['Hold', 'Block & Review', 'Freeze Account'].includes(action)) {
      setShowConfirm(action);
    } else {
      alert(`Action ${action} executed successfully.`);
    }
  };

  const confirmAction = async () => {
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
      
      setShowConfirm(null);
      window.location.hash = 'cases';
    } catch (err) {
      console.error(err);
      alert('Failed to save case.');
      setShowConfirm(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-500" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Investigation Workspace</h1>
          <span className="badge bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-[10px]">
            <Database className="h-3 w-3 inline mr-1" />
            Synthetic Data • Demo Environment
          </span>
        </div>
        <div className="terminal-text text-xs text-[var(--text-secondary)]">
          Case: CASE-{scenario.customer_id}-{Date.now().toString().slice(-6)}
        </div>
      </div>

      {/* 3 COLUMNS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* LEFT — AI BRIEF */}
        <div className="lg:col-span-3 glass-card overflow-y-auto p-4 flex flex-col gap-4 relative custom-scrollbar">
          <h2 className="text-sm font-bold border-b border-[var(--border-subtle)] pb-2 uppercase tracking-wider text-[var(--text-muted)]">
            AI Brief
          </h2>
          
          <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <div className="text-[10px] uppercase font-bold text-rose-500 tracking-wider mb-1">Risk Score</div>
            <div className="text-4xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {riskResult.riskScore}
            </div>
            <div className="w-full bg-[var(--bg-surface-subtle)] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-500 h-full" style={{ width: `${riskResult.riskScore}%` }} />
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex-1 text-center badge bg-rose-600 text-white border-transparent font-bold">
              {riskResult.riskLevel} RISK
            </span>
            <span className="flex-1 text-center badge bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] font-bold truncate">
              {riskResult.decision.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Narrator Summary</div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-surface-subtle)] p-2 rounded">
                {narrator.summary}
              </p>
            </div>
            
            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Top Reason Codes</div>
              <ul className="text-[11px] space-y-1">
                {riskResult.reasonCodes.map(rc => (
                  <li key={rc.code} className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{rc.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Challenger Hypothesis</div>
              <div className="flex items-start gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{challenger.summary}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
              <span>AI Confidence</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">95.0%</span>
            </div>
          </div>
        </div>

        {/* CENTER — INVESTIGATION TIMELINE */}
        <div className="lg:col-span-6 glass-card overflow-y-auto p-4 flex flex-col relative custom-scrollbar">
          <h2 className="text-sm font-bold border-b border-[var(--border-subtle)] pb-2 mb-4 uppercase tracking-wider text-[var(--text-muted)]">
            Investigation Timeline
          </h2>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--border-subtle)] before:via-[var(--border-default)] before:to-transparent">
            {agentResults.map((agent, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon marker */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[var(--bg-root)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {agent.status === 'ok' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
                  )}
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase">
                      {agent.agent_name} Agent
                    </span>
                    <span className="badge bg-emerald-500/10 text-emerald-600 border-transparent text-[9px] py-0">Completed</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mb-2">
                    {agent.summary}
                  </div>
                  
                  {agent.evidenceItems && agent.evidenceItems.length > 0 && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      {agent.evidenceItems.map(ev => (
                        <div key={ev.id} className="flex items-start gap-1.5 text-[10px] bg-[var(--bg-root)] p-1.5 rounded border border-[var(--border-subtle)]">
                          <FileText className="h-3 w-3 text-[var(--accent)] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] block">{ev.title}</span>
                            <span className="text-[var(--text-muted)] leading-tight">{ev.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Waterfall Logic (Score breakdown) */}
          <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase mb-3">Risk Waterfall</h3>
            <div className="space-y-1">
              {riskResult.scoreBreakdown.map(item => (
                <div key={item.signal} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono w-8 text-right ${item.triggered ? 'text-rose-500 font-bold' : 'text-[var(--text-muted)]'}`}>
                      +{item.pointsContribution}
                    </span>
                    <span className={item.triggered ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono max-w-[40%] truncate">
                    {String(item.value || '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — CONTEXT */}
        <div className="lg:col-span-3 glass-card overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          <h2 className="text-sm font-bold border-b border-[var(--border-subtle)] pb-2 uppercase tracking-wider text-[var(--text-muted)]">
            Context
          </h2>
          
          <div className="space-y-4">
            <div className="bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2 text-[var(--text-primary)]">
                <User className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider">Customer Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div className="text-[var(--text-muted)]">Name</div>
                <div className="text-right font-medium">{input.customer.name}</div>
                <div className="text-[var(--text-muted)]">ID</div>
                <div className="text-right font-mono">{input.customer.customer_id}</div>
                <div className="text-[var(--text-muted)]">Home City</div>
                <div className="text-right">{input.customer.home_city}</div>
                <div className="text-[var(--text-muted)]">Risk Tier</div>
                <div className="text-right badge bg-transparent text-[var(--text-primary)] border-[var(--border-subtle)] inline-block px-1 ml-auto">{input.customer.risk_profile}</div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2 text-[var(--text-primary)]">
                <Smartphone className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider">Device & Network</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div className="text-[var(--text-muted)]">Device ID</div>
                <div className="text-right font-mono truncate">{input.transaction.device_id}</div>
                <div className="text-[var(--text-muted)]">IP Address</div>
                <div className="text-right font-mono">{input.transaction.ip_address}</div>
                <div className="text-[var(--text-muted)]">Known Device</div>
                <div className="text-right">{input.device?.known ? 'Yes' : 'No'}</div>
                <div className="text-[var(--text-muted)]">City</div>
                <div className="text-right">{input.transaction.city}</div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2 text-[var(--text-primary)]">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider">Recent Logins</span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {input.loginEvents?.slice(0, 3).map((l, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-[var(--border-subtle)] last:border-0 pb-1">
                    <span className="font-mono text-[var(--text-muted)]">
                      {new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="truncate mx-2 text-[var(--text-secondary)]">{l.city}</span>
                    <span className={l.success ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                      {l.success ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="mt-4 shrink-0 glass-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Make a final determination for this case.
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button onClick={() => handleAction('Allow')} className="btn-secondary whitespace-nowrap text-xs py-1.5 px-3">
            Allow
          </button>
          <button onClick={() => handleAction('Step-Up Verification')} className="btn-secondary whitespace-nowrap text-xs py-1.5 px-3">
            Step-Up
          </button>
          <button onClick={() => handleAction('Hold')} className="btn-secondary whitespace-nowrap text-xs py-1.5 px-3 text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
            Hold
          </button>
          <button onClick={() => handleAction('Block & Review')} className="btn-primary whitespace-nowrap text-xs py-1.5 px-3 bg-orange-600 hover:bg-orange-700">
            Block & Review
          </button>
          <button onClick={() => handleAction('Freeze Account')} className="btn-primary whitespace-nowrap text-xs py-1.5 px-3 bg-rose-600 hover:bg-rose-700 shadow-rose-500/20">
            Freeze Account
          </button>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Confirm Action</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to execute <strong>{showConfirm}</strong>? This is a high-impact action and will be logged in the immutable audit ledger.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirm(null)} className="btn-secondary text-sm px-4 py-2">
                Cancel
              </button>
              <button onClick={confirmAction} className="btn-primary bg-rose-600 hover:bg-rose-700 text-sm px-4 py-2">
                Confirm {showConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
