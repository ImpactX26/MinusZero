import { Transaction, ScenarioId } from '../types';
import {
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_DEVICES,
  SYNTHETIC_LOGIN_EVENTS,
  SYNTHETIC_NETWORK_SIGNALS,
  SYNTHETIC_TRANSACTIONS,
  CANONICAL_SCENARIOS,
} from '../data/scenarios';
import {
  evaluateTransactionRisk,
  RiskAssessmentResult,
  RiskEvaluationInput,
} from './riskEngine';

/**
 * Service layer to resolve synthetic context and execute the pure risk engine.
 * Decoupled from React and external APIs.
 */
export function evaluateTransactionContext(transaction: Transaction): RiskAssessmentResult {
  const customer = SYNTHETIC_CUSTOMERS[transaction.customer_id];
  if (!customer) {
    throw new Error(`Customer '${transaction.customer_id}' not found in synthetic registry.`);
  }

  // Resolve matching device
  const device = SYNTHETIC_DEVICES.find((d) => d.device_id === transaction.device_id);

  // Resolve relevant customer login events
  const customerLogins = SYNTHETIC_LOGIN_EVENTS.filter(
    (l) => l.customer_id === transaction.customer_id
  );

  // Resolve network signal matching IP address
  const networkSignal = SYNTHETIC_NETWORK_SIGNALS.find(
    (n) => n.ip_address === transaction.ip_address
  );

  // Resolve customer history
  const customerHistory = SYNTHETIC_TRANSACTIONS.filter(
    (t) => t.customer_id === transaction.customer_id
  );

  const input: RiskEvaluationInput = {
    transaction,
    customer,
    device,
    loginEvents: customerLogins,
    networkSignal,
    historicalTransactions: customerHistory,
  };

  return evaluateTransactionRisk(input);
}

/**
 * Evaluates risk for one of the 6 canonical scenarios by loading its exact deterministic definition
 */
export function evaluateScenarioRisk(scenarioId: ScenarioId): RiskAssessmentResult {
  const scenario = CANONICAL_SCENARIOS[scenarioId];
  if (!scenario) {
    throw new Error(`Canonical scenario '${scenarioId}' not found.`);
  }

  const transaction: Transaction = {
    transaction_id: scenario.transaction.transaction_id || `TXN-${scenarioId.toUpperCase()}`,
    customer_id: scenario.customer_id,
    amount: scenario.transaction.amount,
    currency: scenario.transaction.currency || 'INR',
    timestamp: scenario.transaction.timestamp,
    city: scenario.transaction.city,
    device_id: scenario.transaction.device_id,
    ip_address: scenario.transaction.ip_address,
    merchant: scenario.transaction.merchant,
    merchant_id: scenario.transaction.merchant_id,
    beneficiary: scenario.transaction.beneficiary,
    transaction_type: scenario.transaction.transaction_type,
    status: scenario.transaction.status || 'PENDING',
    channel: scenario.transaction.channel || 'MOBILE_APP',
  };

  const primaryDevice = scenario.devices.find(
    (d) => d.device_id === scenario.transaction.device_id
  );

  const primaryNetwork = scenario.network_signals?.[0] ||
    SYNTHETIC_NETWORK_SIGNALS.find((n) => n.ip_address === scenario.transaction.ip_address);

  const input: RiskEvaluationInput = {
    transaction,
    customer: scenario.customer,
    device: primaryDevice,
    loginEvents: scenario.login_events,
    networkSignal: primaryNetwork,
  };

  return evaluateTransactionRisk(input);
}
