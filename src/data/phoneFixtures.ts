import { SyntheticBankId } from '../types/simulation';
import { Customer, Account, TransactionType } from '../types';
import { SYNTHETIC_CUSTOMERS, SYNTHETIC_ACCOUNTS } from './scenarios';
import { SYNTHETIC_MERCHANTS } from './merchants';

export type PhoneProfileKey = 'ALPHA' | 'NOVA' | 'HORIZON' | 'ATTACKER';

export interface DemoIdentity {
  customerId: string;
  name: string;
  bankId: SyntheticBankId;
  bankName: string;
  accountId: string;
  maskedAccount: string;
  role: 'CUSTOMER' | 'ATTACKER';
  themeColor: string;
  accentBg: string;
  borderColor: string;
  defaultCity: string;
  balance: number;
  subtitle: string;
  defaultCautionLimit: number;
  defaultMaxLimit: number;
  customer: Customer;
  account: Account;
}

export const DEMO_IDENTITIES: Record<string, DemoIdentity> = {
  C1001: {
    customerId: 'C1001',
    name: 'Priya Sharma',
    bankId: 'ALPHA',
    bankName: 'Bank Alpha',
    accountId: 'ACC-1001-SAL',
    maskedAccount: 'HDFC •••• 4729',
    role: 'CUSTOMER',
    themeColor: '#3157D5',
    accentBg: 'rgba(49, 87, 213, 0.08)',
    borderColor: 'rgba(49, 87, 213, 0.3)',
    defaultCity: 'Bengaluru',
    balance: 142500,
    subtitle: 'Private Wealth & Corporate Banking',
    defaultCautionLimit: 10000,
    defaultMaxLimit: 50000,
    customer: SYNTHETIC_CUSTOMERS.C1001,
    account: SYNTHETIC_ACCOUNTS['ACC-1001-SAL'],
  },
  C1002: {
    customerId: 'C1002',
    name: 'Rohan Mehta',
    bankId: 'NOVA',
    bankName: 'Bank Nova',
    accountId: 'ACC-1002-SAV',
    maskedAccount: 'ICICI •••• 2635',
    role: 'CUSTOMER',
    themeColor: '#6C63D9',
    accentBg: 'rgba(108, 99, 217, 0.08)',
    borderColor: 'rgba(108, 99, 217, 0.3)',
    defaultCity: 'Delhi',
    balance: 89400,
    subtitle: 'High-Volume Digital Payment Services',
    defaultCautionLimit: 10000,
    defaultMaxLimit: 50000,
    customer: SYNTHETIC_CUSTOMERS.C1002,
    account: SYNTHETIC_ACCOUNTS['ACC-1002-SAV'],
  },
  C1008: {
    customerId: 'C1008',
    name: 'Neha Kapoor',
    bankId: 'HORIZON',
    bankName: 'Bank Horizon',
    accountId: 'ACC-1008-SAV',
    maskedAccount: 'PNB •••• 8374',
    role: 'CUSTOMER',
    themeColor: '#159A9C',
    accentBg: 'rgba(21, 154, 156, 0.08)',
    borderColor: 'rgba(21, 154, 156, 0.3)',
    defaultCity: 'Chandigarh',
    balance: 45000,
    subtitle: 'Commercial & Cross-Border Retail',
    defaultCautionLimit: 10000,
    defaultMaxLimit: 50000,
    customer: SYNTHETIC_CUSTOMERS.C1008,
    account: SYNTHETIC_ACCOUNTS['ACC-1008-SAV'],
  },
  C1003: {
    customerId: 'C1003',
    name: 'Attacker Demo',
    bankId: 'ALPHA',
    bankName: 'Bank Alpha (Target)',
    accountId: 'ACC-1003-SAV',
    maskedAccount: 'AXIS •••• 3019',
    role: 'ATTACKER',
    themeColor: '#C43D4B',
    accentBg: 'rgba(196, 61, 75, 0.1)',
    borderColor: 'rgba(196, 61, 75, 0.35)',
    defaultCity: 'Mumbai',
    balance: 124000,
    subtitle: 'Adversarial Telemetry & Fraud Test Account',
    defaultCautionLimit: 10000,
    defaultMaxLimit: 50000,
    customer: SYNTHETIC_CUSTOMERS.C1003,
    account: SYNTHETIC_ACCOUNTS['ACC-1003-SAV'],
  },
};

export interface PhoneProfileConfig {
  key: PhoneProfileKey;
  label: string;
  bankId: SyntheticBankId | null;
  bankName: string;
  role: 'CUSTOMER' | 'ATTACKER';
  themeColor: string;
  accentBg: string;
  borderColor: string;
  customer: Customer;
  account: Account;
  maskedAccount: string;
  defaultCity: string;
  deviceLabel: string;
  tagline: string;
}

