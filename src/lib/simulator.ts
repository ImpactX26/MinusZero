import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ScenarioId,
  ScenarioDefinition,
  Transaction,
  SimulationResult,
  Customer,
  Device,
  LoginEvent,
} from '../types';
import { CANONICAL_SCENARIOS } from '../data/scenarios';
import { evaluateScenarioRisk } from '../risk/riskService';

// ==========================================
// Scenario Presentation Metadata Table
// ==========================================
export const SCENARIO_META: Record<
  ScenarioId,
  {
    transactionId: string;
    scenarioName: string;
    formattedAmount: string;
    location: string;
    deviceLabel: string;
    loginSignalsSummary: string;
  }
> = {
  legitimate: {
    transactionId: CANONICAL_SCENARIOS.legitimate.transaction.transaction_id || 'TXN-SEED-C1001-NORM',
    scenarioName: 'Scenario A — Legitimate Normal Transaction',
    formattedAmount: '₹1,500',
    location: 'Bengaluru',
    deviceLabel: 'Known Device (DEV-1001-A)',
    loginSignalsSummary: 'Consistent biometric login telemetry',
  },
  suspicious: {
    transactionId: CANONICAL_SCENARIOS.suspicious.transaction.transaction_id || 'TXN-SEED-C1002-SUSP',
    scenarioName: 'Scenario B — Suspicious Deviation',
    formattedAmount: '₹25,000',
    location: 'Delhi',
    deviceLabel: 'New Device (DEV-1002-NEW)',
    loginSignalsSummary: 'Late-night login (23:12) from unverified desktop',
  },
  high_risk_c1003: {
    transactionId: CANONICAL_SCENARIOS.high_risk_c1003.transaction.transaction_id || 'TXN-SEED-C1003-FRAUD',
    scenarioName: 'Scenario C — Coordinated Account Takeover',
    formattedAmount: '₹85,000',
    location: 'Bengaluru → Mumbai',
    deviceLabel: 'New / Rogue Device',
    loginSignalsSummary: '3 failed logins',
  },
  scenario_d_traveller: {
    transactionId: CANONICAL_SCENARIOS.scenario_d_traveller.transaction.transaction_id || 'TXN-SEED-C1004-TRAVEL',
    scenarioName: 'Scenario D — Legitimate Frequent Traveller',
    formattedAmount: '₹18,500',
    location: 'Bengaluru → Mumbai Airport',
    deviceLabel: 'Recognized iPhone (DEV-1004-TRAVEL-A)',
    loginSignalsSummary: 'Known device connected via Airport Wi-Fi',
  },
  scenario_e_fraud_ring: {
    transactionId: CANONICAL_SCENARIOS.scenario_e_fraud_ring.transaction.transaction_id || 'TXN-SEED-C1015-RING',
    scenarioName: 'Scenario E — Coordinated Fraud Ring Cluster',
    formattedAmount: '₹49,500',
    location: 'Pune',
    deviceLabel: 'Shared Hardware Rig (DEV-RING-DEVICE-01)',
    loginSignalsSummary: 'Single proxy IP shared across 4 flagged accounts',
  },
  scenario_f_prompt_injection: {
    transactionId: CANONICAL_SCENARIOS.scenario_f_prompt_injection.transaction.transaction_id || 'TXN-SEED-C1020-INJECT',
    scenarioName: 'Scenario F — Prompt Injection / Untrusted Text',
    formattedAmount: '₹7,500',
    location: 'Bengaluru',
    deviceLabel: 'Known Device (DEV-1020-A)',
    loginSignalsSummary: 'Normal login; adversarial text in transaction memo',
  },
};

export class ScenarioError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ScenarioError';
  }
}

/**
 * Loads a scenario definition strictly from the deterministic canonical registry.
 */
