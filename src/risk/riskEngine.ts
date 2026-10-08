import {
  Transaction,
  Customer,
  Device,
  LoginEvent,
  NetworkSignal,
  RiskLevel,
  DecisionAction,
  ReasonCode,
} from '../types';

// ==========================================
// 1. Central V3 Risk Weights (Immutable)
// ==========================================
export const V3_RISK_WEIGHTS = {
  newDevice: 15,
  multipleFailedLogins: 20,
  unusualHour: 10,
  highAmountDeviation: 20,
  newCity: 5,
  impossibleTravel: 20,
  suspiciousNetworkLink: 15,
} as const;

export type RiskSignalKey = keyof typeof V3_RISK_WEIGHTS;

// Canonical Reason Code Strings
export const REASON_CODES = {
  NEW_DEVICE: 'NEW_DEVICE',
  MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
  UNUSUAL_HOUR: 'UNUSUAL_HOUR',
  HIGH_AMOUNT_DEVIATION: 'HIGH_AMOUNT_DEVIATION',
  NEW_CITY: 'NEW_CITY',
  IMPOSSIBLE_TRAVEL: 'IMPOSSIBLE_TRAVEL',
  SUSPICIOUS_NETWORK_LINK: 'SUSPICIOUS_NETWORK_LINK',
} as const;

// ==========================================
// 2. Types & Interfaces
// ==========================================
export interface RiskEvaluationInput {
  transaction: Transaction;
  customer: Customer;
  device?: Device;
  loginEvents?: LoginEvent[];
  networkSignal?: NetworkSignal;
  historicalTransactions?: Transaction[];
}

export interface SignalEvaluation {
  signal: RiskSignalKey;
  code: string;
  domain: 'TRANSACTION' | 'BEHAVIOUR' | 'DEVICE' | 'IDENTITY' | 'LOCATION' | 'NETWORK';
  title: string;
  weight: number;
  triggered: boolean;
  reason: string;
  pointsContribution: number;
  value?: string | number | boolean;
}

export interface RiskAssessmentResult {
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  decision: DecisionAction; // 'ALLOW' | 'STEP_UP_VERIFICATION' | 'BLOCK_AND_REVIEW' | 'BLOCK_AND_CREATE_CASE'
  reasonCodes: ReasonCode[];
  triggeredSignals: SignalEvaluation[];
  scoreBreakdown: SignalEvaluation[];
  counterfactual?: string;
  summary: string;
  evaluatedAt: string;
}

// Approximate city coordinates (latitude, longitude) for speed/velocity calculation
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Goa: { lat: 15.2993, lng: 74.124 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  London: { lat: 51.5074, lng: -0.1278 },
  Frankfurt: { lat: 50.1109, lng: 8.6821 },
};

/**
 * Calculates Haversine distance in kilometers between two coordinate pairs
 */
function calculateDistanceKm(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==========================================
// 3. Risk Bands & Decision Mapping
// ==========================================
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return 'LOW';
  if (score <= 70) return 'MEDIUM';
  if (score <= 90) return 'HIGH';
  return 'CRITICAL';
}

export function getDecisionForRiskLevel(level: RiskLevel): DecisionAction {
  switch (level) {
    case 'LOW':
      return 'ALLOW';
    case 'MEDIUM':
      return 'STEP_UP_VERIFICATION';
    case 'HIGH':
      return 'BLOCK_AND_REVIEW';
    case 'CRITICAL':
      return 'BLOCK_AND_CREATE_CASE';
  }
}

// ==========================================
// 4. Pure Signal Evaluators
// ==========================================

/**
 * Evaluates whether transaction device is new or unverified
 */
