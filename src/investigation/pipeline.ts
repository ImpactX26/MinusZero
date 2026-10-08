import { doc, setDoc } from 'firebase/firestore';
import { investigationsCol, agentLogsCol } from '../firebase/collections';
import { CANONICAL_SCENARIOS, SYNTHETIC_NETWORK_SIGNALS } from '../data/scenarios';
import { evaluateTransactionRisk, RiskEvaluationInput } from '../risk/riskEngine';
import { Investigation, AgentLog, ScenarioId } from '../types';
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