export function getScenarioDefinition(scenarioId: ScenarioId): ScenarioDefinition {
  const scenario = CANONICAL_SCENARIOS[scenarioId];
  if (!scenario) {
    throw new ScenarioError(`Scenario '${scenarioId}' was not found.`, 'SCENARIO_NOT_FOUND');
  }
  return scenario;
}

/**
 * Executes deterministic scenario simulation:
 * 1. Identifies selected scenario
 * 2. Uses deterministic transaction ID (TX-2026-001 through TX-2026-006)
 * 3. Creates & writes transaction to Firestore
 * 4. Returns complete display structure with status PENDING INVESTIGATION
 *
 * NOTE: Per Phase 2 specification, does NOT calculate fake risk scores
 * or claim fraud. The transaction is marked ready for Phase 3 Risk Engine.
 */
export async function simulateScenario(scenarioId: ScenarioId): Promise<SimulationResult> {
  const scenario = getScenarioDefinition(scenarioId);
  const meta = SCENARIO_META[scenarioId];

  if (!scenario.customer) {
    throw new ScenarioError(
      `Customer '${scenario.customer_id}' required for scenario does not exist.`,
      'CUSTOMER_NOT_FOUND'
    );
  }

  const transactionId = meta.transactionId;

  const rawTransaction: Record<string, any> = {
    transaction_id: transactionId,
    id: transactionId,
    customer_id: scenario.transaction.customer_id,
    account_id: scenario.transaction.account_id,
    amount: scenario.transaction.amount,
    currency: 'INR',
    timestamp: scenario.transaction.timestamp,
    city: scenario.transaction.city,
    device_id: scenario.transaction.device_id,
    ip_address: scenario.transaction.ip_address,
    merchant: scenario.transaction.merchant,
    merchant_id: scenario.transaction.merchant_id,
    transaction_type: scenario.transaction.transaction_type,
    status: 'PENDING',
    channel: scenario.transaction.channel || 'MOBILE_APP',
  };

  if (scenario.transaction.beneficiary) {
    rawTransaction.beneficiary = scenario.transaction.beneficiary;
  }

  // Remove any remaining undefined values so Firestore does not reject document
  const transaction = Object.fromEntries(
    Object.entries(rawTransaction).filter(([_, v]) => v !== undefined)
  ) as unknown as Transaction;

  // Write to Firestore with clear error isolation
  try {
    const txnRef = doc(db, 'transactions', transactionId);
    await setDoc(txnRef, transaction, { merge: true });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.toLowerCase().includes('permission') || raw.toLowerCase().includes('insufficient')) {
      throw new ScenarioError(
        'Missing or insufficient permissions writing to Firestore transactions collection.',
        'PERMISSION_DENIED'
      );
    }
    throw new ScenarioError(
      `Firestore write failure: ${raw.replace(/https?:\/\/[^\s]+/g, '')}`,
      'FIRESTORE_WRITE_FAILURE'
    );
  }

  // Identify device
  const primaryDevice: Device = scenario.devices.find(
    (d) => d.device_id === transaction.device_id
  ) || {
    device_id: transaction.device_id,
    customer_id: transaction.customer_id,
    first_seen: transaction.timestamp,
    last_seen: transaction.timestamp,
    known: false,
    device_type: 'mobile',
  };

  // Deterministic risk engine evaluation (Phase 3 pure engine)
  const riskAssessment = evaluateScenarioRisk(scenarioId);

  return {
    scenario_id: scenarioId,
    scenario_name: meta.scenarioName,
    transaction,
    customer: scenario.customer as Customer,
    device: primaryDevice,
    login_events: scenario.login_events as LoginEvent[],
    timestamp: new Date().toISOString(),
    formatted_amount: meta.formattedAmount,
    location: meta.location,
    device_label: meta.deviceLabel,
    login_signals_summary: meta.loginSignalsSummary,
    status: 'PENDING INVESTIGATION',
    next_stage: 'Autonomous Investigation Pipeline',
    risk_assessment: riskAssessment,
  };
}
