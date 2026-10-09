/**
 * FinGuard AI — Demo Analyst Identities & Resolution Reason Specifications
 * Phase 10: Auditable SOC Case Management
 * 
 * Note: These identities represent simulated SOC workstation roles for hackathon
 * review. They do not constitute secure backend authentication or server-side authorization.
 */

export interface DemoAnalyst {
  id: string;
  name: string;
  role: string;
  email: string;
  badge: string;
  avatarColor: string;
}

export const DEMO_ANALYSTS: DemoAnalyst[] = [
  {
    id: 'ANALYST-LEAD-01',
    name: 'Arjun Verma',
    role: 'Lead SOC Investigator',
    email: 'arjun.verma@finguard.internal',
    badge: 'Tier 3 Lead',
    avatarColor: '#3157D5',
  },
  {
    id: 'ANALYST-TIER2-02',
    name: 'Deepa Nair',
    role: 'Senior Fraud Analyst',
    email: 'deepa.nair@finguard.internal',
    badge: 'Tier 2 Senior',
    avatarColor: '#6C63D9',
  },
  {
    id: 'ANALYST-TIER1-03',
    name: 'Kavita Rao',
    role: 'Triage Specialist',
    email: 'kavita.rao@finguard.internal',
    badge: 'Tier 1 Triage',
    avatarColor: '#159A9C',
  },
  {
    id: 'ANALYST-CYBER-04',
    name: 'Zubair Khan',
    role: 'Threat Intelligence Analyst',
    email: 'zubair.khan@finguard.internal',
    badge: 'Threat Intel',
    avatarColor: '#D95C62',
  },
];

export interface ResolutionReasonDef {
  id: string;
  label: string;
  category: 'CONFIRMED_FRAUD' | 'MARKED_LEGITIMATE' | 'INCONCLUSIVE';
  description: string;
}

export const RESOLUTION_REASONS: ResolutionReasonDef[] = [
  {
    id: 'CONFIRMED_ATO',
    label: 'Confirmed Account Takeover (Rogue Device/IP)',
    category: 'CONFIRMED_FRAUD',
    description: 'Autonomous risk score verified; rogue emulator and proxy IP confirmed unauthorized by cardholder.',
  },
  {
    id: 'CONFIRMED_MULE_RING',
    label: 'Coordinated Mule / Fraud Ring Syndicate',
    category: 'CONFIRMED_FRAUD',
    description: 'Shared hardware fingerprint and rapid cross-account velocity confirm syndicate money laundering.',
  },
  {
    id: 'UNAUTHORIZED_ACCESS',
    label: 'Unauthorized Third-Party Credential Compromise',
    category: 'CONFIRMED_FRAUD',
    description: 'Credential stuffing attack followed by high-value diversion.',
  },
  {
    id: 'LEGITIMATE_TRAVEL',
    label: 'Legitimate Customer Travel / Geographic Mobility',
    category: 'MARKED_LEGITIMATE',
    description: 'Customer was verified travelling. Out-of-band communication confirms payment authenticity.',
  },
  {
    id: 'CUSTOMER_CONFIRMED_TXN',
    label: 'Customer Confirmed Authentic Via Out-of-Band Auth',
    category: 'MARKED_LEGITIMATE',
    description: 'Customer completed interactive step-up verification and confirmed genuine purchase intent.',
  },
  {
    id: 'NEW_DEVICE_AUTHENTICATED',
    label: 'New Device Authenticated by Genuine Cardholder',
    category: 'MARKED_LEGITIMATE',
    description: 'Primary customer registered replacement hardware terminal via biometric passkey.',
  },
  {
    id: 'INCONCLUSIVE_ESCALATED',
    label: 'Inconclusive Telemetry — Escalated to Legal / AML',
    category: 'INCONCLUSIVE',
    description: 'Uncertain biometric fidelity requiring formal dispute ledger filing.',
  },
];
