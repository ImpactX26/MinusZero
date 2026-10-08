export type SyntheticBankId = 'ALPHA' | 'NOVA' | 'HORIZON';

export interface SyntheticBank {
  id: SyntheticBankId;
  name: string;
  city: string;
  color: string;
  bgLight: string;
  accent: string;
  tagline: string;
}

export type SimulationAttackType = 
  | 'ACCOUNT_TAKEOVER'
  | 'CROSS_BANK_RING'
  | 'IMPOSSIBLE_TRAVEL'
  | 'RAPID_BURST';

export type SimulationSpeed = 'SLOW' | 'NORMAL' | 'FAST';

export interface CrossBankCorrelationIndicator {
  sharedDevice?: string;
  sharedNetwork?: string;
  sharedMerchant?: string;
  banksInvolved: string[];
  patternTitle: string;
}

export interface SimulationEvent {
  id: string;
  bankId: SyntheticBankId;
  bankName: string;
  customerId: string;
  customerName: string;
  accountId: string;
  transactionId: string;
  amount: number;
  city: string;
  deviceId: string;
  deviceLabel: string;
  ipAddress: string;
  merchant: string;
  timestamp: string;
  attackType: SimulationAttackType;
  stepIndex: number;
  totalSteps: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'ALLOW' | 'STEP_UP_VERIFICATION' | 'BLOCK_AND_REVIEW' | 'BLOCK_AND_CREATE_CASE';
  signals: string[];
  summary: string;
  crossBankCorrelation?: CrossBankCorrelationIndicator;
}

export interface SimulationKPIs {
  eventsGenerated: number;
  fraudSignals: number;
  investigationsStarted: number;
  casesCreated: number;
  amountInterdicted: number;
}

export interface BankMetrics {
  total: number;
  normal: number;
  suspicious: number;
  critical: number;
  latestEvent?: SimulationEvent;
}
