/**
 * FinGuard AI — V3 Master Domain Model & Type Specifications
 * Strictly typed, multi-domain intelligence architecture.
 */

// ==========================================
// 1. Authentication & System User Types
// ==========================================
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

// ==========================================
// 2. Firestore Collection Specifications
// ==========================================
export type PermittedCollection =
  | 'customers'
  | 'accounts'
  | 'transactions'
  | 'devices'
  | 'login_events'
  | 'merchants'
  | 'network_signals'
  | 'investigations'
  | 'agent_logs'
  | 'evidence'
  | 'correlations'
  | 'cases'
  | 'case_notes'
  | 'feedback'
  | 'audit_logs'
  | 'scenario_runs';

export const PERMITTED_COLLECTIONS: readonly PermittedCollection[] = [
  'customers',
  'accounts',
  'transactions',
  'devices',
  'login_events',
  'merchants',
  'network_signals',
  'investigations',
  'agent_logs',
  'evidence',
  'correlations',
  'cases',
  'case_notes',
  'feedback',
  'audit_logs',
  'scenario_runs',
] as const;

// ==========================================
// 3. Customer Domain Model
// ==========================================
export type CustomerRiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Customer {
  customer_id: string;
  id?: string; // V3 alias
  name: string;
  home_city: string;
  homeCity?: string; // V3 alias
  normal_amount_min: number;
  normal_amount_max: number;
  usual_cities: string[];
  usual_device_ids: string[];
  risk_profile: CustomerRiskTier;
  // V3 behavioral enrichment
  occupation?: string;
  account_ids?: string[];
  primary_account_id?: string;
  normal_hours_start?: number; // e.g. 8 for 08:00
  normal_hours_end?: number;   // e.g. 22 for 22:00
  frequent_merchants?: string[];
  tenure_months?: number;
  tags?: string[];
  notes?: string;
}

// ==========================================
// 4. Account Domain Model
// ==========================================
export type AccountType = 'SAVINGS' | 'CURRENT' | 'CREDIT' | 'SALARY';
export type AccountStatus = 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'SUSPENDED';

export interface Account {
  account_id: string;
  customer_id: string;
  account_number: string;
  account_type: AccountType;
  currency: 'INR';
  current_balance: number;
  status: AccountStatus;
  opened_at: string;
  daily_limit: number;
  last_activity_at: string;
}

// ==========================================
// 5. Transaction Domain Model
// ==========================================
export type TransactionStatus =
  | 'PENDING'
  | 'ALLOWED'
  | 'STEP_UP_VERIFICATION'
  | 'BLOCK_AND_REVIEW'
  | 'BLOCKED';

export type TransactionType = 'UPI' | 'CARD' | 'NET_BANKING' | 'IMPS' | 'NEFT';

export interface Transaction {
  transaction_id: string;
  id?: string; // V3 alias
  customer_id: string;
  account_id?: string;
  amount: number;
  currency: 'INR' | string;
  timestamp: string; // ISO 8601
  city: string;
  device_id: string;
  ip_address: string;
  merchant: string;
  merchant_id?: string;
  beneficiary?: string;
  beneficiary_id?: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  channel?: 'MOBILE_APP' | 'WEB_PORTAL' | 'POS' | 'API';
  notes?: string;
}

// ==========================================
// 6. Device Domain Model
// ==========================================
export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export interface Device {
  device_id: string;
  id?: string; // V3 alias
  customer_id: string;
  first_seen: string; // ISO 8601
  last_seen: string;  // ISO 8601
  known: boolean;
  device_type: DeviceType;
  // V3 telemetry fields
  model?: string;
  os?: string;
  fingerprint?: string;
  is_root_or_emulator?: boolean;
  is_remote_access?: boolean;
  shared_with_customer_ids?: string[];
}

// ==========================================
// 7. Login Event Domain Model
// ==========================================
export interface LoginEvent {
  event_id: string;
  id?: string; // V3 alias
  customer_id: string;
  timestamp: string; // ISO 8601
  ip_address: string;
  city: string;
  device_id: string;
  success: boolean;
  failure_reason?: 'BAD_PASSWORD' | 'MFA_TIMEOUT' | 'ACCOUNT_LOCKED' | 'DEVICE_UNRECOGNIZED';
  channel?: 'MOBILE' | 'WEB';
  vpn_or_proxy_detected?: boolean;
}