function evaluateNewDevice(
  transaction: Transaction,
  customer: Customer,
  device?: Device
): { triggered: boolean; reason: string } {
  // If device object explicitly says unknown
  if (device && device.known === false) {
    return {
      triggered: true,
      reason: `Device '${device.model || device.device_id}' has not been registered or trusted for this customer.`,
    };
  }

  // If customer has a list of usual devices and this device is not in it
  const usualDevices = customer.usual_device_ids || [];
  if (usualDevices.length > 0 && !usualDevices.includes(transaction.device_id)) {
    return {
      triggered: true,
      reason: `Device '${transaction.device_id}' is not in customer's list of recognized devices.`,
    };
  }

  return {
    triggered: false,
    reason: `Transaction initiated from recognized customer device (${transaction.device_id}).`,
  };
}

/**
 * Evaluates whether multiple failed logins occurred recently
 */
function evaluateMultipleFailedLogins(
  loginEvents?: LoginEvent[]
): { triggered: boolean; reason: string; count: number } {
  if (!loginEvents || loginEvents.length === 0) {
    return {
      triggered: false,
      reason: 'No failed login attempts detected in telemetry history.',
      count: 0,
    };
  }

  const failedEvents = loginEvents.filter((e) => e.success === false);
  const count = failedEvents.length;

  if (count >= 2) {
    return {
      triggered: true,
      reason: `${count} failed login attempts detected prior to transaction.`,
      count,
    };
  }

  return {
    triggered: false,
    reason: `${count} failed login attempt(s) within normal human error tolerance (< 2).`,
    count,
  };
}

/**
 * Evaluates whether transaction occurred during abnormal hours
 */
function evaluateUnusualHour(
  transaction: Transaction,
  customer: Customer
): { triggered: boolean; reason: string; hour: number } {
  const d = new Date(transaction.timestamp);
  // Default to UTC hours from timestamp, or parse ISO string directly
  let hour = d.getUTCHours();
  const timeMatch = transaction.timestamp.match(/T(\d{2}):/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
  }

  const start = customer.normal_hours_start ?? 8;
  const end = customer.normal_hours_end ?? 22;

  let isUnusual = false;
  if (start <= end) {
    isUnusual = hour < start || hour >= end;
  } else {
    // Night shift (e.g. 20:00 to 06:00)
    isUnusual = hour < start && hour >= end;
  }

  if (isUnusual) {
    const timeFormatted = `${String(hour).padStart(2, '0')}:00`;
    return {
      triggered: true,
      reason: `Transaction initiated at ${timeFormatted}, outside normal window (${start}:00–${end}:00).`,
      hour,
    };
  }

  return {
    triggered: false,
    reason: `Transaction initiated at ${String(hour).padStart(2, '0')}:00, within normal window (${start}:00–${end}:00).`,
    hour,
  };
}

/**
 * Evaluates whether transaction amount substantially exceeds typical maximum
 */
function evaluateHighAmountDeviation(
  transaction: Transaction,
  customer: Customer
): { triggered: boolean; reason: string; ratio: number } {
  const max = customer.normal_amount_max || 10000;
  if (transaction.amount > max) {
    const ratio = Math.round((transaction.amount / max) * 10) / 10;
    return {
      triggered: true,
      reason: `Amount ₹${transaction.amount.toLocaleString()} exceeds normal ceiling of ₹${max.toLocaleString()} (${ratio}x deviation).`,
      ratio,
    };
  }

  return {
    triggered: false,
    reason: `Amount ₹${transaction.amount.toLocaleString()} is within normal bounds (≤ ₹${max.toLocaleString()}).`,
    ratio: 1,
  };
}

/**
 * Evaluates whether transaction took place in an unestablished city
 */
function evaluateNewCity(
  transaction: Transaction,
  customer: Customer
): { triggered: boolean; reason: string } {
  const home = customer.home_city || '';
  const usual = customer.usual_cities || [];

  const isHome = transaction.city.toLowerCase() === home.toLowerCase();
  const isUsual = usual.some((c) => c.toLowerCase() === transaction.city.toLowerCase());

  if (!isHome && !isUsual) {
    return {
      triggered: true,
      reason: `City '${transaction.city}' is not in customer's home or frequent cities (${[home, ...usual].join(', ')}).`,
    };
  }

  return {
    triggered: false,
    reason: `City '${transaction.city}' matches customer's established footprint.`,
  };
}

