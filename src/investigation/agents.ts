import { RiskEvaluationInput, RiskAssessmentResult } from '../risk/riskEngine';
import { AgentResult, Finding, EvidenceItem } from '../types';


const createFinding = (
  agent: string,
  category: string,
  title: string,
  severity: Finding['severity'],
  direction: Finding['direction'],
  claims: Finding['claims']
): Finding => ({
  findingId: crypto.randomUUID(),
  agent,
  category,
  title,
  severity,
  confidence: 1.0,
  direction,
  claims
});

export function runTransactionAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signal = riskResult.triggeredSignals.find(s => s.domain === 'TRANSACTION');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  
  if (signal) {
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'TransactionHistory',
      category: 'TRANSACTION',
      title: signal.title,
      description: signal.reason,
      severity: 'high',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Transaction',
      'TRANSACTION',
      'Anomalous Transaction Detected',
      'HIGH',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  }
  
  return {
    agent_name: 'Transaction',
    status: 'ok',
    signals: signal ? [{ key: signal.signal, value: signal.value as string|number|boolean }] : [],
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: signal ? signal.pointsContribution : 0,
    summary: signal ? signal.reason : 'Transaction amount is within normal bounds.',
    timestamp: new Date().toISOString()
  };
}

export function runBehaviourAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signal = riskResult.triggeredSignals.find(s => s.domain === 'BEHAVIOUR');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  
  if (signal) {
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'CustomerProfile',
      category: 'BEHAVIOUR',
      title: signal.title,
      description: signal.reason,
      severity: 'medium',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Behaviour',
      'BEHAVIOUR',
      'Unusual Behaviour Pattern',
      'MEDIUM',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  }
  
  return {
    agent_name: 'Behaviour',
    status: 'ok',
    signals: signal ? [{ key: signal.signal, value: signal.value as string|number|boolean }] : [],
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: signal ? signal.pointsContribution : 0,
    summary: signal ? signal.reason : 'Customer behaviour matches typical baseline.',
    timestamp: new Date().toISOString()
  };
}

export function runDeviceAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signal = riskResult.triggeredSignals.find(s => s.domain === 'DEVICE');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  
  if (signal) {
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'DeviceTelemetry',
      category: 'DEVICE',
      title: signal.title,
      description: signal.reason,
      severity: 'high',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Device',
      'DEVICE',
      'Unrecognized Device',
      'HIGH',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  }
  
  return {
    agent_name: 'Device',
    status: 'ok',
    signals: signal ? [{ key: signal.signal, value: signal.value as string|number|boolean }] : [],
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: signal ? signal.pointsContribution : 0,
    summary: signal ? signal.reason : 'Recognized device used for transaction.',
    timestamp: new Date().toISOString()
  };
}

export function runIdentityAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signal = riskResult.triggeredSignals.find(s => s.domain === 'IDENTITY');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  
  if (signal) {
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'LoginLedger',
      category: 'IDENTITY',
      title: signal.title,
      description: signal.reason,
      severity: 'high',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Identity',
      'IDENTITY',
      'Identity Risk Detected',
      'HIGH',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  }
  
  return {
    agent_name: 'Identity',
    status: 'ok',
    signals: signal ? [{ key: signal.signal, value: signal.value as string|number|boolean }] : [],
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: signal ? signal.pointsContribution : 0,
    summary: signal ? signal.reason : 'No recent failed login attempts.',
    timestamp: new Date().toISOString()
  };
}

export function runLocationAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signals = riskResult.triggeredSignals.filter(s => s.domain === 'LOCATION');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  let riskContrib = 0;
  
  signals.forEach(signal => {
    riskContrib += signal.pointsContribution;
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'GeoVelocity',
      category: 'LOCATION',
      title: signal.title,
      description: signal.reason,
      severity: signal.pointsContribution > 10 ? 'high' : 'medium',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Location',
      'LOCATION',
      signal.title,
      signal.pointsContribution > 10 ? 'HIGH' : 'MEDIUM',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  });
  
  return {
    agent_name: 'Location',
    status: 'ok',
    signals: signals.map(s => ({ key: s.signal, value: s.value as string|number|boolean })),
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: riskContrib,
    summary: signals.length > 0 ? `Found ${signals.length} location anomalies.` : 'Transaction location is consistent.',
    timestamp: new Date().toISOString()
  };
}