// ==========================================
// 8. Merchant Domain Model
// ==========================================
export type MerchantRiskCategory = 'STANDARD' | 'HIGH_RISK_MCC' | 'CRYPTO' | 'JEWELLERY' | 'GAMING' | 'ELECTRONICS';

export interface Merchant {
  merchant_id: string;
  name: string;
  category: MerchantRiskCategory;
  mcc_code: string;
  city: string;
  risk_score: number; // 0-100
  dispute_rate: number; // percentage
  flagged_fraud_count: number;
}

// ==========================================
// 9. Network Signal Domain Model
// ==========================================
export interface NetworkSignal {
  signal_id: string;
  ip_address: string;
  asn?: string;
  isp?: string;
  city: string;
  country: string;
  is_vpn: boolean;
  is_tor: boolean;
  is_datacenter_proxy: boolean;
  associated_customer_ids: string[];
  associated_device_ids: string[];
  risk_weight: number;
}

// ==========================================
// 10. Evidence Domain Model
// ==========================================
export type EvidenceSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface EvidenceItem {
  id: string;
  investigationId?: string;
  source: string; // e.g. "DeviceTelemetry", "LoginLedger", "TransactionHistory", "GeoVelocity"
  category: string; // "DEVICE", "IDENTITY", "LOCATION", "TRANSACTION", "BEHAVIOUR", "NETWORK"
  title: string;
  description: string;
  severity: EvidenceSeverity;
  value?: string | number | boolean;
  relatedEntityIds?: string[];
  asOf?: string; // ISO 8601
}

// Backwards-compatible alias for Evidence
export type Evidence = EvidenceItem;

// ==========================================
// 11. Finding Domain Model (Agent Findings)
// ==========================================
export type FindingDirection = 'SUSPICIOUS' | 'BENIGN' | 'NEUTRAL';
export type FindingSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FindingClaim {
  text: string;
  evidenceIds: string[];
}

export interface Finding {
  findingId: string;
  agent: string;
  category: string;
  title: string;
  severity: FindingSeverity;
  confidence: number; // 0.0 to 1.0
  direction: FindingDirection;
  claims: FindingClaim[];
  metrics?: Record<string, number | string | boolean>;
  relatedEntityIds?: string[];
  recommendedChecks?: string[];
}

// ==========================================
// 12. Correlation Domain Model
// ==========================================
export type CorrelationStrength = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Correlation {
  id: string;
  investigationId: string;
  signalIds: string[];
  evidenceIds?: string[];
  title: string;
  explanation: string;
  strength: CorrelationStrength;
  connectedEntities?: string[];
}

// ==========================================
// 13. ReasonCode & RiskSignal Types
// ==========================================
export interface ReasonCode {
  code: string;
  title: string;
  points: number;
  evidenceId?: string;
  direction: 'RISK' | 'BENIGN';
}

export interface RiskSignal {
  signalKey: string;
  domain: 'TRANSACTION' | 'BEHAVIOUR' | 'DEVICE' | 'IDENTITY' | 'LOCATION' | 'NETWORK' | 'HISTORY';
  triggered: boolean;
  weight: number;
  evidenceId?: string;
  description: string;
}

// ==========================================
// 14. EntityReference
// ==========================================
export interface EntityReference {
  type: 'CUSTOMER' | 'ACCOUNT' | 'DEVICE' | 'IP' | 'MERCHANT' | 'BENEFICIARY' | 'TRANSACTION';
  id: string;
  label: string;
  status?: string;
  riskTier?: string;
}

// ==========================================
// 15. Investigation & Case Domain Models
// ==========================================
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecisionAction =
  | 'ALLOW'
  | 'STEP_UP_VERIFICATION'
  | 'BLOCK_AND_REVIEW'
  | 'BLOCK_AND_CREATE_CASE';

export type CaseStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'READY'
  | 'IN_REVIEW'
  | 'ACTIONED'
  | 'CLOSED'
  | 'ESCALATED';