/**
 * Evaluates whether travel speed between consecutive logins/transactions is physically impossible
 */
function evaluateImpossibleTravel(
  transaction: Transaction,
  customer: Customer,
  loginEvents?: LoginEvent[]
): { triggered: boolean; reason: string } {
  if (!loginEvents || loginEvents.length === 0) {
    return {
      triggered: false,
      reason: 'No prior geographic telemetry events to assess travel velocity.',
    };
  }

  // Find most recent prior login event with a different city
  const txnTime = new Date(transaction.timestamp).getTime();
  const currentCoords = KNOWN_COORDINATES[transaction.city];

  for (const event of loginEvents) {
    if (event.city && event.city.toLowerCase() !== transaction.city.toLowerCase()) {
      const eventTime = new Date(event.timestamp).getTime();
      const elapsedHours = Math.abs(txnTime - eventTime) / (1000 * 60 * 60);

      const prevCoords = KNOWN_COORDINATES[event.city];
      if (currentCoords && prevCoords) {
        const distanceKm = calculateDistanceKm(prevCoords, currentCoords);
        if (elapsedHours > 0) {
          const speedKmH = distanceKm / elapsedHours;
          // Velocity > 750 km/h without recognized travel lead time constitutes impossible velocity
          if (speedKmH > 750 && elapsedHours < 4) {
            return {
              triggered: true,
              reason: `Rapid transit: ${Math.round(distanceKm)} km from ${event.city} to ${transaction.city} in ${elapsedHours.toFixed(1)}h requires ${Math.round(speedKmH)} km/h.`,
            };
          }
        }
      } else {
        // Fallback heuristic: different metro cities within under 2 hours
        if (elapsedHours < 2) {
          return {
            triggered: true,
            reason: `Geographic jump from ${event.city} to ${transaction.city} within ${elapsedHours.toFixed(1)} hours.`,
          };
        }
      }
    }
  }

  // Also check if customer's home city is distinct, last login was in home city, and txn is far away within rapid window
  const homeCoords = KNOWN_COORDINATES[customer.home_city];
  if (
    customer.home_city.toLowerCase() !== transaction.city.toLowerCase() &&
    homeCoords &&
    currentCoords
  ) {
    const recentHomeLogins = loginEvents.filter(
      (e) => e.city.toLowerCase() === customer.home_city.toLowerCase()
    );
    if (recentHomeLogins.length > 0) {
      const lastHomeTime = new Date(recentHomeLogins[0].timestamp).getTime();
      const diffHours = Math.abs(txnTime - lastHomeTime) / (1000 * 60 * 60);
      const dist = calculateDistanceKm(homeCoords, currentCoords);
      if (diffHours < 6 && dist > 500) {
        return {
          triggered: true,
          reason: `Rapid transit: ${Math.round(dist)} km jump from ${customer.home_city} to ${transaction.city} within ${diffHours.toFixed(1)}h without travel clearance.`,
        };
      }
    }
  }

  return {
    triggered: false,
    reason: 'Travel velocity and geographic transitions are physically plausible.',
  };
}

/**
 * Evaluates whether network IP indicates proxy, Tor, VPN, or suspicious clustering
 */
