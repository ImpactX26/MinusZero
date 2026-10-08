import { CANONICAL_SCENARIOS } from '../data/scenarios';
import { evaluateScenarioRisk } from '../risk/riskService';

export interface ValidationCheckResult {
  scenarioId: string;
  name: string;
  passed: boolean;
  checks: { name: string; expected: unknown; actual: unknown; passed: boolean }[];
}

export function validateAllScenarios(): {
  allPassed: boolean;
  results: ValidationCheckResult[];
} {
  const scenarioIds = Object.keys(CANONICAL_SCENARIOS);
  const results: ValidationCheckResult[] = [];

  // Assert exactly 6 canonical scenarios (A, B, C, D, E, F)
  const hasExactlySix = scenarioIds.length === 6;
  if (!hasExactlySix) {
    throw new Error(`Expected exactly 6 canonical scenarios, found ${scenarioIds.length}`);
  }

  // 1. Verify Scenario A: Legitimate
  const leg = CANONICAL_SCENARIOS.legitimate;
  const legPrimaryDevice = leg.devices.find((d) => d.device_id === leg.transaction.device_id);
  const legRisk = evaluateScenarioRisk('legitimate');
  const legChecks = [
    {
      name: 'Expected Risk Level == LOW',
      expected: 'LOW',
      actual: leg.expected_risk_level,
      passed: leg.expected_risk_level === 'LOW',
    },
    {
      name: 'Expected Decision == ALLOW',
      expected: 'ALLOW',
      actual: leg.expected_decision,
      passed: leg.expected_decision === 'ALLOW',
    },
    {
      name: 'Deterministic Risk Engine (LOW / ALLOW)',
      expected: 'LOW / ALLOW',
      actual: `${legRisk.riskLevel} / ${legRisk.decision}`,
      passed: legRisk.riskLevel === 'LOW' && legRisk.decision === 'ALLOW',
    },
    {
      name: 'Amount == 1500',
      expected: 1500,
      actual: leg.transaction.amount,
      passed: leg.transaction.amount === 1500,
    },
    {
      name: 'City == Bengaluru',
      expected: 'Bengaluru',
      actual: leg.transaction.city,
      passed: leg.transaction.city === 'Bengaluru',
    },
    {
      name: 'Known Device (known == true)',
      expected: true,
      actual: legPrimaryDevice?.known,
      passed: legPrimaryDevice?.known === true,
    },
    {
      name: 'Time == 19:30',
      expected: true,
      actual: leg.transaction.timestamp.includes('19:30'),
      passed: leg.transaction.timestamp.includes('19:30'),
    },
  ];

  results.push({
    scenarioId: leg.id,
    name: leg.name,
    passed: legChecks.every((c) => c.passed),
    checks: legChecks,
  });

  // 2. Verify Scenario B: Suspicious
  const sus = CANONICAL_SCENARIOS.suspicious;
  const susPrimaryDevice = sus.devices.find((d) => d.device_id === sus.transaction.device_id);
  const susRisk = evaluateScenarioRisk('suspicious');
  const susChecks = [
    {
      name: 'Expected Risk Level == MEDIUM',
      expected: 'MEDIUM',
      actual: sus.expected_risk_level,
      passed: sus.expected_risk_level === 'MEDIUM',
    },
    {
      name: 'Expected Decision == STEP_UP_VERIFICATION',
      expected: 'STEP_UP_VERIFICATION',
      actual: sus.expected_decision,
      passed: sus.expected_decision === 'STEP_UP_VERIFICATION',
    },
    {
      name: 'Deterministic Risk Engine (MEDIUM / STEP_UP_VERIFICATION)',
      expected: 'MEDIUM / STEP_UP_VERIFICATION',
      actual: `${susRisk.riskLevel} / ${susRisk.decision}`,
      passed: susRisk.riskLevel === 'MEDIUM' && susRisk.decision === 'STEP_UP_VERIFICATION',
    },
    {
      name: 'Amount == 25000',
      expected: 25000,
      actual: sus.transaction.amount,
      passed: sus.transaction.amount === 25000,
    },
    {
      name: 'City == Delhi',
      expected: 'Delhi',
      actual: sus.transaction.city,
      passed: sus.transaction.city === 'Delhi',
    },
    {
      name: 'New Device (known == false)',
      expected: false,
      actual: susPrimaryDevice?.known,
      passed: susPrimaryDevice?.known === false,
    },
    {
      name: 'Time == 23:15',
      expected: true,
      actual: sus.transaction.timestamp.includes('23:15'),
      passed: sus.transaction.timestamp.includes('23:15'),
    },
  ];

  results.push({
    scenarioId: sus.id,
    name: sus.name,
    passed: susChecks.every((c) => c.passed),
    checks: susChecks,
  });

  // 3. Verify Scenario C: High-Risk C1003 ATO Hero
  const fraud = CANONICAL_SCENARIOS.high_risk_c1003;
  const fraudPrimaryDevice = fraud.devices.find((d) => d.device_id === fraud.transaction.device_id);
  const failedLogins = fraud.login_events.filter((l) => !l.success);
  const fraudRisk = evaluateScenarioRisk('high_risk_c1003');
  const fraudChecks = [
    {
      name: 'Customer ID == C1003',
      expected: 'C1003',
      actual: fraud.customer_id,
      passed: fraud.customer_id === 'C1003' && fraud.customer !== undefined,
    },
    {
      name: 'Expected Risk Level == CRITICAL',
      expected: 'CRITICAL',
      actual: fraud.expected_risk_level,
      passed: fraud.expected_risk_level === 'CRITICAL',
    },
    {
      name: 'Expected Decision == BLOCK_AND_CREATE_CASE',
      expected: 'BLOCK_AND_CREATE_CASE',
      actual: fraud.expected_decision,
      passed: fraud.expected_decision === 'BLOCK_AND_CREATE_CASE',
    },
    {
      name: 'Deterministic Risk Engine (CRITICAL / BLOCK_AND_CREATE_CASE)',
      expected: 'CRITICAL / BLOCK_AND_CREATE_CASE',
      actual: `${fraudRisk.riskLevel} / ${fraudRisk.decision}`,
      passed: fraudRisk.riskLevel === 'CRITICAL' && fraudRisk.decision === 'BLOCK_AND_CREATE_CASE',
    },
    {
      name: 'Amount == 85000',
      expected: 85000,
      actual: fraud.transaction.amount,
      passed: fraud.transaction.amount === 85000,
    },
    {
      name: 'Customer Origin City == Bengaluru',
      expected: 'Bengaluru',
      actual: fraud.customer.home_city,
      passed: fraud.customer.home_city === 'Bengaluru',
    },
    {
      name: 'Transaction City == Mumbai (Location Jump)',
      expected: 'Mumbai',
      actual: fraud.transaction.city,
      passed: fraud.transaction.city === 'Mumbai',
    },
    {
      name: 'New Device (known == false)',
      expected: false,
      actual: fraudPrimaryDevice?.known,
      passed: fraudPrimaryDevice?.known === false,
    },
    {
      name: 'Time == 02:13 (Unusual Night Hour)',
      expected: true,
      actual: fraud.transaction.timestamp.includes('02:13'),
      passed: fraud.transaction.timestamp.includes('02:13'),
    },
    {
      name: 'Multiple Failed Logins (> 1)',
      expected: true,
      actual: failedLogins.length >= 2,
      passed: failedLogins.length >= 2,
    },
  ];

  results.push({
    scenarioId: fraud.id,
    name: fraud.name,
    passed: fraudChecks.every((c) => c.passed),
    checks: fraudChecks,
  });

  // 4. Verify Scenario D: Legitimate Traveller
  const trav = CANONICAL_SCENARIOS.scenario_d_traveller;
  const travDevice = trav.devices.find((d) => d.device_id === trav.transaction.device_id);
  const travRisk = evaluateScenarioRisk('scenario_d_traveller');
  const travChecks = [
    {
      name: 'Customer ID == C1004',
      expected: 'C1004',
      actual: trav.customer_id,
      passed: trav.customer_id === 'C1004',
    },
    {
      name: 'Expected Risk Level == LOW',
      expected: 'LOW',
      actual: trav.expected_risk_level,
      passed: trav.expected_risk_level === 'LOW',
    },
    {
      name: 'Expected Decision == ALLOW',
      expected: 'ALLOW',
      actual: trav.expected_decision,
      passed: trav.expected_decision === 'ALLOW',
    },
    {
      name: 'Deterministic Risk Engine (LOW / ALLOW — Isolation Principle)',
      expected: 'LOW / ALLOW',
      actual: `${travRisk.riskLevel} / ${travRisk.decision}`,
      passed: travRisk.riskLevel === 'LOW' && travRisk.decision === 'ALLOW',
    },
    {
      name: 'Amount == 18500',
      expected: 18500,
      actual: trav.transaction.amount,
      passed: trav.transaction.amount === 18500,
    },
    {
      name: 'Known Device in New City (known == true)',
      expected: true,
      actual: travDevice?.known,
      passed: travDevice?.known === true,
    },
  ];

  results.push({
    scenarioId: trav.id,
    name: trav.name,
    passed: travChecks.every((c) => c.passed),
    checks: travChecks,
  });

  // 5. Verify Scenario E: Fraud Ring
  const ring = CANONICAL_SCENARIOS.scenario_e_fraud_ring;
  const ringRisk = evaluateScenarioRisk('scenario_e_fraud_ring');
  const ringChecks = [
    {
      name: 'Customer ID == C1015',
      expected: 'C1015',
      actual: ring.customer_id,
      passed: ring.customer_id === 'C1015',
    },
    {
      name: 'Expected Risk Level == CRITICAL',
      expected: 'CRITICAL',
      actual: ring.expected_risk_level,
      passed: ring.expected_risk_level === 'CRITICAL',
    },
    {
      name: 'Expected Decision == BLOCK_AND_CREATE_CASE',
      expected: 'BLOCK_AND_CREATE_CASE',
      actual: ring.expected_decision,
      passed: ring.expected_decision === 'BLOCK_AND_CREATE_CASE',
    },
    {
      name: 'Deterministic Risk Engine (CRITICAL / BLOCK_AND_CREATE_CASE)',
      expected: 'CRITICAL / BLOCK_AND_CREATE_CASE',
      actual: `${ringRisk.riskLevel} / ${ringRisk.decision}`,
      passed: ringRisk.riskLevel === 'CRITICAL' && ringRisk.decision === 'BLOCK_AND_CREATE_CASE',
    },
    {
      name: 'Shared Emulator Device ID == DEV-RING-DEVICE-01',
      expected: 'DEV-RING-DEVICE-01',
      actual: ring.transaction.device_id,
      passed: ring.transaction.device_id === 'DEV-RING-DEVICE-01',
    },
  ];

  results.push({
    scenarioId: ring.id,
    name: ring.name,
    passed: ringChecks.every((c) => c.passed),
    checks: ringChecks,
  });

  // 6. Verify Scenario F: Prompt Injection Test
  const inj = CANONICAL_SCENARIOS.scenario_f_prompt_injection;
  const injRisk = evaluateScenarioRisk('scenario_f_prompt_injection');
  const injChecks = [
    {
      name: 'Customer ID == C1020',
      expected: 'C1020',
      actual: inj.customer_id,
      passed: inj.customer_id === 'C1020',
    },
    {
      name: 'Expected Risk Level == LOW',
      expected: 'LOW',
      actual: inj.expected_risk_level,
      passed: inj.expected_risk_level === 'LOW',
    },
    {
      name: 'Deterministic Risk Engine (LOW / ALLOW — Injection Immune)',
      expected: 'LOW / ALLOW',
      actual: `${injRisk.riskLevel} / ${injRisk.decision}`,
      passed: injRisk.riskLevel === 'LOW' && injRisk.decision === 'ALLOW',
    },
    {
      name: 'Contains Adversarial Text in Beneficiary',
      expected: true,
      actual: inj.transaction.beneficiary?.includes('SYSTEM:'),
      passed: Boolean(inj.transaction.beneficiary?.includes('SYSTEM:')),
    },
  ];

  results.push({
    scenarioId: inj.id,
    name: inj.name,
    passed: injChecks.every((c) => c.passed),
    checks: injChecks,
  });

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}

// Self-executing runner if invoked directly via ts-node/node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('validateScenarios')) {
  const { allPassed, results } = validateAllScenarios();
  console.log('=== SCENARIO DEFINITION VALIDATION REPORT ===');
  for (const r of results) {
    console.log(`\nScenario [${r.scenarioId}] - ${r.name}`);
    for (const c of r.checks) {
      console.log(`  [${c.passed ? 'PASS' : 'FAIL'}] ${c.name} (Actual: ${c.actual})`);
    }
  }
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL SCENARIOS VALIDATED' : 'FAILURES DETECTED'}`);
}