// Legacy alias
export type InvestigationStatus =
  | 'OPEN'
  | 'CONFIRMED_FRAUD'
  | 'MARKED_LEGITIMATE'
  | 'CLOSED'
  | CaseStatus;

export interface InvestigationSummary {
  verdict: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  primaryRecommendation: DecisionAction;
  topReasons: ReasonCode[];
  benignHypothesis?: string;
  openQuestions?: string[];
}

export interface Investigation {
  case_id: string;
  transaction_id: string;
  risk_score: number; // 0-100
  level: RiskLevel;
  decision: DecisionAction;
  evidence: string[]; // evidence IDs or titles
  status: InvestigationStatus;
  created_at: string; // ISO 8601
  summary?: InvestigationSummary;
}

export interface Case {
  id: string;
  caseNumber: string;
  transactionId: string;
  customerId: string;
  status: CaseStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  verdict: string;
  recommendation: DecisionAction;
  humanActionTaken?: string;
  humanDisposition?: 'CONFIRMED_FRAUD' | 'MARKED_LEGITIMATE' | 'INCONCLUSIVE';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  slaExpiresAt?: string;
}

export interface CaseNote {
  noteId: string;
  caseId: string;
  author: string;
  text: string;
  createdAt: string;
}

// ==========================================
// 16. Agent Logs & Agent Results
// ==========================================
export type AgentStatus = 'running' | 'ok' | 'fallback' | 'error';

export interface SignalEntry {
  key: string;
  value: string | number | boolean;
}

export interface AgentResult {
  agent_name: string;
  agentId?: string;
  status: AgentStatus;
  signals: SignalEntry[];
  evidence: string[];
  evidenceItems?: EvidenceItem[];
  findings?: Finding[];
  risk_contribution: number;
  confidence?: number;
  summary: string;
  timestamp: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AgentLog {
  log_id: string;
  case_id: string;
  agent_name: string;
  status: AgentStatus;
  evidence: string[];
  findings?: string[];
  risk_contribution: number;
  summary: string;
  durationMs?: number;
  timestamp: string;
  createdAt?: string;
}

// ==========================================
// 17. Feedback & Audit Logs
// ==========================================
export type InvestigatorAction = 'CONFIRM_FRAUD' | 'MARK_LEGITIMATE' | 'INCONCLUSIVE';

export interface Feedback {
  feedback_id: string;
  case_id: string;
  investigator_action: InvestigatorAction;
  comment: string;
  analyst_id?: string;
  override_reason?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actor: 'SYSTEM' | 'AI' | 'INVESTIGATOR';
  actorId?: string;
  action: string; // e.g. "CASE_CREATED", "SIMULATED_BLOCK", "INVESTIGATION_COMPLETED", "FEEDBACK_SUBMITTED"
  objectType: 'CASE' | 'TRANSACTION' | 'INVESTIGATION' | 'ACCOUNT';
  objectId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// ==========================================
// 18. Scenario Definitions & Simulator Types
// ==========================================
export type ScenarioId =
  | 'legitimate'
  | 'suspicious'
  | 'high_risk_c1003'
  | 'scenario_d_traveller'
  | 'scenario_e_fraud_ring'
  | 'scenario_f_prompt_injection';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
  customer_id: string;
  customer: Customer;
  account?: Account;
  transaction: Omit<Transaction, 'transaction_id'> & { transaction_id?: string };
  devices: Device[];
  login_events: LoginEvent[];
  network_signals?: NetworkSignal[];
  expected_risk_level: RiskLevel;
  expected_decision: DecisionAction;
  contextNotes?: string;
}

export interface ScenarioRun {
  runId: string;
  scenarioId: ScenarioId;
  triggeredAt: string;
  transactionId: string;
  caseId?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: DecisionAction;
}

export interface SimulationResult {
  scenario_id: ScenarioId;
  scenario_name: string;
  transaction: Transaction;
  customer: Customer;
  device: Device;
  login_events: LoginEvent[];
  timestamp: string;
  formatted_amount: string;
  location: string;
  device_label: string;
  login_signals_summary: string;
  status: string;
  next_stage: string;
  risk_assessment?: any;
}

export interface Decision {
  risk_score: number;
  level: RiskLevel;
  action: DecisionAction;
  case_required: boolean;
}
