import { doc, setDoc } from 'firebase/firestore';
import { investigationsCol, agentLogsCol, casesCol, auditLogsCol } from '../firebase/collections';
import {
  CANONICAL_SCENARIOS,
  SYNTHETIC_NETWORK_SIGNALS,
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_DEVICES,
  SYNTHETIC_LOGIN_EVENTS,
  SYNTHETIC_TRANSACTIONS,
} from '../data/scenarios';
import {
  evaluateTransactionRisk,
  RiskEvaluationInput,
  RiskAssessmentResult,
} from '../risk/riskEngine';
import {
  Investigation,
  AgentLog,
  ScenarioId,
  Transaction,
  Customer,
  CustomerRiskTier,
  AgentResult,
  Case,
} from '../types';
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
  runNarrator,
} from './agents';


export async function runInvestigationPipeline(scenarioId: ScenarioId): Promise<Investigation> {
  const scenario = CANONICAL_SCENARIOS[scenarioId];
  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  const transaction = {
    ...scenario.transaction,
    transaction_id: scenario.transaction.transaction_id || `TXN-${scenarioId.toUpperCase()}`,
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

  // 1. Run deterministic risk engine
  const riskResult = evaluateTransactionRisk(input);

  const caseId = `CASE-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const startedAt = new Date().toISOString();

  // 2. Run Agents sequentially
  const agentResults = [];
  
  const agents = [
    runTransactionAgent,
    runBehaviourAgent,
    runDeviceAgent,
    runIdentityAgent,
    runLocationAgent,
    runNetworkAgent,
    runHistoryAgent
  ];

  for (const agentFn of agents) {
    const result = agentFn(input, riskResult);
    agentResults.push(result);
  }

  const correlatorResult = runCorrelator(agentResults);
  agentResults.push(correlatorResult);

  const challengerResult = runChallenger(input, riskResult);
  agentResults.push(challengerResult);

  const verifierResult = runVerifier(agentResults);
  agentResults.push(verifierResult);

  const narratorResult = runNarrator(input, riskResult, agentResults);
  agentResults.push(narratorResult);

  // 3. Save Agent Logs
  const logPromises = agentResults.map(res => {
    const logId = crypto.randomUUID();
    const logRef = doc(agentLogsCol(), logId);
    const agentLog: AgentLog = {
      log_id: logId,
      case_id: caseId,
      agent_name: res.agent_name,
      status: res.status,
      evidence: res.evidence || [],
      findings: res.findings ? res.findings.map(f => f.title) : [],
      risk_contribution: res.risk_contribution || 0,
      summary: res.summary,
      timestamp: res.timestamp,
      createdAt: res.timestamp
    };
    return setDoc(logRef, agentLog);
  });

  await Promise.all(logPromises);

  // 4. Save Investigation
  const investigationId = crypto.randomUUID();
  const investigationRef = doc(investigationsCol(), investigationId);
  
  const investigation: Investigation = {
    case_id: caseId,
    transaction_id: transaction.transaction_id,
    risk_score: riskResult.riskScore,
    level: riskResult.riskLevel,
    decision: riskResult.decision,
    evidence: agentResults.flatMap(r => r.evidenceItems || []).map(e => e.title),
    status: riskResult.decision.includes('BLOCK') ? 'INVESTIGATING' : 'OPEN',
    created_at: startedAt,
    summary: {
      verdict: riskResult.summary,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      confidence: 0.95,
      primaryRecommendation: riskResult.decision,
      topReasons: riskResult.reasonCodes,
      benignHypothesis: challengerResult.summary,
      openQuestions: []
    }
  };

  await setDoc(investigationRef, investigation);

  return investigation;
}

/**
 * Executes the full 11-agent investigation pipeline for any live or historical Transaction.
 * Fully integrates with existing riskEngine, Firestore agent_logs, investigations, cases, and audit_logs.
 */
export async function runInvestigationForTransaction(
  transaction: Transaction,
  onProgress?: (agentName: string, completedIndex: number, total: number) => void
): Promise<{
  investigation: Investigation;
  agentResults: AgentResult[];
  caseCreated?: Case;
  riskResult: RiskAssessmentResult;
}> {
  // Resolve customer
  const customer: Customer = SYNTHETIC_CUSTOMERS[transaction.customer_id] || {
    customer_id: transaction.customer_id,
    name:
      transaction.customer_id === 'C1001'
        ? 'Priya Sharma'
        : transaction.customer_id === 'C1002'
        ? 'Rohan Mehta'
        : transaction.customer_id === 'C1008'
        ? 'Neha Kapoor'
        : 'Vikram Malhotra',
    home_city: transaction.city || 'Bengaluru',
    normal_amount_min: 100,
    normal_amount_max: 20000,
    usual_cities: [transaction.city || 'Bengaluru'],
    usual_device_ids: [transaction.device_id],
    risk_profile: (transaction.customer_id === 'C1003' ? 'HIGH' : 'LOW') as CustomerRiskTier,
  };

  const primaryDevice =
    SYNTHETIC_DEVICES.find((d) => d.device_id === transaction.device_id) || {
      device_id: transaction.device_id,
      customer_id: transaction.customer_id,
      device_type: 'mobile',
      model: 'Demo Mobile Device',
      os: 'Android 14',
      first_seen: transaction.timestamp,
      last_seen: transaction.timestamp,
      known: true,
      is_trusted: transaction.customer_id !== 'C1003',
    };

  const customerLogins = SYNTHETIC_LOGIN_EVENTS.filter(
    (l) => l.customer_id === transaction.customer_id
  );

  const primaryNetwork =
    SYNTHETIC_NETWORK_SIGNALS.find((n) => n.ip_address === transaction.ip_address) ||
    (transaction.customer_id === 'C1003'
      ? SYNTHETIC_NETWORK_SIGNALS[1]
      : SYNTHETIC_NETWORK_SIGNALS[0]);

  const customerHistory = SYNTHETIC_TRANSACTIONS.filter(
    (t) => t.customer_id === transaction.customer_id
  );

  const input: RiskEvaluationInput = {
    transaction,
    customer,
    device: primaryDevice,
    loginEvents: customerLogins,
    networkSignal: primaryNetwork,
    historicalTransactions: customerHistory,
  };

  // 1. Run deterministic risk engine
  const riskResult = evaluateTransactionRisk(input);
  const caseId = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const startedAt = new Date().toISOString();

  // 2. Run 11 Agents sequentially
  const agentResults: AgentResult[] = [];
  const standardAgents = [
    runTransactionAgent,
    runBehaviourAgent,
    runDeviceAgent,
    runIdentityAgent,
    runLocationAgent,
    runNetworkAgent,
    runHistoryAgent,
  ];

  for (let i = 0; i < standardAgents.length; i++) {
    const fn = standardAgents[i];
    const res = fn(input, riskResult);
    agentResults.push(res);
    onProgress?.(res.agent_name, agentResults.length, 11);
  }

  const correlatorResult = runCorrelator(agentResults);
  agentResults.push(correlatorResult);
  onProgress?.(correlatorResult.agent_name, agentResults.length, 11);

  const challengerResult = runChallenger(input, riskResult);
  agentResults.push(challengerResult);
  onProgress?.(challengerResult.agent_name, agentResults.length, 11);

  const verifierResult = runVerifier(agentResults);
  agentResults.push(verifierResult);
  onProgress?.(verifierResult.agent_name, agentResults.length, 11);

  const narratorResult = runNarrator(input, riskResult, agentResults);
  agentResults.push(narratorResult);
  onProgress?.(narratorResult.agent_name, agentResults.length, 11);

  // 3. Persist Agent Logs to Firestore
  const logPromises = agentResults.map((res) => {
    const logId = crypto.randomUUID();
    const logRef = doc(agentLogsCol(), logId);
    const agentLog: AgentLog = {
      log_id: logId,
      case_id: caseId,
      agent_name: res.agent_name,
      status: res.status,
      evidence: res.evidence || [],
      findings: res.findings ? res.findings.map((f) => f.title) : [],
      risk_contribution: res.risk_contribution || 0,
      summary: res.summary,
      timestamp: res.timestamp,
      createdAt: res.timestamp,
    };
    return setDoc(logRef, agentLog);
  });
  await Promise.all(logPromises);

  // 4. Persist Investigation
  const investigationId = `INV-${Date.now().toString(36).toUpperCase()}`;
  const investigationRef = doc(investigationsCol(), investigationId);

  const investigation: Investigation = {
    case_id: caseId,
    transaction_id: transaction.transaction_id,
    risk_score: riskResult.riskScore,
    level: riskResult.riskLevel,
    decision: riskResult.decision,
    evidence: agentResults.flatMap((r) => r.evidenceItems || []).map((e) => e.title),
    status: riskResult.decision.includes('BLOCK') ? 'INVESTIGATING' : 'OPEN',
    created_at: startedAt,
    summary: {
      verdict: riskResult.summary,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      confidence: 0.95,
      primaryRecommendation: riskResult.decision,
      topReasons: riskResult.reasonCodes,
      benignHypothesis: challengerResult.summary,
      openQuestions: [],
    },
  };
  await setDoc(investigationRef, investigation);

  // 5. Case Creation if policy requires case (CRITICAL or BLOCK)
  let caseCreated: Case | undefined;
  if (riskResult.decision.includes('BLOCK') || riskResult.riskLevel === 'CRITICAL') {
    caseCreated = {
      id: caseId,
      caseNumber: `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionId: transaction.transaction_id,
      customerId: transaction.customer_id,
      status: 'INVESTIGATING',
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      confidence: 0.95,
      verdict: riskResult.summary,
      recommendation: riskResult.decision,
      reasonCodes: riskResult.reasonCodes,
      investigationSummary: riskResult.summary,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    await setDoc(doc(casesCol(), caseId), caseCreated);

    // Record audit log for case creation
    const auditId = `AUDIT-CASE-${Date.now()}`;
    await setDoc(doc(auditLogsCol(), auditId), {
      id: auditId,
      actor: 'AI',
      action: 'CASE_CREATED',
      objectType: 'CASE',
      objectId: caseId,
      details: {
        transactionId: transaction.transaction_id,
        customerId: transaction.customer_id,
        riskScore: riskResult.riskScore,
        decision: riskResult.decision,
      },
      createdAt: startedAt,
    });
  }

  // 6. Record audit log for investigation completed
  const auditId = `AUDIT-INV-${Date.now()}`;
  await setDoc(doc(auditLogsCol(), auditId), {
    id: auditId,
    actor: 'AI',
    action: 'INVESTIGATION_COMPLETED',
    objectType: 'INVESTIGATION',
    objectId: investigationId,
    details: {
      transactionId: transaction.transaction_id,
      riskScore: riskResult.riskScore,
      decision: riskResult.decision,
      agentsRun: agentResults.length,
    },
    createdAt: startedAt,
  });

  return { investigation, agentResults, caseCreated, riskResult };
}
