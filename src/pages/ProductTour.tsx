import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  X,
  LayoutDashboard,
  Smartphone,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Compass,
  Building2,
  UserCheck,
  Check,
} from 'lucide-react';
import { NavigationTab } from '../components/layout/Navigation';

interface ProductTourProps {
  onNavigateTab?: (tab: NavigationTab) => void;
}

interface TourStep {
  id: number;
  badge: string;
  title: string;
  headline: string;
  description: string;
  whatToNotice: string;
  termDefinition: {
    term: string;
    definition: string;
  };
}

export const ProductTour: React.FC<ProductTourProps> = ({ onNavigateTab }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 8;

  // Interactive state for step demos
  const [selectedRiskScore, setSelectedRiskScore] = useState<number>(85);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(0);

  const steps: TourStep[] = [
    {
      id: 1,
      badge: '1. PLATFORM OVERVIEW',
      title: 'Autonomous Fraud Intelligence Platform',
      headline: 'Stop Financial Fraud Before Settlement Occurs',
      description:
        'FinGuard AI sits between banking channels and payment networks, evaluating transaction telemetry in sub-second timeframes to interdict fraudulent payments before money leaves the sender account.',
      whatToNotice:
        'FinGuard AI is non-intrusive and privacy-safe: it correlates multi-vector metadata without exposing raw private banking credentials across institutional boundaries.',
      termDefinition: {
        term: 'Telemetry',
        definition:
          'Real-time digital signals emitted during a payment (device ID, location, IP address, behavioral velocity, and payment parameters).',
      },
    },
    {
      id: 2,
      badge: '2. TRANSACTION MONITORING',
      title: 'Real-Time Telemetry Ingestion',
      headline: 'Continuous Inspection Across Every Payment Stream',
      description:
        'Every transaction from UPI, IMPS, Cards, or NetBanking is parsed instantaneously. Normal payments pass without friction, while anomalous transactions trigger immediate deep audit.',
      whatToNotice:
        'Notice how low-risk payments complete in milliseconds, while suspicious payments with proxy IPs or unfamiliar hardware are routed for step-up verification or case creation.',
      termDefinition: {
        term: 'Interdiction',
        definition:
          'Blocking or pausing a suspicious financial transaction in real time before funds settle into an adversary account.',
      },
    },
    {
      id: 3,
      badge: '3. RISK ASSESSMENT',
      title: 'Deterministic Risk Scoring & Rules Engine',
      headline: '0–100 Scale with Explainable Decision Bounds',
      description:
        'Risk scores are computed on a transparent 0 to 100 scale. Decisions are strict, deterministic, and explainable—never a black-box guess.',
      whatToNotice:
        'Scores 0–30 trigger ALLOW; 31–69 trigger STEP_UP_VERIFICATION (high-value challenge); and 70–100 trigger BLOCK_AND_CREATE_CASE.',
      termDefinition: {
        term: 'Step-Up Verification',
        definition:
          'Requiring an extra biometric or high-value authorization challenge when a transaction exceeds normal risk thresholds.',
      },
    },
    {
      id: 4,
      badge: '4. AI INVESTIGATION ENGINE',
      title: '11-Agent Parallel Audit Pipeline',
      headline: 'Autonomous Multi-Agent Deep Triage',
      description:
        'When an anomaly is detected, 11 specialized AI agents execute in parallel to audit device history, geo-velocity, mule networks, compliance, and synthetic identities simultaneously.',
      whatToNotice:
        'All 11 agents complete their cross-audit in under 500 milliseconds, producing a unified investigation summary with confidence scores.',
      termDefinition: {
        term: 'Multi-Agent Pipeline',
        definition:
          'A system of specialized AI modules, each dedicated to auditing a specific fraud vector (e.g. device hardware, location jumps, IP proxies).',
      },
    },
    {
      id: 5,
      badge: '5. FRAUD-RING INTELLIGENCE',
      title: 'Entity Graph & Syndicate Correlation',
      headline: 'Uncover Connected Fraud Rings Across Institutions',
      description:
        'Fraud syndicates operate across multiple banks using shared devices and proxy networks. FinGuard AI maps hardware and network relationships into a dynamic entity graph.',
      whatToNotice:
        'A single compromised device or proxy subnet can link multiple mule accounts across Bank Alpha, Bank Nova, and Bank Horizon.',
      termDefinition: {
        term: 'Syndicate Correlation',
        definition:
          'Linking shared device identifiers, IP subnets, and destination accounts to expose organized fraud rings operating across different banks.',
      },
    },
    {
      id: 6,
      badge: '6. SOC RESPONSE & CASE MANAGEMENT',
      title: 'Human-in-the-Loop SOC Triage',
      headline: 'Auditable Case Lifecycle & Analyst Assignment',
      description:
        'High-risk interdictions automatically generate SOC cases. Security analysts review agent findings, record investigation notes, assign identities, and resolve cases.',
      whatToNotice:
        'Cases follow a clean lifecycle: Open → Investigating → Escalated / Resolved / False Positive. Terminal outcomes require explicit analyst confirmation.',
      termDefinition: {
        term: 'Human-in-the-Loop',
        definition:
          'Designing AI systems so that human security analysts retain final decision authority over high-impact security actions.',
      },
    },
    {
      id: 7,
      badge: '7. EXPLAINABLE EVIDENCE & ANALYTICS',
      title: 'Cryptographic Audit Trail & Operations Dashboard',
      headline: 'Immutable SHA-256 Hash-Chain & Performance Metrics',
      description:
        'Every audit decision and analyst action is appended to a cryptographic SHA-256 hash-chain, guaranteeing regulatory compliance, non-repudiation, and clear executive metrics.',
      whatToNotice:
        'Executive dashboards compute real-time metrics (Blocked Value, Incident Rate, Case Distribution) only from verified underlying records.',
      termDefinition: {
        term: 'Hash-Chain Audit',
        definition:
          'Cryptographically linking audit records so any attempt to tamper with historical evidence immediately invalidates the chain.',
      },
    },
    {
      id: 8,
      badge: '8. TRY IT YOURSELF',
      title: 'Interactive Hands-On Exploration',
      headline: 'Choose Your Live Demo Experience',
      description:
        'Now that you understand FinGuard AI’s complete architecture, explore the live application modules hands-on.',
      whatToNotice:
        'Select any interactive module below to test real-time interdiction, SOC case management, or mobile payment verification.',
      termDefinition: {
        term: 'Interactive Demo',
        definition:
          'Full-featured application environments running on synthetic data, safe for risk-free testing and demonstration.',
      },
    },
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < totalSteps) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
      } else if (e.key === 'Escape') {
        handleNavigateTab('command-center');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const handleNavigateTab = (tab: NavigationTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.location.hash = tab;
    }
  };

  const activeStepObj = steps[currentStep - 1];

  // Render step-specific visual preview widgets
  const renderStepVisual = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Platform Flow Topology</span>
              <span className="text-[var(--success)] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                Live Architecture
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col items-center">
                <div className="h-9 w-9 rounded-lg bg-[#3157D5]/10 text-[#3157D5] flex items-center justify-center mb-2 font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)]">Banking Channels</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">UPI • IMPS • Cards</div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#3157D5] to-[#7C5CFC] text-white shadow-md flex flex-col items-center ring-2 ring-[#3157D5]/30">
                <div className="h-9 w-9 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2 font-bold">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="text-xs font-extrabold">FinGuard AI Core</div>
                <div className="text-[10px] text-white/80 mt-0.5">11-Agent Audit • &lt;500ms</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col items-center">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)]">Instant Interdiction</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Allow • Challenge • Block</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#3157D5] shrink-0" />
              <span>
                FinGuard AI orchestrates parallel multi-bank telemetry, risk scoring, and SOC investigation without adding friction to legitimate payments.
              </span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Sample Telemetry Ingestion Feed</span>
              <span className="badge text-[10px] font-mono bg-[#3157D5]/10 text-[#3157D5] border border-[#3157D5]/20">
                3 PREVIEW RECORDS
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Payment 1: Normal */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)]">₹2,500 · Grocery Merchant</div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">C1001 (Priya Sharma) · Recognized Device · Bengaluru</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  ALLOW (Risk 12)
                </span>
              </div>

              {/* Payment 2: Step Up */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                    !
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)]">₹45,000 · Electronics Store</div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">C1002 (Rahul Verma) · High Value Threshold · Delhi</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  VERIFY (Risk 58)
                </span>
              </div>

              {/* Payment 3: Blocked */}
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">
                    ✕
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)]">₹1,20,000 · P2P Crypto Exchange</div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">C1003 (Ananya Sen) · Proxy IP Link · Device Emulator</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                  BLOCK (Risk 92)
                </span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Interactive Risk Scale Simulator</span>
              <span className="font-mono font-bold text-sm text-[#3157D5]">
                Score: {selectedRiskScore} / 100
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={selectedRiskScore}
                onChange={(e) => setSelectedRiskScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#3157D5]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] font-bold">
                <span className="text-emerald-500">0–30: LOW</span>
                <span className="text-amber-500">31–69: MEDIUM</span>
                <span className="text-rose-500">70–100: HIGH</span>
              </div>
            </div>

            {/* Dynamic Result Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                selectedRiskScore <= 30
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : selectedRiskScore <= 69
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold uppercase">Evaluated Decision:</span>
                <span className="px-2.5 py-0.5 rounded font-mono font-black text-xs bg-[var(--surface)] shadow-xs">
                  {selectedRiskScore <= 30
                    ? 'ALLOW'
                    : selectedRiskScore <= 69
                    ? 'STEP_UP_VERIFICATION'
                    : 'BLOCK_AND_CREATE_CASE'}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {selectedRiskScore <= 30
                  ? 'Transaction passes clean risk checks and is authorized immediately.'
                  : selectedRiskScore <= 69
                  ? 'Transaction requires biometric or OTP verification before proceeding.'
                  : 'High-risk transaction is blocked instantly and triggers an active SOC investigation case.'}
              </p>
            </div>
          </div>
        );

      case 4:
        const agentNames = [
          'Device Fingerprint Agent',
          'Geo-Velocity Agent',
          'Mule Network Agent',
          'Behavioral Pattern Agent',
          'Counterparty Risk Agent',
          'Synthetic Identity Agent',
          'IP Proxy & VPN Agent',
          'Account Limit Agent',
          'Step-Up Compliance Agent',
          'Audit Trail Agent',
          'Executive Summary Agent',
        ];

        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>11-Agent Parallel Investigation Matrix</span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                Click agent to inspect function
              </span>
            </div>

            {/* Grid of 11 agents */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {agentNames.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setActiveAgentIndex(idx)}
                  className={`p-2 rounded-lg border text-left text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeAgentIndex === idx
                      ? 'bg-[#3157D5] text-white border-[#3157D5] shadow-sm'
                      : 'bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span className="text-[9px] opacity-70">#{idx + 1}</span>
                  <span className="truncate">{name.replace(' Agent', '')}</span>
                </button>
              ))}
            </div>

            {/* Agent Detail Callout */}
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs space-y-1">
              <div className="font-bold text-[#3157D5] flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                <span>Agent #{activeAgentIndex + 1}: {agentNames[activeAgentIndex]}</span>
              </div>
              <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                Audits telemetry in parallel, evaluating risk signals against historical profiles and issuing structured evidence snippets for human analyst review.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Cross-Institution Syndicate Preview</span>
              <span className="badge text-[10px] font-mono bg-purple-500/10 text-purple-600 border border-purple-500/20">
                3 BANKS LINKED
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
                <span className="text-[#3157D5]">SHARED HARDWARE: DEV-RING-DEVICE-01</span>
                <span className="text-rose-500">3 Accounts</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[var(--text-secondary)] pt-1">
                <div className="flex items-center justify-between">
                  <span>├── Bank Alpha (Bengaluru)</span>
                  <span className="font-bold text-[var(--text-primary)]">C1003 · ₹75,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>├── Bank Nova (Mumbai)</span>
                  <span className="font-bold text-[var(--text-primary)]">C1088 · ₹72,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>└── Bank Horizon (Delhi)</span>
                  <span className="font-bold text-[var(--text-primary)]">C1094 · ₹68,000</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Syndicate detection operates over encrypted hardware and network fingerprints, enabling cross-institution correlation without breaching customer data privacy laws.
            </p>
          </div>
        );

      case 6:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>SOC Case Management Preview</span>
              <span className="badge text-[10px] font-mono bg-amber-500/10 text-amber-600 border border-amber-500/20">
                CASE-2026-8802
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Account Takeover · High Risk</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Customer C1003 · ₹85,000 UPI Transfer</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  INVESTIGATING
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)] block text-[9px]">ASSIGNEE:</span>
                  <span className="font-bold text-[var(--text-primary)]">Arjun Verma (Tier 3)</span>
                </div>
                <div className="p-2 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)] block text-[9px]">ACTION REQUIRED:</span>
                  <span className="font-bold text-[var(--primary)]">Confirm Outcome</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Audit Trail & Cryptographic Evidence</span>
              <span className="text-emerald-500 text-[10px] font-mono font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> VERIFIED HASH-CHAIN
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs font-mono">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase">Latest Appended Audit Block:</div>
              <div className="p-2 rounded bg-black/5 dark:bg-black/30 border border-[var(--border)] text-[11px] text-[#3157D5] truncate font-bold">
                SHA-256: 7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b2c3d4e
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                <span>Sequence #1428</span>
                <span>Timestamp: {new Date().toISOString().split('T')[0]} 08:30 UTC</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[9px] text-[var(--text-secondary)] uppercase">Blocked Value</div>
                <div className="font-bold text-[var(--success)] font-mono">₹1,35,000</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[9px] text-[var(--text-secondary)] uppercase">Interdiction Rate</div>
                <div className="font-bold text-[#3157D5] font-mono">99.4%</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[9px] text-[var(--text-secondary)] uppercase">Avg Triage Time</div>
                <div className="font-bold text-amber-500 font-mono">4.2m</div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Select Your Interactive Module
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleNavigateTab('simulation')}
                className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[#3157D5] hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-8 w-8 rounded-lg bg-[#3157D5]/10 text-[#3157D5] flex items-center justify-center mb-2 font-bold group-hover:bg-[#3157D5] group-hover:text-white transition-colors">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Multi-Bank Simulation</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">Watch streaming inter-bank attacks live.</div>
                </div>
                <div className="mt-3 text-[11px] font-bold text-[#3157D5] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Launch Simulation</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>

              <button
                onClick={() => handleNavigateTab('command-center')}
                className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-purple-500 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2 font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">SOC Command Center</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">Triage alerts, assign cases & review metrics.</div>
                </div>
                <div className="mt-3 text-[11px] font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Cockpit</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>

              <button
                onClick={() => handleNavigateTab('device')}
                className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Banking Emulator</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">Test UPI payments & verification challenges.</div>
                </div>
                <div className="mt-3 text-[11px] font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Mobile Banking</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col justify-between space-y-6 max-w-5xl mx-auto py-2">
      {/* ─── TOP HEADER & STEP NAVIGATION BAR ───────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs p-4 sm:p-6 space-y-4">
        {/* Top Control Strip */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3157D5] to-[#7C5CFC] text-white shadow-md">
              <Compass className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#3157D5] dark:text-[#22D3EE] flex items-center gap-2">
                <span>Guided Product Walkthrough</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-[#3157D5]/10 border border-[#3157D5]/20 font-bold">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {activeStepObj.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigateTab('command-center')}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exit walkthrough and open platform"
            >
              <span>Exit Tour</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar & Dots */}
        <div className="space-y-2">
          {/* Progress Segment Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-[#3157D5] via-[#22D3EE] to-[#7C5CFC] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {/* Stepper Pill Selector */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentStep === step.id
                    ? 'bg-[#3157D5] text-white shadow-xs'
                    : currentStep > step.id
                    ? 'bg-[var(--surface-muted)] text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
              >
                Step {step.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN STEP CONTENT & INTERACTIVE PREVIEW ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (6 Cols): Concept Narrative & Key Notice */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs p-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3157D5]/10 border border-[#3157D5]/20 text-[#3157D5] dark:text-[#22D3EE] font-mono text-[11px] font-bold">
              <span>{activeStepObj.badge}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              {activeStepObj.headline}
            </h2>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {activeStepObj.description}
            </p>

            {/* What to Notice Callout Box */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                <Info className="h-4 w-4 shrink-0" />
                <span>What to Notice at this Step:</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {activeStepObj.whatToNotice}
              </p>
            </div>

            {/* Technical Term Definition Box */}
            <div className="p-3.5 rounded-xl bg-[#3157D5]/5 border border-[#3157D5]/20 text-xs space-y-1">
              <div className="font-bold text-[#3157D5] dark:text-[#22D3EE] flex items-center gap-1.5">
                <Layers className="h-4 w-4 shrink-0" />
                <span>Key Term: {activeStepObj.termDefinition.term}</span>
              </div>
              <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                {activeStepObj.termDefinition.definition}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (6 Cols): Visual Preview Widget */}
        <div className="lg:col-span-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs p-6 space-y-4">
            {renderStepVisual()}
          </div>
        </div>
      </div>

      {/* ─── FOOTER STEPPER CONTROLS ───────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs p-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="text-xs font-mono text-[var(--text-secondary)] hidden sm:block">
          Use <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-[10px]">→</kbd> arrow keys to navigate steps
        </div>

        {currentStep < totalSteps ? (
          <button
            onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3157D5] via-[#4F46E5] to-[#7C5CFC] text-white text-xs font-bold shadow-md shadow-[#3157D5]/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => handleNavigateTab('simulation')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Launch Multi-Bank Simulation</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductTour;