export const PHONE_PROFILES: Record<PhoneProfileKey, PhoneProfileConfig> = {
  ALPHA: {
    key: 'ALPHA',
    label: 'Phone 1 • Alpha',
    bankId: 'ALPHA',
    bankName: 'Bank Alpha',
    role: 'CUSTOMER',
    themeColor: '#3157D5',
    accentBg: 'rgba(49, 87, 213, 0.08)',
    borderColor: 'rgba(49, 87, 213, 0.3)',
    customer: SYNTHETIC_CUSTOMERS.C1001,
    account: SYNTHETIC_ACCOUNTS['ACC-1001-SAL'],
    maskedAccount: 'HDFC •••• 4729',
    defaultCity: 'Bengaluru',
    deviceLabel: 'Priya’s Pixel 8 (Authorized)',
    tagline: 'Private Wealth & Corporate Banking',
  },
  NOVA: {
    key: 'NOVA',
    label: 'Phone 2 • Nova',
    bankId: 'NOVA',
    bankName: 'Bank Nova',
    role: 'CUSTOMER',
    themeColor: '#6C63D9',
    accentBg: 'rgba(108, 99, 217, 0.08)',
    borderColor: 'rgba(108, 99, 217, 0.3)',
    customer: SYNTHETIC_CUSTOMERS.C1002,
    account: SYNTHETIC_ACCOUNTS['ACC-1002-SAV'],
    maskedAccount: 'ICICI •••• 2635',
    defaultCity: 'Delhi',
    deviceLabel: 'Rohan’s Galaxy S24 (Authorized)',
    tagline: 'High-Volume Digital Payment Services',
  },
  HORIZON: {
    key: 'HORIZON',
    label: 'Phone 3 • Horizon',
    bankId: 'HORIZON',
    bankName: 'Bank Horizon',
    role: 'CUSTOMER',
    themeColor: '#159A9C',
    accentBg: 'rgba(21, 154, 156, 0.08)',
    borderColor: 'rgba(21, 154, 156, 0.3)',
    customer: SYNTHETIC_CUSTOMERS.C1008,
    account: SYNTHETIC_ACCOUNTS['ACC-1008-SAV'],
    maskedAccount: 'PNB •••• 8374',
    defaultCity: 'Chandigarh',
    deviceLabel: 'Neha’s iPhone 15 (Authorized)',
    tagline: 'Commercial & Cross-Border Retail',
  },
  ATTACKER: {
    key: 'ATTACKER',
    label: 'Phone 4 • Attacker',
    bankId: 'ALPHA', // Target institution
    bankName: 'Bank Alpha (Target)',
    role: 'ATTACKER',
    themeColor: '#C43D4B',
    accentBg: 'rgba(196, 61, 75, 0.1)',
    borderColor: 'rgba(196, 61, 75, 0.35)',
    customer: SYNTHETIC_CUSTOMERS.C1003, // Vikram Malhotra (compromised credential target)
    account: SYNTHETIC_ACCOUNTS['ACC-1003-SAV'],
    maskedAccount: 'AXIS •••• 3019',
    defaultCity: 'Mumbai',
    deviceLabel: 'Kali Linux Root Emulator DEV-1003-ROGUE',
    tagline: 'Adversarial Telemetry & ATO Infiltration',
  },
};

export interface QuickPreset {
  id: string;
  name: string;
  label: string;
  amount: number;
  merchantKey: string;
  transactionType: TransactionType;
  city?: string;
  description: string;
  pillColor: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'NORMAL',
    name: 'Normal',
    label: '₹1,500',
    amount: 1500,
    merchantKey: 'MERCH_01', // FreshMart Supermarket
    transactionType: 'UPI',
    description: 'Everyday grocery baseline purchase',
    pillColor: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5',
  },
  {
    id: 'CAUTION',
    name: 'Caution',
    label: '₹25,000',
    amount: 25000,
    merchantKey: 'MERCH_02', // Apex Electronics Hub
    transactionType: 'CARD',
    city: 'Delhi',
    description: 'High-value electronics deviation',
    pillColor: 'border-amber-500/30 text-amber-600 bg-amber-500/5',
  },
  {
    id: 'HIGH',
    name: 'High',
    label: '₹50,000',
    amount: 50000,
    merchantKey: 'MERCH_09', // Global Play Gaming Lounge
    transactionType: 'NET_BANKING',
    city: 'Goa',
    description: 'Out-of-pattern gaming & entertainment',
    pillColor: 'border-orange-500/30 text-orange-600 bg-orange-500/5',
  },
  {
    id: 'CRITICAL',
    name: 'Critical Demo',
    label: '₹85,000',
    amount: 85000,
    merchantKey: 'MERCH_03', // Luxury Jewels & Bullion
    transactionType: 'NET_BANKING',
    city: 'Mumbai',
    description: 'High-ticket bullion liquidation (Scenario C Hero)',
    pillColor: 'border-rose-500/30 text-rose-600 bg-rose-500/5',
  },
  {
    id: 'RING',
    name: 'Ring Strike',
    label: '₹72,000',
    amount: 72000,
    merchantKey: 'MERCH_06', // PeerTrade P2P Crypto Exchange
    transactionType: 'IMPS',
    city: 'Pune',
    description: 'Syndicated crypto exit attempt',
    pillColor: 'border-purple-500/30 text-purple-600 bg-purple-500/5',
  },
];

export const DEMO_MERCHANTS = Object.values(SYNTHETIC_MERCHANTS);