function evaluateSuspiciousNetworkLink(
  networkSignal?: NetworkSignal
): { triggered: boolean; reason: string } {
  if (!networkSignal) {
    return {
      triggered: false,
      reason: 'No network signal metadata provided; IP treated as standard residential/cellular.',
    };
  }

  if (networkSignal.is_tor) {
    return {
      triggered: true,
      reason: `Tor anonymity exit node detected (${networkSignal.ip_address}).`,
    };
  }

  if (networkSignal.is_datacenter_proxy || (networkSignal.is_vpn && networkSignal.risk_weight >= 40)) {
    return {
      triggered: true,
      reason: `Datacenter proxy / commercial VPN detected (${networkSignal.isp || networkSignal.ip_address}).`,
    };
  }

  if (networkSignal.associated_customer_ids && networkSignal.associated_customer_ids.length > 2) {
    return {
      triggered: true,
      reason: `IP address shared across ${networkSignal.associated_customer_ids.length} distinct customer accounts (cluster link).`,
    };
  }

  if (networkSignal.risk_weight >= 40) {
    return {
      triggered: true,
      reason: `High risk network gateway (risk weight: ${networkSignal.risk_weight}).`,
    };
  }

  return {
    triggered: false,
    reason: `Clean network telemetry (${networkSignal.isp || 'Residential ISP'}, risk: ${networkSignal.risk_weight}).`,
  };
}

// ==========================================
// 5. Pure Synchronous Risk Engine
// ==========================================

/**
 * Pure, synchronous, deterministic risk engine.
 * Computes exact score from V3 weights, applies 0–100 clamping,
 * and derives explainable reason codes and decision mapping.
 *
 * Guaranteed isolation principle: "City / IP change alone ≠ fraud"
 * Untrusted memo/beneficiary text is strictly inert and never modifies scoring logic.
 */