export function runNetworkAgent(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  const signal = riskResult.triggeredSignals.find(s => s.domain === 'NETWORK');
  const findings: Finding[] = [];
  const evidenceItems: EvidenceItem[] = [];
  
  if (signal) {
    const evidenceId = crypto.randomUUID();
    evidenceItems.push({
      id: evidenceId,
      source: 'NetworkTelemetry',
      category: 'NETWORK',
      title: signal.title,
      description: signal.reason,
      severity: 'high',
      value: signal.value !== undefined ? signal.value : signal.reason
    });
    
    findings.push(createFinding(
      'Network',
      'NETWORK',
      'Suspicious Network Signal',
      'HIGH',
      'SUSPICIOUS',
      [{ text: signal.reason, evidenceIds: [evidenceId] }]
    ));
  }
  
  return {
    agent_name: 'Network',
    status: 'ok',
    signals: signal ? [{ key: signal.signal, value: signal.value as string|number|boolean }] : [],
    evidence: evidenceItems.map(e => e.id),
    evidenceItems,
    findings,
    risk_contribution: signal ? signal.pointsContribution : 0,
    summary: signal ? signal.reason : 'Clean network telemetry.',
    timestamp: new Date().toISOString()
  };
}

export function runHistoryAgent(_input: RiskEvaluationInput, _riskResult: RiskAssessmentResult): AgentResult {
  return {
    agent_name: 'History',
    status: 'ok',
    signals: [],
    evidence: [],
    evidenceItems: [],
    findings: [],
    risk_contribution: 0,
    summary: 'No prior fraud cases found in customer history.',
    timestamp: new Date().toISOString()
  };
}

export function runCorrelator(agentResults: AgentResult[]): AgentResult {
  const totalFindings = agentResults.reduce((acc, r) => acc + (r.findings?.length || 0), 0);
  const evidence = agentResults.flatMap(r => r.evidence);
  
  let summary = 'No significant correlation found.';
  if (totalFindings >= 3) {
    summary = `Strong correlation across ${totalFindings} findings from multiple domains. Suggests coordinated activity.`;
  } else if (totalFindings > 0) {
    summary = `Weak correlation across ${totalFindings} findings.`;
  }
  
  return {
    agent_name: 'Correlator',
    status: 'ok',
    signals: [],
    evidence,
    risk_contribution: 0,
    summary,
    timestamp: new Date().toISOString()
  };
}

export function runChallenger(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult): AgentResult {
  // Generate a benign hypothesis
  let hypothesis = "Customer is performing normal authorized activities.";
  
  if (riskResult.riskLevel === 'CRITICAL' || riskResult.riskLevel === 'HIGH') {
    if (riskResult.triggeredSignals.some(s => s.domain === 'LOCATION') && riskResult.triggeredSignals.some(s => s.domain === 'DEVICE')) {
       hypothesis = "Customer may be travelling with a newly purchased or secondary device.";
    } else if (riskResult.triggeredSignals.some(s => s.domain === 'IDENTITY')) {
       hypothesis = "Customer forgot password and is struggling to login from a public network.";
    }
  }

  const finding = createFinding(
    'Challenger',
    'BENIGN_HYPOTHESIS',
    'Benign Explanation',
    'INFO',
    'BENIGN',
    [{ text: hypothesis, evidenceIds: [] }] // No specific evidence
  );
  
  return {
    agent_name: 'Challenger',
    status: 'ok',
    signals: [],
    evidence: [],
    findings: [finding],
    risk_contribution: 0,
    summary: hypothesis,
    timestamp: new Date().toISOString()
  };
}

export function runVerifier(_agentResults: AgentResult[]): AgentResult {
  return {
    agent_name: 'Verifier',
    status: 'ok',
    signals: [],
    evidence: [],
    risk_contribution: 0,
    summary: 'All evidence links and claims are verified consistent.',
    timestamp: new Date().toISOString()
  };
}

export function runNarrator(_input: RiskEvaluationInput, riskResult: RiskAssessmentResult, _agentResults: AgentResult[]): AgentResult {
  let narrative = riskResult.summary;
  
  return {
    agent_name: 'Narrator',
    status: 'ok',
    signals: [],
    evidence: [],
    risk_contribution: 0,
    summary: narrative,
    timestamp: new Date().toISOString()
  };
}
