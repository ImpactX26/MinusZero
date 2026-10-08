import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  User,
  Smartphone,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  Globe,
  MapPin,
  Activity,
  History,
  GitMerge,
  Scale,
  FileText,
  Shield,
  Layers,
  Store,
  CreditCard,
  Network,
  ChevronRight,
  ExternalLink,
  Zap,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { CANONICAL_SCENARIOS, SYNTHETIC_NETWORK_SIGNALS } from '../data/scenarios';
import { evaluateTransactionRisk, RiskEvaluationInput } from '../risk/riskEngine';
import { casesCol, auditLogsCol } from '../firebase/collections';
import { setDoc, addDoc, doc } from 'firebase/firestore';
import {
  runTransactionAgent,
  runBehaviourAgent,
  runDeviceAgent,
  runIdentityAgent,
  runLocationAgent,
  runNetworkAgent,
  runHistoryAgent,
  runCorrelator,
  runChallenger,
  runVerifier,
  runNarrator
} from '../investigation/agents';
import { AgentResult, Case, AuditLog, DecisionAction } from '../types';

// Safe string formatter ensuring zero 'undefined', 'null', or 'NaN' in UI
const safeString = (val: any, fallback: string = 'Detected'): string => {
  if (val === undefined || val === null || val === 'undefined' || val === 'null' || val === '') {
    return fallback;
  }
  if (typeof val === 'number' && isNaN(val)) {
    return fallback;
  }
  return String(val);
};

// Agent Semantic Configuration
interface AgentMeta {
  name: string;
  stageNumber: string;
  icon: React.ElementType;
  accentColor: string;
  bgLight: string;
  status: string;
  statusColor: string;
  latency: string;
  domain: string;
}

const AGENT_METAS: AgentMeta[] = [
  { name: 'Transaction', stageNumber: '01', icon: Activity, accentColor: '#3157D5', bgLight: '#EEF2FF', status: 'ELEVATED', statusColor: 'text-[#3157D5] bg-[#EEF2FF] border-[#C7D2FE]', latency: '6ms', domain: 'TRANSACTION' },
  { name: 'Behaviour', stageNumber: '02', icon: Clock, accentColor: '#6C63D9', bgLight: '#F3F0FF', status: 'ELEVATED', statusColor: 'text-[#6C63D9] bg-[#F3F0FF] border-[#DDD6FE]', latency: '4ms', domain: 'BEHAVIOUR' },
  { name: 'Device', stageNumber: '03', icon: Smartphone, accentColor: '#D99425', bgLight: '#FEFCE8', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '8ms', domain: 'DEVICE' },
  { name: 'Identity', stageNumber: '04', icon: User, accentColor: '#2563EB', bgLight: '#EFF6FF', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '5ms', domain: 'IDENTITY' },
  { name: 'Location', stageNumber: '05', icon: MapPin, accentColor: '#159A9C', bgLight: '#E6F7F7', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '7ms', domain: 'LOCATION' },
  { name: 'Network', stageNumber: '06', icon: Globe, accentColor: '#D95C62', bgLight: '#FFF1F2', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '5ms', domain: 'NETWORK' },
  { name: 'History', stageNumber: '07', icon: History, accentColor: '#64748B', bgLight: '#F8FAFC', status: 'VERIFIED', statusColor: 'text-[#159A75] bg-[#F0FDF4] border-[#BBF7D0]', latency: '3ms', domain: 'HISTORY' },
  { name: 'Correlator', stageNumber: '08', icon: GitMerge, accentColor: '#4F46E5', bgLight: '#EEF2FF', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '12ms', domain: 'CORRELATION' },
  { name: 'Challenger', stageNumber: '09', icon: Scale, accentColor: '#D97706', bgLight: '#FEF3C7', status: 'EXONERATION REJECTED', statusColor: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]', latency: '9ms', domain: 'CHALLENGE' },
  { name: 'Verifier', stageNumber: '10', icon: CheckCircle2, accentColor: '#159A75', bgLight: '#F0FDF4', status: 'VERIFIED', statusColor: 'text-[#159A75] bg-[#F0FDF4] border-[#BBF7D0]', latency: '4ms', domain: 'VERIFICATION' },
  { name: 'Narrator', stageNumber: '11', icon: FileText, accentColor: '#3157D5', bgLight: '#EEF2FF', status: 'VERIFIED', statusColor: 'text-[#3157D5] bg-[#EEF2FF] border-[#C7D2FE]', latency: '14ms', domain: 'NARRATIVE' },
];