export function evaluateTransactionRisk(input: RiskEvaluationInput): RiskAssessmentResult {
  const { transaction, customer, device, loginEvents, networkSignal } = input;

  // 1. Evaluate all 7 deterministic signal rules
  const deviceCheck = evaluateNewDevice(transaction, customer, device);
  const loginCheck = evaluateMultipleFailedLogins(loginEvents);
  const hourCheck = evaluateUnusualHour(transaction, customer);
  const amountCheck = evaluateHighAmountDeviation(transaction, customer);
  const cityCheck = evaluateNewCity(transaction, customer);
  const travelCheck = evaluateImpossibleTravel(transaction, customer, loginEvents);
  const networkCheck = evaluateSuspiciousNetworkLink(networkSignal);

  // 2. Build structured score breakdown
  const scoreBreakdown: SignalEvaluation[] = [
    {
      signal: 'newDevice',
      code: REASON_CODES.NEW_DEVICE,
      domain: 'DEVICE',
      title: 'New or Unverified Device',
      weight: V3_RISK_WEIGHTS.newDevice,
      triggered: deviceCheck.triggered,
      reason: deviceCheck.reason,
      pointsContribution: deviceCheck.triggered ? V3_RISK_WEIGHTS.newDevice : 0,
      value: transaction.device_id,
    },
    {
      signal: 'multipleFailedLogins',
      code: REASON_CODES.MULTIPLE_FAILED_LOGINS,
      domain: 'IDENTITY',
      title: 'Multiple Failed Logins',
      weight: V3_RISK_WEIGHTS.multipleFailedLogins,
      triggered: loginCheck.triggered,
      reason: loginCheck.reason,
      pointsContribution: loginCheck.triggered ? V3_RISK_WEIGHTS.multipleFailedLogins : 0,
      value: loginCheck.count,
    },
    {
      signal: 'unusualHour',
      code: REASON_CODES.UNUSUAL_HOUR,
      domain: 'BEHAVIOUR',
      title: 'Unusual Transaction Hour',
      weight: V3_RISK_WEIGHTS.unusualHour,
      triggered: hourCheck.triggered,
      reason: hourCheck.reason,
      pointsContribution: hourCheck.triggered ? V3_RISK_WEIGHTS.unusualHour : 0,
      value: hourCheck.hour,
    },
    {
      signal: 'highAmountDeviation',
      code: REASON_CODES.HIGH_AMOUNT_DEVIATION,
      domain: 'TRANSACTION',
      title: 'High Amount Deviation',
      weight: V3_RISK_WEIGHTS.highAmountDeviation,
      triggered: amountCheck.triggered,
      reason: amountCheck.reason,
      pointsContribution: amountCheck.triggered ? V3_RISK_WEIGHTS.highAmountDeviation : 0,
      value: transaction.amount,
    },
    {
      signal: 'newCity',
      code: REASON_CODES.NEW_CITY,
      domain: 'LOCATION',
      title: 'New / Unrecognized City',
      weight: V3_RISK_WEIGHTS.newCity,
      triggered: cityCheck.triggered,
      reason: cityCheck.reason,
      pointsContribution: cityCheck.triggered ? V3_RISK_WEIGHTS.newCity : 0,
      value: transaction.city,
    },
    {
      signal: 'impossibleTravel',
      code: REASON_CODES.IMPOSSIBLE_TRAVEL,
      domain: 'LOCATION',
      title: 'Impossible Travel Velocity',
      weight: V3_RISK_WEIGHTS.impossibleTravel,
      triggered: travelCheck.triggered,
      reason: travelCheck.reason,
      pointsContribution: travelCheck.triggered ? V3_RISK_WEIGHTS.impossibleTravel : 0,
      value: transaction.city,
    },
    {
      signal: 'suspiciousNetworkLink',
      code: REASON_CODES.SUSPICIOUS_NETWORK_LINK,
      domain: 'NETWORK',
      title: 'Suspicious Network Signal / Proxy',
      weight: V3_RISK_WEIGHTS.suspiciousNetworkLink,
      triggered: networkCheck.triggered,
      reason: networkCheck.reason,
      pointsContribution: networkCheck.triggered ? V3_RISK_WEIGHTS.suspiciousNetworkLink : 0,
      value: transaction.ip_address,
    },
  ];

  // 3. Filter triggered signals
  const triggeredSignals = scoreBreakdown.filter((s) => s.triggered);

  // 4. Sum points and apply strict bounds [0, 100]
  const rawSum = triggeredSignals.reduce((acc, s) => acc + s.pointsContribution, 0);
  const riskScore = Math.min(100, Math.max(0, rawSum));

  // 5. Determine Risk Band & Policy Decision
  const riskLevel = getRiskLevel(riskScore);
  const decision = getDecisionForRiskLevel(riskLevel);

  // 6. Convert triggered items to standard ReasonCode structures
  const reasonCodes: ReasonCode[] = triggeredSignals.map((s) => ({
    code: s.code,
    title: s.title,
    points: s.pointsContribution,
    direction: 'RISK',
  }));

  // 7. Generate deterministic counterfactual statement
  let counterfactual: string | undefined;
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    const highestSignals = [...triggeredSignals].sort((a, b) => b.weight - a.weight);
    if (highestSignals.length >= 2) {
      counterfactual = `If '${highestSignals[0].title}' and '${highestSignals[1].title}' were benign, risk score would drop from ${riskScore} to ${riskScore - highestSignals[0].weight - highestSignals[1].weight}.`;
    }
  }

  // 8. Generate concise deterministic summary
  let summary = '';
  if (riskLevel === 'LOW') {
    summary = `Transaction verified under baseline thresholds with risk score ${riskScore}/100. Routine allow policy applied.`;
  } else if (riskLevel === 'MEDIUM') {
    summary = `Moderate deviation detected (${riskScore}/100) across ${triggeredSignals.length} risk factor(s). Step-up challenge recommended.`;
  } else if (riskLevel === 'HIGH') {
    summary = `Elevated risk detected (${riskScore}/100) across ${triggeredSignals.length} correlated factor(s). Hold and analyst review recommended.`;
  } else {
    summary = `Critical risk detected (${riskScore}/100) across multiple correlated signals (${triggeredSignals.map((t) => t.code).join(', ')}). Immediate block and case escalation recommended.`;
  }

  return {
    riskScore,
    riskLevel,
    decision,
    reasonCodes,
    triggeredSignals,
    scoreBreakdown,
    counterfactual,
    summary,
    evaluatedAt: new Date().toISOString(),
  };
}