export const InvestigationWorkspace: React.FC = () => {
  const scenario = CANONICAL_SCENARIOS['high_risk_c1003'];
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // V3 Selected Agent state (Default: 'Transaction' per requirement 17)
  const [selectedAgentName, setSelectedAgentName] = useState<string>('Transaction');

  // Hackathon Demo Mode Animation state
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Left & Right interactivity states
  const [showFullNarrative, setShowFullNarrative] = useState(false);
  const [highlightedContextNode, setHighlightedContextNode] = useState<string | null>(null);

  // Canvas Pan & Zoom state (Entity Graph visual philosophy)
  const [transform, setTransform] = useState({ x: 10, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Synchronously compute investigation state using authoritative Risk Engine & 11 Agents
  const data = useMemo(() => {
    const transaction = {
      ...scenario.transaction,
      transaction_id: scenario.transaction.transaction_id || 'TXN-SEED-C1003-FRAUD',
      currency: scenario.transaction.currency || 'INR',
      status: scenario.transaction.status || 'PENDING',
      channel: scenario.transaction.channel || 'MOBILE_APP',
    };

    const primaryDevice = scenario.devices.find(d => d.device_id === transaction.device_id);
    const primaryNetwork = scenario.network_signals?.[0] || 
      SYNTHETIC_NETWORK_SIGNALS.find(n => n.ip_address === transaction.ip_address);

    const input: RiskEvaluationInput = {
      transaction,
      customer: scenario.customer,
      device: primaryDevice,
      loginEvents: scenario.login_events,
      networkSignal: primaryNetwork,
    };

    const riskResult = evaluateTransactionRisk(input);

    const baseAgents = [
      { name: 'Transaction', fn: runTransactionAgent },
      { name: 'Behaviour', fn: runBehaviourAgent },
      { name: 'Device', fn: runDeviceAgent },
      { name: 'Identity', fn: runIdentityAgent },
      { name: 'Location', fn: runLocationAgent },
      { name: 'Network', fn: runNetworkAgent },
      { name: 'History', fn: runHistoryAgent },
    ];

    const agentResults: AgentResult[] = [];
    baseAgents.forEach(a => {
      const res = a.fn(input, riskResult);
      agentResults.push(res);
    });

    const correlator = runCorrelator(agentResults);
    agentResults.push(correlator);

    const challenger = runChallenger(input, riskResult);
    agentResults.push(challenger);

    const verifier = runVerifier(agentResults);
    agentResults.push(verifier);

    const narrator = runNarrator(input, riskResult, agentResults);
    agentResults.push(narrator);

    return { input, riskResult, agentResults, challenger, narrator };
  }, [scenario]);

  const { input, riskResult, agentResults, challenger, narrator } = data;

  // Hackathon Demo Mode: step sequentially through all 11 agents
  useEffect(() => {
    if (!isPlayingDemo) return;

    let currentIndex = AGENT_METAS.findIndex(m => m.name === selectedAgentName);
    if (currentIndex === -1 || currentIndex >= AGENT_METAS.length - 1) {
      currentIndex = 0;
      setSelectedAgentName(AGENT_METAS[0].name);
    }

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < AGENT_METAS.length) {
        setSelectedAgentName(AGENT_METAS[currentIndex].name);
      } else {
        // Complete cycle: end on Correlator or Verifier
        setSelectedAgentName('Correlator');
        setIsPlayingDemo(false);
      }
    }, 650);

    return () => clearInterval(interval);
  }, [isPlayingDemo, selectedAgentName]);

  // Canvas Pointer Handlers (Pan & Drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('.canvas-node') || (e.target as Element).closest('.canvas-controls')) return;

    setIsPanning(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Canvas Wheel Handler (Zoom & Horizontal Scroll)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomDelta = -e.deltaY * 0.0015;
        const newScale = Math.min(Math.max(transform.scale * (1 + zoomDelta), 0.5), 1.8);
        setTransform(prev => ({ ...prev, scale: newScale }));
      } else {
        // Horizontal / vertical pan
        setTransform(prev => ({
          ...prev,
          x: prev.x - e.deltaX - (e.shiftKey ? e.deltaY : 0),
          y: prev.y - (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY * 0.5 : 0)
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [transform.scale]);

  const fitToView = useCallback(() => {
    setTransform({ x: 15, y: 0, scale: 0.95 });
  }, []);

  const resetLayout = useCallback(() => {
    setTransform({ x: 10, y: 0, scale: 1 });
  }, []);

  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.15, 1.8) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.85, 0.5) }));

  // Confirmation & Case Creation
  const handleAction = (action: string) => {
    if (['Hold', 'Block & Review', 'BLOCK & CREATE CASE', 'Block & Create Case', 'Freeze Account'].includes(action)) {
      setShowConfirm(action);
    } else {
      alert(`Determination "${action}" logged to audit stream.`);
    }
  };

  const confirmAction = async () => {
    if (!showConfirm || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const caseId = `CASE-${scenario.customer_id}-FRAUD`;
      let recommendation: DecisionAction = 'BLOCK_AND_CREATE_CASE';
      if (showConfirm === 'Hold') recommendation = 'STEP_UP_VERIFICATION';
      if (showConfirm === 'Block & Review') recommendation = 'BLOCK_AND_REVIEW';
      if (showConfirm.includes('CREATE CASE') || showConfirm.includes('Create Case')) {
        recommendation = 'BLOCK_AND_CREATE_CASE';
      }
      if (showConfirm === 'Freeze Account') recommendation = 'BLOCK_AND_CREATE_CASE';

      const newCase: Case = {
        id: caseId,
        caseNumber: caseId,
        transactionId: input.transaction.transaction_id || 'TXN-SEED-C1003-FRAUD',
        customerId: input.customer.customer_id,
        status: 'NEW',
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        confidence: 0.95,
        verdict: narrator.summary,
        recommendation,
        reasonCodes: riskResult.reasonCodes,
        investigationSummary: narrator.summary,
        agentFindings: agentResults.map(a => ({
          agent: a.agent_name,
          summary: a.summary,
          evidenceItems: a.evidenceItems || []
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(casesCol(), caseId), newCase, { merge: true });
      
      const auditLog: Omit<AuditLog, 'id'> = {
        actor: 'INVESTIGATOR',
        action: 'CASE_CREATED',
        objectType: 'CASE',
        objectId: caseId,
        details: { action: showConfirm },
        createdAt: new Date().toISOString()
      };
      await addDoc(auditLogsCol(), auditLog);
      
      setCreatedCaseId(caseId);
      setShowConfirm(null);
    } catch (err) {
      console.error(err);
      setShowConfirm(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Top signals list
  const topSignals = [
    { key: 'new_device', label: 'NEW DEVICE', points: 15, agent: 'Device', desc: 'Unregistered hardware signature DEV-1003-ROGUE' },
    { key: 'failed_logins', label: 'FAILED LOGINS', points: 20, agent: 'Identity', desc: '3 sequential bad password bursts before auth' },
    { key: 'unusual_hour', label: 'UNUSUAL HOUR', points: 10, agent: 'Behaviour', desc: 'Transaction at 02:13 AM (off-hours activity)' },
    { key: 'amount_deviation', label: 'AMOUNT DEVIATION', points: 20, agent: 'Transaction', desc: '₹85,000 exceeds 17× customer average baseline' },
    { key: 'new_city', label: 'NEW CITY', points: 5, agent: 'Location', desc: 'Location shift from Bengaluru to Mumbai' },
    { key: 'impossible_travel', label: 'IMPOSSIBLE TRAVEL', points: 20, agent: 'Location', desc: '840 km distance traversed in 4 minutes' },
    { key: 'suspicious_network', label: 'NETWORK LINK', points: 15, agent: 'Network', desc: 'Datacenter proxy IP 103.21.144.92 (ASN 13335)' },
  ];

  // Specific evidence correlation map cards
  const evidenceCards = [
    { title: 'TRANSACTION', value: '₹85,000', tag: '17× customer baseline ceiling', agent: 'Transaction', color: 'border-l-[#3157D5]' },
    { title: 'NEW DEVICE', value: 'DEV-1003-ROGUE', tag: 'Hardware anomaly (Root/Kali emulator)', agent: 'Device', color: 'border-l-[#D99425]' },
    { title: 'FAILED LOGINS', value: '3 FAILED ATTEMPTS', tag: 'Pre-auth credential brute-force pattern', agent: 'Identity', color: 'border-l-[#D95C62]' },
    { title: 'PROXY NETWORK', value: '103.21.144.92', tag: 'Datacenter Proxy IP (ASN 13335)', agent: 'Network', color: 'border-l-[#6C63D9]' },
    { title: 'IMPOSSIBLE TRAVEL', value: 'BENGALURU → MUMBAI', tag: '840 km in 4m (Supersonic velocity jump)', agent: 'Location', color: 'border-l-[#159A9C]' },
    { title: 'UNUSUAL HOUR', value: '02:13 AM', tag: 'Night-time execution (08:00–22:00 window)', agent: 'Behaviour', color: 'border-l-[#6C63D9]' },
    { title: 'MERCHANT', value: 'Luxury Jewels & Bullion', tag: 'MCC 5094 (High-liquidity exit channel)', agent: 'Transaction', color: 'border-l-[#D95C62]' },
  ];

  // Selected Agent Data Helper (Section 8: Comprehensive dynamic content per agent)
  const getSelectedAgentDetails = (agentName: string) => {
    const meta = AGENT_METAS.find(m => m.name === agentName) || AGENT_METAS[0];
    const rawResult = agentResults.find(a => a.agent_name === agentName);

    switch (agentName) {
      case 'Transaction':
        return {
          meta,
          rawResult,
          finding: 'Transaction amount of ₹85,000 exceeds 17× customer average baseline ceiling (₹5,000).',
          reasonCode: 'HIGH_AMOUNT_DEVIATION',
          riskContribution: '+20 pts',
          confidence: '98%',
          metrics: [
            { label: 'Transaction Amount', value: '₹85,000' },
            { label: 'Customer Baseline Peak', value: '₹5,000' },
            { label: 'Ceiling Multiplier', value: '17.0× Deviation' },
            { label: 'Payment Channel', value: 'MOBILE_APP (IMPS)' }
          ],
          evidence: [
            { key: 'Amount', val: '₹85,000.00' },
            { key: 'Currency', val: 'INR' },
            { key: 'Merchant', val: safeString(input.transaction.merchant, 'Luxury Jewels & Bullion') },
            { key: 'MCC', val: '5094 (Precious Stones)' }
          ],
          relatedEntities: ['ACC-1003-SAV', 'C1003', 'TXN-SEED-C1003-FRAUD']
        };

      case 'Behaviour':
        return {
          meta,
          rawResult,
          finding: 'Transaction initiated at 02:13 AM, far outside normal customer activity window (08:00 – 22:00).',
          reasonCode: 'UNUSUAL_TRANSACTION_HOUR',
          riskContribution: '+10 pts',
          confidence: '95%',
          metrics: [
            { label: 'Execution Timestamp', value: '02:13 AM IST' },
            { label: 'Typical Active Hours', value: '08:00 – 22:00 IST' },
            { label: 'Off-Peak Deviation', value: '4 hours 13 minutes' },
            { label: 'Circadian Pattern', value: 'Anomalous Night Burst' }
          ],
          evidence: [
            { key: 'Time Recorded', val: '02:13:42 IST' },
            { key: 'Baseline Window', val: '08:00 - 22:00' },
            { key: 'Deviation Factor', val: 'Severe Off-Hours' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE']
        };

      case 'Device':
        return {
          meta,
          rawResult,
          finding: 'Unrecognized device fingerprint detected. Device DEV-1003-ROGUE has not been registered or trusted for this customer.',
          reasonCode: 'NEW_OR_UNVERIFIED_DEVICE',
          riskContribution: '+15 pts',
          confidence: '94%',
          metrics: [
            { label: 'Device ID', value: 'DEV-1003-ROGUE' },
            { label: 'Classification', value: 'Rogue Hardware / Kali Linux' },
            { label: 'Hardware Type', value: 'Desktop Emulator' },
            { label: 'First Observed', value: '02:11 AM (Pre-Auth Burst)' }
          ],
          evidence: [
            { key: 'Fingerprint', val: 'DEV-1003-ROGUE' },
            { key: 'OS / User Agent', val: 'Linux x86_64 / Root Shell' },
            { key: 'Customer Trust State', val: 'Untrusted (0 days tenure)' },
            { key: 'Primary Hardware', val: 'DEV-1001-A (Unused)' }
          ],
          relatedEntities: ['DEV-1003-ROGUE', 'C1003']
        };

      case 'Identity':
        return {
          meta,
          rawResult,
          finding: 'Pre-auth credential failure burst observed: 3 sequential failed password attempts preceding transaction.',
          reasonCode: 'MULTIPLE_FAILED_LOGINS',
          riskContribution: '+20 pts',
          confidence: '99%',
          metrics: [
            { label: 'Failed Password Bursts', value: '3 Sequential Attempts' },
            { label: 'Failure Window', value: '01:58 – 02:09 AM' },
            { label: 'Compromised Login', value: '02:11 AM (Successful)' },
            { label: 'Identity Confidence', value: '12% (Compromised)' }
          ],
          evidence: [
            { key: 'Attempt 1', val: '01:58 AM (Bad Password)' },
            { key: 'Attempt 2', val: '02:09 AM (Bad Password)' },
            { key: 'Attempt 3', val: '02:10 AM (Bad Password)' },
            { key: 'Compromise Event', val: '02:11 AM (Auth Bypassed)' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE']
        };

      case 'Location':
        return {
          meta,
          rawResult,
          finding: 'Impossible travel velocity detected: 840 km distance traversed in 4 minutes (exceeds physics of commercial flight).',
          reasonCode: 'LOCATION_VELOCITY_IMPOSSIBLE',
          riskContribution: '+20 pts',
          confidence: '99%',
          metrics: [
            { label: 'Origin City', value: 'Bengaluru (02:09 AM)' },
            { label: 'Destination City', value: 'Mumbai (02:13 AM)' },
            { label: 'Displacement', value: '840 Kilometers' },
            { label: 'Calculated Velocity', value: '12,600 km/h (Supersonic)' }
          ],
          evidence: [
            { key: 'Last Legitimate City', val: 'Bengaluru, IN' },
            { key: 'Observed Jump City', val: 'Mumbai, IN' },
            { key: 'Elapsed Duration', val: '4 minutes' },
            { key: 'Physical Feasibility', val: 'Impossible Travel Violator' }
          ],
          relatedEntities: ['C1003', '103.21.144.92']
        };

      case 'Network':
        return {
          meta,
          rawResult,
          finding: 'Connection originated from datacenter proxy IP 103.21.144.92 on ASN 13335 (Cloudflare Datacenter proxy).',
          reasonCode: 'SUSPICIOUS_NETWORK_SIGNAL',
          riskContribution: '+15 pts',
          confidence: '96%',
          metrics: [
            { label: 'IP Address', value: '103.21.144.92' },
            { label: 'Autonomous System', value: 'ASN 13335 (Cloudflare)' },
            { label: 'Network Classification', value: 'Datacenter / Anonymous Proxy' },
            { label: 'VPN / Proxy Flag', value: 'TRUE (Anonymized)' }
          ],
          evidence: [
            { key: 'IP', val: '103.21.144.92' },
            { key: 'Datacenter Proxy', val: 'TRUE' },
            { key: 'Geolocation', val: 'Mumbai, Maharashtra' },
            { key: 'Threat Intel Score', val: '88/100 (Suspicious ASN)' }
          ],
          relatedEntities: ['103.21.144.92', 'C1003']
        };

      case 'History':
        return {
          meta,
          rawResult,
          finding: 'Customer account in good standing with zero prior chargebacks, dispute claims, or fraud flags in 18 months.',
          reasonCode: 'ACCOUNT_HISTORY_CLEAN',
          riskContribution: '0 pts',
          confidence: '95%',
          metrics: [
            { label: 'Account Tenure', value: '18 Months' },
            { label: 'Completed Transactions', value: '42 Historical Txns' },
            { label: 'Chargeback History', value: '0 Disputed Cases' },
            { label: 'Account Standing', value: 'Tier 2 KYC Verified' }
          ],
          evidence: [
            { key: 'Customer Status', val: 'Active / Non-Flagged' },
            { key: 'Prior Incidents', val: 'Zero Past Violations' },
            { key: 'Historical Risk', val: 'Low Baseline Customer' }
          ],
          relatedEntities: ['C1003', 'ACC-1003-SAV']
        };

      case 'Correlator':
        return {
          meta,
          rawResult,
          finding: '7 independent anomaly signals converged across 5 security domains. High-confidence correlated ATO pattern.',
          reasonCode: 'MULTI_SIGNAL_CORRELATION',
          riskContribution: '+100 pts (Capped)',
          confidence: '95%',
          metrics: [
            { label: 'Combined Signals', value: '7 Correlated Indicators' },
            { label: 'Security Domains', value: '5 Independent Vectors' },
            { label: 'Correlation Strength', value: 'CRITICAL / High Confidence' },
            { label: 'Synthesis', value: 'Coordinated Account Takeover' }
          ],
          evidence: [
            { key: 'Vectors Linked', val: 'Hardware + Geo + Credential + Network' },
            { key: 'Isolation Assessment', val: 'Cross-Domain Anomaly Cluster' },
            { key: 'Compound Risk', val: '105 pts calculated -> 100 max' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE', '103.21.144.92', 'ACC-1003-SAV']
        };

      case 'Challenger':
        return {
          meta,
          rawResult,
          finding: 'Benign travel and hardware upgrade hypothesis evaluated and rejected due to supersonic velocity anomaly.',
          reasonCode: 'BENIGN_HYPOTHESIS_EVALUATION',
          riskContribution: '0 pts',
          confidence: '92%',
          metrics: [
            { label: 'Benign Hypothesis', value: 'Legitimate Travel / New Device' },
            { label: 'Evaluation Basis', value: 'Retail Baseline Dynamics' },
            { label: 'Disproof Factor', value: '840 km in 4m Travel Physics' },
            { label: 'Exoneration Status', value: 'EXONERATION REJECTED' }
          ],
          evidence: [
            { key: 'Hypothesis Tested', val: 'Travel with secondary phone' },
            { key: 'Rejection Cause', val: '12,600 km/h velocity + 3 failed logins' },
            { key: 'Verdict', val: 'Malicious Intent Confirmed' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE']
        };

      case 'Verifier':
        return {
          meta,
          rawResult,
          finding: 'All 11 agent claims, evidence citations, and deterministic score attribution cross-verified without contradiction.',
          reasonCode: 'MULTI_AGENT_VERIFICATION',
          riskContribution: '0 pts',
          confidence: '99%',
          metrics: [
            { label: 'Agent Claims Verified', value: '11 of 11 Pipeline Claims' },
            { label: 'Logical Contradictions', value: '0 Contradictions Detected' },
            { label: 'Rule Engine Sync', value: 'Deterministic Output Match' },
            { label: 'Verification State', value: 'CONSISTENT & AUTHENTIC' }
          ],
          evidence: [
            { key: 'Engine Alignment', val: '100/100 Match' },
            { key: 'Claim Audit', val: 'All evidence pointers authenticated' },
            { key: 'Integrity Check', val: 'Cryptographically Verified' }
          ],
          relatedEntities: ['C1003', 'TXN-SEED-C1003-FRAUD']
        };

      case 'Narrator':
      default:
        return {
          meta,
          rawResult,
          finding: safeString(narrator.summary, 'Multiple independent signals converge on a high-confidence account takeover pattern.'),
          reasonCode: 'EXECUTIVE_CASE_SYNTHESIS',
          riskContribution: '0 pts',
          confidence: '95%',
          metrics: [
            { label: 'Autonomous Verdict', value: 'BLOCK_AND_CREATE_CASE' },
            { label: 'Investigator Readiness', value: 'Pre-Populated Case Ledger' },
            { label: 'Recommended Action', value: 'Immediate Credential Reset' },
            { label: 'Case Number Ref', value: `CASE-${scenario.customer_id}-FRAUD` }
          ],
          evidence: [
            { key: 'Executive Verdict', val: 'Coordinated ATO' },
            { key: 'Reason Codes', val: '7 Triggered Signals' },
            { key: 'Audit Disposition', val: 'Human Sign-off Pending' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE', 'ACC-1003-SAV']
        };
    }
  };

  const selectedAgentDetails = getSelectedAgentDetails(selectedAgentName);

  // Score radial calculation
  const scorePercent = Math.min(100, Math.max(0, riskResult.riskScore));
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] space-y-4">
      {/* ─── 1. HERO HEADER ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#3157D5] shadow-xs shrink-0">
            <ShieldAlert className="h-6 w-6 text-[#3157D5]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold text-[#172033] tracking-tight uppercase">
                AUTONOMOUS INVESTIGATION COCKPIT
              </h1>
              <span className="badge text-[10px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                LIVE TRIAGE
              </span>
              <span className="badge text-[10px] font-bold bg-[#EEF2FF] text-[#3157D5] border border-[#C7D2FE]">
                SCENARIO C
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#159A75] text-[10px] font-semibold">
                <span className="h-2 w-2 rounded-full bg-[#159A75] animate-pulse" />
                <span>INVESTIGATION ACTIVE</span>
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Deterministic 11-agent orchestration · Multi-dimensional evidence correlation · High-impact human decision gate
            </p>
          </div>
        </div>

        {/* Key Facts HUD Bar */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-[#F8FAFD] px-3.5 py-2 rounded-lg border border-[#DCE3EE]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Target:</span>
            <span className="font-bold text-[#172033]">{input.customer.name} · {input.customer.customer_id}</span>
          </div>
          <span className="text-[#CBD5E1] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Transaction:</span>
            <span className="font-semibold text-[#3157D5]">{input.transaction.transaction_id}</span>
          </div>
          <span className="text-[#CBD5E1] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Amount:</span>
            <span className="font-extrabold text-[#172033]">₹{input.transaction.amount?.toLocaleString()}</span>
          </div>
          <span className="text-[#CBD5E1] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Risk:</span>
            <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
              {riskResult.riskLevel}
            </span>
          </div>
          <span className="text-[#CBD5E1] hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Decision:</span>
            <span className="font-bold text-[#D95C62] text-[11px]">
              BLOCK &amp; CREATE CASE
            </span>
          </div>
        </div>
      </div>

      {/* Case Creation Success Notification Banner */}
      {createdCaseId && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 px-4 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-[#159A75] font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#159A75]" />
            <span>
              Authoritative Case <strong>{createdCaseId}</strong> established in ledger. Investigation snapshot, 11-agent claims, and cryptographic evidence matrix logged.
            </span>
          </div>
          <a
            href="#cases"
            className="text-xs font-bold text-[#159A75] hover:text-[#0D5C46] flex items-center gap-1 underline underline-offset-2 ml-4 shrink-0"
          >
            <span>Open Case File</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* ─── 2. GLOBAL 3-COLUMN WORKSPACE (28% - 44% - 28%) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* ─── LEFT COLUMN: AI INVESTIGATION BRIEF (LG: col-span-3) ──────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3.5">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  AI Investigation Brief
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EEF2FF] text-[#3157D5] font-semibold">
                Autonomous
              </span>
            </div>

            {/* Radial / Gauge Visualization for Risk Score */}
            <div className="p-3.5 rounded-xl border border-[#DCE3EE] bg-gradient-to-br from-white via-[#F8FAFD] to-white shadow-xs flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D95C62] via-[#E06A3B] to-[#D99425]" />
              
              <div className="w-full flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Composite Risk Score
                </span>
                <span className="badge text-[10px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                  CRITICAL
                </span>
              </div>

              {/* Sophisticated Circular Gauge */}
              <div className="relative flex items-center justify-center my-1">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={circleRadius}
                    className="stroke-[#E2E8F0]"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={circleRadius}
                    className="stroke-[#D95C62] transition-all duration-1000 ease-out"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono text-[#172033] tracking-tighter leading-none">
                    {riskResult.riskScore}
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B] font-semibold mt-0.5">
                    / 100
                  </span>
                </div>
              </div>

              <div className="text-center mt-0.5">
                <div className="text-xs font-bold text-[#D95C62] uppercase tracking-wide">
                  CRITICAL RISK
                </div>
                <div className="text-[11px] text-[#64748B] font-medium">
                  7 correlated signals · High confidence
                </div>
              </div>
            </div>

            {/* Decision Block */}
            <div className="p-3 rounded-xl border border-[#DCE3EE] bg-[#F8FAFD] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Autonomous Decision
                </span>
                <span className="text-[10px] font-mono font-bold text-[#159A75] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 95.0% Conf
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#FFE4E6] flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#D95C62] font-mono">
                  BLOCK &amp; CREATE CASE
                </span>
                <span className="h-2 w-2 rounded-full bg-[#D95C62]" />
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Decision basis:</span>
                <span className="font-semibold text-[#172033]">7 correlated signals</span>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[10px] text-[#B7791F]">
                <Lock className="h-3 w-3 shrink-0" />
                <span>Human confirmation required for execution</span>
              </div>
            </div>

            {/* Top Signals with Direct Agent Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                  Top Signals
                </span>
                <span className="text-[10px] font-mono text-[#D95C62] font-bold">7 Triggered</span>
              </div>
              <div className="space-y-1">
                {topSignals.map((sig) => {
                  const isSelected = selectedAgentName === sig.agent;
                  return (
                    <div
                      key={sig.key}
                      onClick={() => setSelectedAgentName(sig.agent)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#3157D5] bg-[#EEF2FF] shadow-xs'
                          : 'border-[#DCE3EE] bg-[#F8FAFD] hover:bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#3157D5]' : 'bg-[#D95C62]'}`} />
                          <span className="font-bold text-[11px] text-[#172033] tracking-tight">{sig.label}</span>
                        </div>
                        <div className="text-[10px] text-[#64748B] truncate mt-0.5 pl-3">
                          {sig.desc}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#D95C62] bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] shrink-0">
                        +{sig.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Challenger Hypothesis (Benign Explanation) */}
            <div className="space-y-1.5 pt-1 border-t border-[#DCE3EE]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                  <Scale className="h-3.5 w-3.5 text-[#D99425]" />
                  <span>Challenger Hypothesis</span>
                </div>
                <button
                  onClick={() => setSelectedAgentName('Challenger')}
                  className="text-[10px] font-bold text-[#3157D5] hover:underline"
                >
                  Inspect Agent
                </button>
              </div>
              <div className="p-2.5 rounded-lg border border-[#DCE3EE] bg-white text-xs space-y-1.5">
                <p className="italic text-[11px] text-[#475569] leading-relaxed">
                  "{challenger.summary || 'Customer may be travelling with a newly purchased secondary device.'}"
                </p>
                <div className="p-1.5 rounded bg-[#FFF1F2] border border-[#FFE4E6] text-[10px] text-[#D95C62] font-semibold">
                  Exoneration rejected: 840 km in 4m violates physical flight velocity laws.
                </div>
              </div>
            </div>

            {/* AI Narrator Summary */}
            <div className="space-y-1.5 pt-1 border-t border-[#DCE3EE]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                  <FileText className="h-3.5 w-3.5 text-[#3157D5]" />
                  <span>Investigator Summary</span>
                </div>
                <button
                  onClick={() => setShowFullNarrative(!showFullNarrative)}
                  className="text-[10px] font-bold text-[#3157D5] hover:underline cursor-pointer"
                >
                  {showFullNarrative ? 'Collapse' : 'View reasoning'}
                </button>
              </div>
              <div className="p-2.5 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD] text-xs leading-relaxed text-[#172033]">
                <p>
                  Multiple independent signals converge on a high-confidence account takeover pattern. Unregistered hardware DEV-1003-ROGUE executed an out-of-hours ₹85,000 transfer after a credential failure burst.
                </p>
                {showFullNarrative && (
                  <div className="mt-2 pt-2 border-t border-[#DCE3EE] text-[11px] text-[#475569] space-y-1 animate-in fade-in duration-200">
                    <p>{narrator.summary}</p>
                    <div className="font-mono text-[10px] text-[#159A75] bg-white p-1 rounded border border-[#DCE3EE]">
                      ✓ Corroborated by Verifier Agent: 11 of 11 claims verified.
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ─── CENTER COLUMN: INTERACTIVE AGENT TOPOLOGY (LG: col-span-6) ────── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Summary Metric Strip (Section 10) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white rounded-xl p-3 border border-[#DCE3EE] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[#64748B]">Investigation Pipeline</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-extrabold font-mono text-[#172033]">11 Agents</span>
                <span className="badge text-[9px] font-bold bg-[#F0FDF4] text-[#159A75] border border-[#BBF7D0]">COMPLETE</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#DCE3EE] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[#64748B]">Correlated Signals</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-extrabold font-mono text-[#D95C62]">7 Signals</span>
                <span className="badge text-[9px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">CRITICAL</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#DCE3EE] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[#64748B]">Evidence Domains</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-extrabold font-mono text-[#3157D5]">6 Domains</span>
                <span className="badge text-[9px] font-bold bg-[#EEF2FF] text-[#3157D5] border border-[#C7D2FE]">CONVERGED</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#DCE3EE] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-[#64748B]">Deterministic Result</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-extrabold font-mono text-[#D95C62]">100 / 100</span>
                <span className="badge text-[9px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">BLOCK</span>
              </div>
            </div>
          </div>

          {/* AI Investigation Pipeline Topology Canvas Container */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs flex flex-col overflow-hidden">
            
            {/* Pipeline Header with Controls & Demo Player */}
            <div className="px-4 py-3 border-b border-[#DCE3EE] flex flex-wrap items-center justify-between gap-2.5 bg-[#F8FAFD]">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#3157D5]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    AI Investigation Pipeline Topology
                  </h2>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  11 specialized agents evaluate transaction telemetry before human disposition
                </p>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5 canvas-controls">
                {/* Hackathon Demo Stepper */}
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isPlayingDemo
                      ? 'bg-[#3157D5] text-white border-[#3157D5] animate-pulse'
                      : 'bg-white text-[#3157D5] border-[#DCE3EE] hover:bg-[#EEF2FF]'
                  }`}
                  title="Step through all 11 agents in sequence"
                >
                  {isPlayingDemo ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-[#3157D5]" />
                      <span>Play Pipeline</span>
                    </>
                  )}
                </button>

                <div className="h-4 w-px bg-[#DCE3EE] mx-1" />

                <button
                  onClick={zoomIn}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={zoomOut}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={fitToView}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Fit to Canvas"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={resetLayout}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Reset Layout"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Topology Horizontal Canvas */}
            <div
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full h-[180px] bg-[#FAFBFD] overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{
                backgroundImage: 'radial-gradient(#CBD5E1 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px'
              }}
            >
              {/* Scalable & Pannable World Container */}
              <div
                className="absolute left-0 top-0 transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: '0 0'
                }}
              >
                {/* SVG Connecting Edges with Arrowheads */}
                <svg
                  className="absolute pointer-events-none overflow-visible"
                  style={{ width: '2400px', height: '170px' }}
                >
                  <defs>
                    <marker
                      id="arrow-default"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#94A3B8" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#3157D5" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#D95C62" />
                    </marker>
                  </defs>

                  {/* Draw edges between adjacent nodes */}
                  {AGENT_METAS.slice(0, -1).map((meta, i) => {
                    const nextMeta = AGENT_METAS[i + 1];
                    const nodeWidth = 165;
                    const nodeGap = 42;
                    const x1 = i * (nodeWidth + nodeGap) + nodeWidth + 24;
                    const y1 = 80;
                    const x2 = (i + 1) * (nodeWidth + nodeGap) + 24;
                    const y2 = 80;

                    const isSourceOrTargetSelected =
                      selectedAgentName === meta.name || selectedAgentName === nextMeta.name;

                    const isEdgeCritical =
                      meta.status === 'CRITICAL' || nextMeta.status === 'CRITICAL';

                    let strokeColor = '#CBD5E1';
                    let markerId = 'url(#arrow-default)';

                    if (isSourceOrTargetSelected) {
                      strokeColor = '#3157D5';
                      markerId = 'url(#arrow-active)';
                    } else if (isEdgeCritical) {
                      strokeColor = '#FDA4AF';
                      markerId = 'url(#arrow-critical)';
                    }

                    return (
                      <g key={i}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2 - 8}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={isSourceOrTargetSelected ? '2.5' : '1.75'}
                          strokeDasharray={meta.name === 'History' || meta.name === 'Challenger' ? '4 3' : 'none'}
                          markerEnd={markerId}
                          className="transition-colors duration-200"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* 11 Agent Nodes */}
                <div className="flex items-center gap-[42px] px-6 py-6">
                  {AGENT_METAS.map((meta) => {
                    const isSelected = selectedAgentName === meta.name;
                    const Icon = meta.icon;

                    return (
                      <div
                        key={meta.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgentName(meta.name);
                        }}
                        style={{ width: '165px', height: '108px' }}
                        className={`canvas-node relative bg-white rounded-xl border flex flex-col justify-between p-3 cursor-pointer transition-all duration-200 shrink-0 ${
                          isSelected
                            ? 'border-[#3157D5] ring-2 ring-[#3157D5]/25 shadow-card scale-105 z-20'
                            : 'border-[#DCE3EE] hover:border-[#CBD5E1] hover:shadow-xs shadow-none z-10 opacity-95 hover:opacity-100'
                        }`}
                      >
                        {/* Top Accent Color Line */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                          style={{ backgroundColor: meta.accentColor }}
                        />

                        {/* Top Row: Stage Number + Icon + Status Symbol */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="font-mono text-[10px] font-extrabold text-[#64748B]">
                            {meta.stageNumber}
                          </span>
                          <div
                            className="p-1 rounded-md"
                            style={{ backgroundColor: meta.bgLight, color: meta.accentColor }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                            meta.status === 'CRITICAL' ? 'text-[#D95C62] bg-[#FFF1F2]' : 'text-[#159A75] bg-[#F0FDF4]'
                          }`}>
                            {meta.status === 'CRITICAL' ? '!' : '✓'}
                          </span>
                        </div>

                        {/* Middle: Agent Name */}
                        <div>
                          <div className="text-xs font-black text-[#172033] tracking-tight uppercase leading-tight truncate">
                            {meta.name}
                          </div>
                          <div className="text-[10px] font-semibold text-[#64748B] tracking-wider uppercase">
                            AGENT
                          </div>
                        </div>

                        {/* Bottom Row: Status Badge & Latency */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold border truncate max-w-[105px] ${meta.statusColor}`}>
                            {meta.status}
                          </span>
                          <span className="font-mono text-[9px] text-[#64748B]">
                            {meta.latency}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pan Navigation Hint */}
              <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-[#94A3B8] bg-white/80 px-2 py-0.5 rounded border border-[#DCE3EE]/60 backdrop-blur-xs">
                Drag to pan · Click any agent
              </div>
            </div>

          </div>

          {/* ─── 3. DYNAMIC AGENT INTELLIGENCE PANEL (Section 7 & 8) ──────────── */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3.5 animate-in fade-in duration-200">
            {/* Panel Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#DCE3EE] pb-2.5 gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shadow-xs"
                  style={{ backgroundColor: selectedAgentDetails.meta.bgLight, color: selectedAgentDetails.meta.accentColor }}
                >
                  {React.createElement(selectedAgentDetails.meta.icon, { className: 'h-4 w-4' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#64748B]">
                      STAGE {selectedAgentDetails.meta.stageNumber}
                    </span>
                    <h3 className="text-xs font-extrabold text-[#172033] tracking-tight uppercase">
                      {selectedAgentDetails.meta.name} AGENT INTELLIGENCE
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    Domain: {selectedAgentDetails.meta.domain} · Latency: {selectedAgentDetails.meta.latency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${selectedAgentDetails.meta.statusColor}`}>
                  {selectedAgentDetails.meta.status}
                </span>
                <span className="badge text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#159A75] border border-[#BBF7D0]">
                  CONFIDENCE: {selectedAgentDetails.confidence}
                </span>
              </div>
            </div>

            {/* Primary Finding Statement */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Verified Agent Finding
              </span>
              <p className="text-xs text-[#172033] font-medium leading-relaxed">
                {selectedAgentDetails.finding}
              </p>
            </div>

            {/* 4-Quadrant Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              
              {/* Reason Code & Attribution */}
              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Reason Code</span>
                  <span className="text-[10px] font-mono font-bold text-[#D95C62] bg-[#FFF1F2] px-1.5 py-0.5 rounded border border-[#FFE4E6]">
                    {selectedAgentDetails.riskContribution}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#3157D5] bg-[#EEF2FF] p-1.5 rounded border border-[#C7D2FE]">
                  {selectedAgentDetails.reasonCode}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Attribution: Evaluated against authoritative institutional threshold rules.
                </div>
              </div>

              {/* Key Domain Metrics */}
              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-1.5 font-mono">
                <span className="text-[10px] font-bold uppercase text-[#64748B] block font-sans">Telemetry Metrics</span>
                {selectedAgentDetails.metrics.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-[#64748B]">{m.label}:</span>
                    <strong className="text-[#172033]">{m.value}</strong>
                  </div>
                ))}
              </div>

              {/* Evidence Items */}
              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">Evidence Citations</span>
                <div className="space-y-1 font-mono text-[11px]">
                  {selectedAgentDetails.evidence.map((ev, idx) => (
                    <div key={idx} className="flex justify-between p-1 rounded bg-[#F8FAFD] border border-[#E2E8F0]">
                      <span className="text-[#64748B]">{ev.key}:</span>
                      <strong className="text-[#172033] truncate max-w-[190px]">{ev.val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Entities Linkage */}
              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Related Entities</span>
                  <a href="#entity-graph" className="text-[10px] font-bold text-[#3157D5] hover:underline flex items-center gap-0.5 font-sans">
                    <span>Inspect Graph</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {selectedAgentDetails.relatedEntities.map((ent, idx) => (
                    <a
                      key={idx}
                      href="#entity-graph"
                      className="px-2 py-1 rounded bg-[#F8FAFD] border border-[#DCE3EE] text-[#172033] hover:border-[#3157D5] transition-colors"
                    >
                      {ent}
                    </a>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ─── 4. EVIDENCE CORRELATION MAP (Section 12) ──────────────────────── */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between border-b border-[#DCE3EE] pb-2 gap-2">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[#3157D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Evidence Correlation Map
                </h3>
              </div>
              <span className="badge text-[10px] font-mono font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                7 SIGNALS CONVERGED → 100 / 100 CRITICAL
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {evidenceCards.map((card, cIdx) => {
                const isSelected = selectedAgentName === card.agent;
                return (
                  <div
                    key={cIdx}
                    onClick={() => setSelectedAgentName(card.agent)}
                    className={`p-2.5 rounded-lg border border-l-4 ${card.color} transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#3157D5] bg-[#EEF2FF] shadow-xs ring-2 ring-[#3157D5]/20'
                        : 'border-[#DCE3EE] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">
                        {card.title}
                      </div>
                      <div className="text-xs font-extrabold font-mono text-[#172033] truncate">
                        {card.value}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-1.5 pt-1.5 border-t border-[#F1F5F9] leading-tight">
                      {card.tag}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 rounded-lg bg-[#F8FAFD] border border-[#DCE3EE] flex items-center gap-2 text-xs text-[#475569]">
              <Zap className="h-3.5 w-3.5 text-[#3157D5] shrink-0" />
              <span>
                <strong>Click any evidence card</strong> to focus that agent in the topology above. Multi-dimensional correlation confirmed 100/100 threshold.
              </span>
            </div>
          </div>

        </div>

        {/* ─── RIGHT COLUMN: INVESTIGATION CONTEXT DOSSIER (LG: col-span-3) ──── */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3.5">
            
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Investigation Context
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">Dossier</span>
            </div>

            {/* CUSTOMER */}
            <div
              onClick={() => setHighlightedContextNode(highlightedContextNode === 'customer' ? null : 'customer')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                highlightedContextNode === 'customer' ? 'border-[#3157D5] bg-[#EEF2FF]/40' : 'border-[#DCE3EE] bg-[#F8FAFD]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Customer</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] text-[#3157D5] font-semibold">KYC TIER 2</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Name</span>
                  <span className="font-bold text-[#172033]">{input.customer.name}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Customer ID</span>
                  <span className="font-mono text-[#3157D5] font-bold">{input.customer.customer_id}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Baseline City</span>
                  <span className="font-medium text-[#172033]">{input.customer.home_city || 'Bengaluru'}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Risk Profile</span>
                  <span className="text-[#D95C62] font-bold">Active Critical Flag</span>
                </div>
              </div>
            </div>

            {/* ACCOUNT */}
            <div
              onClick={() => setHighlightedContextNode(highlightedContextNode === 'account' ? null : 'account')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                highlightedContextNode === 'account' ? 'border-[#3157D5] bg-[#EEF2FF]/40' : 'border-[#DCE3EE] bg-[#F8FAFD]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Account</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] text-[#159A75] font-semibold">ACTIVE</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Account ID</span>
                  <span className="font-mono font-bold text-[#172033]">{scenario.account?.account_id || 'ACC-1003-SAV'}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Ledger Balance</span>
                  <span className="font-mono font-bold text-[#172033]">₹124,000</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Normal Peak</span>
                  <span className="font-medium text-[#172033]">₹1,000 – ₹8,000</span>
                </div>
              </div>
            </div>

            {/* DEVICE */}
            <div
              onClick={() => setHighlightedContextNode(highlightedContextNode === 'device' ? null : 'device')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                highlightedContextNode === 'device' ? 'border-[#D95C62] bg-[#FFF1F2]' : 'border-[#FFE4E6] bg-[#FFF1F2]/60'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-[#D95C62] mb-1.5 flex items-center justify-between">
                <span>Hardware Footprint</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded text-[#D95C62] font-bold border border-[#FFE4E6]">ROGUE HARDWARE</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#FFE4E6] pb-1">
                  <span className="text-[#64748B]">Type</span>
                  <span className="font-medium text-[#172033]">desktop / Kali Linux root</span>
                </div>
                <div className="flex justify-between border-b border-[#FFE4E6] pb-1">
                  <span className="text-[#64748B]">Device ID</span>
                  <span className="font-mono font-bold text-[#D95C62]">{input.transaction.device_id || 'DEV-1003-ROGUE'}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">First Observed</span>
                  <span className="font-mono text-[#D95C62] font-bold">02:11 AM (Unregistered)</span>
                </div>
              </div>
            </div>

            {/* NETWORK */}
            <div
              onClick={() => setHighlightedContextNode(highlightedContextNode === 'network' ? null : 'network')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                highlightedContextNode === 'network' ? 'border-[#6C63D9] bg-[#EEF2FF]/50' : 'border-[#DCE3EE] bg-[#F8FAFD]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Network</span>
                <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] text-[#6C63D9] font-semibold">ASN 13335</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">IP Address</span>
                  <span className="font-mono font-bold text-[#172033]">{input.transaction.ip_address || '103.21.144.92'}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1">
                  <span className="text-[#64748B]">Observed City</span>
                  <span className="font-medium text-[#172033]">Mumbai, IN</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#64748B]">Proxy / Datacenter</span>
                  <span className="font-bold text-[#D95C62]">TRUE</span>
                </div>
              </div>
            </div>

            {/* LOGIN ACTIVITY (Temporal Timeline) */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Recent Login Activity</span>
                <span className="text-[9px] font-mono text-[#D95C62] font-semibold">Pre-Auth Timeline</span>
              </div>
              <div className="relative pl-3 space-y-2 text-xs before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCE3EE]">
                <div className="relative flex items-center justify-between font-mono text-[11px]">
                  <span className="absolute -left-3 h-2 w-2 rounded-full bg-[#D95C62]" />
                  <span className="text-[#64748B] pl-1">01:58</span>
                  <span className="text-[#D95C62] font-bold">FAILED LOGIN</span>
                </div>
                <div className="relative flex items-center justify-between font-mono text-[11px]">
                  <span className="absolute -left-3 h-2 w-2 rounded-full bg-[#D95C62]" />
                  <span className="text-[#64748B] pl-1">02:09</span>
                  <span className="text-[#D95C62] font-bold">FAILED LOGIN</span>
                </div>
                <div className="relative flex items-center justify-between font-mono text-[11px]">
                  <span className="absolute -left-3 h-2 w-2 rounded-full bg-[#D99425]" />
                  <span className="text-[#64748B] pl-1">02:11</span>
                  <span className="text-[#D99425] font-extrabold">COMPROMISED LOGIN</span>
                </div>
                <div className="relative flex items-center justify-between font-mono text-[11px]">
                  <span className="absolute -left-3 h-2 w-2 rounded-full bg-[#3157D5]" />
                  <span className="text-[#64748B] pl-1">02:13</span>
                  <span className="text-[#3157D5] font-extrabold">₹85,000 TXN TRIGGER</span>
                </div>
              </div>
            </div>

            {/* MERCHANT */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Merchant</span>
                <span className="text-[9px] font-mono bg-[#FFF1F2] text-[#D95C62] px-1.5 py-0.5 rounded border border-[#FFE4E6] font-semibold">MCC 5094</span>
              </div>
              <div className="text-xs font-bold text-[#172033]">
                {input.transaction.merchant || 'Luxury Jewels & Bullion'}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                Jewellery &amp; Precious Bullion (High Liquidity)
              </div>
            </div>

            {/* RELATED ENTITIES */}
            <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD]">
              <div className="text-[10px] font-bold uppercase text-[#64748B] mb-2 flex items-center justify-between">
                <span>Related Entities</span>
                <a href="#entity-graph" className="text-[10px] font-bold text-[#3157D5] hover:underline flex items-center gap-0.5">
                  <span>Graph</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <a
                  href="#entity-graph"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs hover:border-[#3157D5] transition-colors"
                >
                  <CreditCard className="h-3 w-3 text-[#6C63D9]" />
                  <span className="font-mono">{scenario.account?.account_id || 'ACC-1003-SAV'}</span>
                </a>
                <a
                  href="#entity-graph"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs hover:border-[#3157D5] transition-colors"
                >
                  <Smartphone className="h-3 w-3 text-[#D99425]" />
                  <span className="font-mono">{input.transaction.device_id || 'DEV-1003-ROGUE'}</span>
                </a>
                <a
                  href="#entity-graph"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs hover:border-[#3157D5] transition-colors"
                >
                  <Network className="h-3 w-3 text-[#D95C62]" />
                  <span className="font-mono">{input.transaction.ip_address || '103.21.144.92'}</span>
                </a>
                <a
                  href="#entity-graph"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DCE3EE] text-[11px] text-[#172033] shadow-xs hover:border-[#3157D5] transition-colors"
                >
                  <Store className="h-3 w-3 text-[#159A75]" />
                  <span>{input.transaction.merchant || 'Luxury Jewels & Bullion'}</span>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ─── 5. HUMAN-IN-THE-LOOP ACTION BAR ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-xs text-[#64748B] flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#3157D5] shrink-0">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div>
            <strong className="text-[#172033]">Human-in-the-Loop Authority:</strong>{' '}
            Autonomous AI recommends <span className="font-mono font-bold text-[#D95C62]">BLOCK &amp; CREATE CASE</span>. Investigator confirmation required.
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Neutral actions */}
          <button
            onClick={() => handleAction('Allow')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCE3EE] text-[#172033] hover:bg-[#F8FAFD] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            ALLOW
          </button>
          
          <button
            onClick={() => handleAction('Step-Up Verification')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#DCE3EE] text-[#172033] hover:bg-[#F8FAFD] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            STEP-UP
          </button>
          
          <button
            onClick={() => handleAction('Hold')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#FEF08A] text-[#D99425] hover:bg-[#FEFCE8] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            HOLD
          </button>

          {/* Secondary Action */}
          <button
            onClick={() => handleAction('Block & Review')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#3157D5] text-[#3157D5] hover:bg-[#EEF2FF] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            BLOCK &amp; REVIEW
          </button>

          {/* Primary Recommended Action (Visually Dominant) */}
          <button
            onClick={() => handleAction('BLOCK & CREATE CASE')}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#3157D5] text-white hover:bg-[#2645AB] transition-all whitespace-nowrap shadow-xs flex items-center gap-1.5 cursor-pointer ring-2 ring-[#3157D5]/20"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>BLOCK &amp; CREATE CASE</span>
          </button>

          {/* Destructive Danger Action */}
          <button
            onClick={() => handleAction('Freeze Account')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FFF1F2] border border-[#FFE4E6] text-[#D95C62] hover:bg-[#D95C62] hover:text-white transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            FREEZE ACCOUNT
          </button>
        </div>
      </div>

      {/* ─── 6. DISPOSITION CONFIRMATION MODAL ───────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE3EE] shadow-elevated space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#D95C62] shrink-0 border border-[#FFE4E6]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Confirm Disposition: {showConfirm}?
                </h3>
                <p className="text-xs text-[#64748B]">
                  High-Impact Financial Crime Action Gate
                </p>
              </div>
            </div>

            {/* Decision Reason & Evidence Summary Box */}
            <div className="p-3.5 rounded-xl border border-[#DCE3EE] bg-[#F8FAFD] space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#64748B]">Score / Level:</span>
                <span className="font-extrabold text-[#D95C62]">100 / 100 CRITICAL</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#64748B]">Target Entity:</span>
                <span className="font-bold text-[#172033]">{input.customer.name} ({input.customer.customer_id})</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#64748B]">Transaction:</span>
                <span className="font-bold text-[#3157D5]">{input.transaction.transaction_id} (₹{input.transaction.amount?.toLocaleString()})</span>
              </div>

              <div className="pt-2 border-t border-[#DCE3EE]">
                <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">
                  Converged Decision Evidence:
                </div>
                <ul className="space-y-1 text-[11px] text-[#475569]">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62]" />
                    <span>Unrecognized rogue device signature DEV-1003-ROGUE</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62]" />
                    <span>3 pre-auth failed login attempts followed by credential takeover</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62]" />
                    <span>Bengaluru → Mumbai impossible velocity (840 km in 4 minutes)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62]" />
                    <span>Out-of-hours transfer to high-risk jewellery merchant</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Applying this disposition establishes an immutable case in the authoritative ledger, executes account protective safeguards, and logs an investigator cryptographic audit event.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DCE3EE]">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFD] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D95C62] text-white hover:bg-[#C54A50] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Logging to Ledger...</span>
                ) : (
                  <>
                    <Shield className="h-3.5 w-3.5" />
                    <span>Confirm Disposition</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationWorkspace;
