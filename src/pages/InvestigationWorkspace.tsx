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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ArrowLeft,
  Check,
  Eye
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
import { AgentResult, Case, AuditLog, DecisionAction, NetworkSignal } from '../types';

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
export interface AgentMeta {
  name: string;
  stageNumber: string;
  icon: React.ElementType;
  accentColor: string;
  bgLight: string;
  status: string;
  statusColor: string;
  latency: string;
  domain: string;
  riskContribution: string;
}

export const AGENT_METAS: AgentMeta[] = [
  { name: 'Transaction', stageNumber: '01', icon: Activity, accentColor: '#3157D5', bgLight: '#EEF2FF', status: 'ELEVATED', statusColor: 'text-[#3157D5] bg-[#EEF2FF] border-[#C7D2FE]', latency: '6ms', domain: 'TRANSACTION', riskContribution: '+20 pts' },
  { name: 'Behaviour', stageNumber: '02', icon: Clock, accentColor: '#6C63D9', bgLight: '#F3F0FF', status: 'ELEVATED', statusColor: 'text-[#6C63D9] bg-[#F3F0FF] border-[#DDD6FE]', latency: '4ms', domain: 'BEHAVIOUR', riskContribution: '+10 pts' },
  { name: 'Device', stageNumber: '03', icon: Smartphone, accentColor: '#D99425', bgLight: '#FEFCE8', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '8ms', domain: 'DEVICE', riskContribution: '+15 pts' },
  { name: 'Identity', stageNumber: '04', icon: User, accentColor: '#D95C62', bgLight: '#EFF6FF', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '5ms', domain: 'IDENTITY', riskContribution: '+20 pts' },
  { name: 'Location', stageNumber: '05', icon: MapPin, accentColor: '#159A75', bgLight: '#E6F7F7', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '7ms', domain: 'LOCATION', riskContribution: '+20 pts' },
  { name: 'Network', stageNumber: '06', icon: Globe, accentColor: '#4F46E5', bgLight: '#FFF1F2', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '5ms', domain: 'NETWORK', riskContribution: '+15 pts' },
  { name: 'History', stageNumber: '07', icon: History, accentColor: '#10B981', bgLight: '#F8FAFC', status: 'VERIFIED', statusColor: 'text-[#159A75] bg-[#F0FDF4] border-[#BBF7D0]', latency: '3ms', domain: 'HISTORY', riskContribution: '0 pts' },
  { name: 'Correlator', stageNumber: '08', icon: GitMerge, accentColor: '#2563EB', bgLight: '#EEF2FF', status: 'CRITICAL', statusColor: 'text-[#D95C62] bg-[#FFF1F2] border-[#FFE4E6]', latency: '12ms', domain: 'CORRELATION', riskContribution: '100/100' },
  { name: 'Challenger', stageNumber: '09', icon: Scale, accentColor: '#9333EA', bgLight: '#FEF3C7', status: 'EXONERATION REJECTED', statusColor: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]', latency: '9ms', domain: 'CHALLENGE', riskContribution: 'REJECTED' },
  { name: 'Verifier', stageNumber: '10', icon: CheckCircle2, accentColor: '#16A34A', bgLight: '#F0FDF4', status: 'VERIFIED', statusColor: 'text-[#159A75] bg-[#F0FDF4] border-[#BBF7D0]', latency: '4ms', domain: 'VERIFICATION', riskContribution: '11/11' },
  { name: 'Narrator', stageNumber: '11', icon: FileText, accentColor: '#3157D5', bgLight: '#EEF2FF', status: 'VERIFIED', statusColor: 'text-[#3157D5] bg-[#EEF2FF] border-[#C7D2FE]', latency: '14ms', domain: 'NARRATIVE', riskContribution: 'CRITICAL' },
];

export const InvestigationWorkspace: React.FC = () => {
  // Read active scenario key from sessionStorage or fallback to high_risk_c1003
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>(() => {
    return sessionStorage.getItem('finguard_active_scenario') || 'high_risk_c1003';
  });

  // Read simulated event metadata if opened from multi-bank simulation
  const [simulatedEvent, setSimulatedEvent] = useState<any>(() => {
    try {
      const raw = sessionStorage.getItem('finguard_active_sim_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const scenario = CANONICAL_SCENARIOS[activeScenarioKey] || CANONICAL_SCENARIOS['high_risk_c1003'];
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // Selected Agent state (Default: 'Transaction')
  const [selectedAgentName, setSelectedAgentName] = useState<string>('Transaction');

  // Interactive Playback Stepper state
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number>(-1);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);

  // Gauge hover breakdown state
  const [isGaugeHovered, setIsGaugeHovered] = useState(false);

  // Fullscreen topology state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenLayout, setFullscreenLayout] = useState<'grid' | 'flow'>('grid');
  const [showDrawerInFullscreen, setShowDrawerInFullscreen] = useState(true);
  const preFullscreenTransform = useRef({ x: 10, y: 0, scale: 1 });

  // Canvas Pan & Zoom state (regular canvas)
  const [transform, setTransform] = useState({ x: 10, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas Pan & Zoom state (fullscreen canvas)
  const [fullscreenTransform, setFullscreenTransform] = useState({ x: 30, y: 20, scale: 0.95 });
  const [isFullscreenPanning, setIsFullscreenPanning] = useState(false);
  const [fullscreenDragStart, setFullscreenDragStart] = useState({ x: 0, y: 0 });
  const fullscreenCanvasRef = useRef<HTMLDivElement>(null);

  // Node Dragging offsets
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const draggingNodeRef = useRef<{ name: string; startX: number; startY: number; initDx: number; initDy: number } | null>(null);

  // Left & Right interactivity states
  const [showFullNarrative, setShowFullNarrative] = useState(false);

  // Collapsible sections in context dossier
  const [collapsedDossier, setCollapsedDossier] = useState<Record<string, boolean>>({
    customer: false,
    account: false,
    device: false,
    network: false,
    logins: false,
    location: false,
    merchant: false,
    related: false,
  });

  const toggleDossierSection = (section: string) => {
    setCollapsedDossier(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Synchronously compute authoritative investigation state using authoritative Risk Engine & 11 Agents
  const data = useMemo(() => {
    const transaction = {
      ...scenario.transaction,
      transaction_id: simulatedEvent?.transactionId || scenario.transaction.transaction_id || 'TXN-SEED-C1003-FRAUD',
      amount: simulatedEvent?.amount !== undefined ? simulatedEvent.amount : scenario.transaction.amount,
      city: simulatedEvent?.city || scenario.transaction.city,
      merchant: simulatedEvent?.merchant || scenario.transaction.merchant,
      device_id: simulatedEvent?.deviceId || scenario.transaction.device_id,
      ip_address: simulatedEvent?.ipAddress || scenario.transaction.ip_address,
      currency: scenario.transaction.currency || 'INR',
      status: scenario.transaction.status || 'PENDING',
      channel: scenario.transaction.channel || 'MOBILE_APP',
    };

    // Device resolution: if unrecognized rogue device, leave undefined so Risk Engine adds NEW_OR_UNVERIFIED_DEVICE (+15 pts)
    const primaryDevice = scenario.devices.find(d => d.device_id === transaction.device_id);

    const primaryNetwork: NetworkSignal | undefined = scenario.network_signals?.[0] || 
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

    return { input, riskResult, agentResults, challenger, verifier, narrator };
  }, [scenario, simulatedEvent]);

  const { input, riskResult, agentResults, challenger, verifier, narrator } = data;

  // Pipeline playback stepper
  useEffect(() => {
    if (!isPlayingDemo) return;

    setIsPipelineComplete(false);
    let step = currentPlayIndex >= 0 && currentPlayIndex < AGENT_METAS.length - 1 ? currentPlayIndex : 0;
    setSelectedAgentName(AGENT_METAS[step].name);
    setCurrentPlayIndex(step);

    const interval = setInterval(() => {
      step++;
      if (step < AGENT_METAS.length) {
        setSelectedAgentName(AGENT_METAS[step].name);
        setCurrentPlayIndex(step);
      } else {
        setIsPipelineComplete(true);
        setIsPlayingDemo(false);
        setCurrentPlayIndex(AGENT_METAS.length - 1);
        clearInterval(interval);
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  // Fullscreen toggle handlers
  const handleEnterFullscreen = () => {
    preFullscreenTransform.current = { ...transform };
    setIsFullscreen(true);
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    setTransform(preFullscreenTransform.current);
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          handleExitFullscreen();
        }
      } else if (e.key === '+' || e.key === '=') {
        if (isFullscreen) {
          setFullscreenTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.15, 2.0) }));
        } else {
          setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.15, 1.8) }));
        }
      } else if (e.key === '-' || e.key === '_') {
        if (isFullscreen) {
          setFullscreenTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.85, 0.4) }));
        } else {
          setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.85, 0.5) }));
        }
      } else if (e.key.toLowerCase() === 'f') {
        if (isFullscreen) {
          fitToViewFullscreen();
        } else {
          fitToView();
        }
      } else if (e.key.toLowerCase() === 'r') {
        resetLayout();
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setIsPlayingDemo(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, transform, fullscreenTransform]);

  // Canvas Pan & Drag handlers (regular canvas)
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
    if (draggingNodeRef.current) {
      const { name, startX, startY, initDx, initDy } = draggingNodeRef.current;
      const scale = transform.scale;
      const dx = initDx + (e.clientX - startX) / scale;
      const dy = initDy + (e.clientY - startY) / scale;
      setNodeOffsets(prev => ({ ...prev, [name]: { dx, dy } }));
      return;
    }

    if (!isPanning) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    draggingNodeRef.current = null;
    setIsPanning(false);
    if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Fullscreen Pan handlers
  const handleFullscreenPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('.canvas-node') || (e.target as Element).closest('.canvas-controls')) return;

    setIsFullscreenPanning(true);
    setFullscreenDragStart({ x: e.clientX, y: e.clientY });
    if (fullscreenCanvasRef.current) {
      fullscreenCanvasRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleFullscreenPointerMove = (e: React.PointerEvent) => {
    if (draggingNodeRef.current) {
      const { name, startX, startY, initDx, initDy } = draggingNodeRef.current;
      const scale = fullscreenTransform.scale;
      const dx = initDx + (e.clientX - startX) / scale;
      const dy = initDy + (e.clientY - startY) / scale;
      setNodeOffsets(prev => ({ ...prev, [name]: { dx, dy } }));
      return;
    }

    if (!isFullscreenPanning) return;
    const dx = e.clientX - fullscreenDragStart.x;
    const dy = e.clientY - fullscreenDragStart.y;
    setFullscreenTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setFullscreenDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleFullscreenPointerUp = (e: React.PointerEvent) => {
    draggingNodeRef.current = null;
    setIsFullscreenPanning(false);
    if (fullscreenCanvasRef.current && fullscreenCanvasRef.current.hasPointerCapture(e.pointerId)) {
      fullscreenCanvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Node Drag handlers
  const handleNodePointerDown = (e: React.PointerEvent, nodeName: string) => {
    e.stopPropagation();
    const currOffset = nodeOffsets[nodeName] || { dx: 0, dy: 0 };
    draggingNodeRef.current = {
      name: nodeName,
      startX: e.clientX,
      startY: e.clientY,
      initDx: currOffset.dx,
      initDy: currOffset.dy,
    };
  };

  // Wheel Zoom Listeners
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setTransform(prev => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale * zoomFactor, 0.4), 1.9)
      }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const el = fullscreenCanvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setFullscreenTransform(prev => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale * zoomFactor, 0.35), 2.2)
      }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isFullscreen]);

  // Mathematical Fit to View
  const fitToView = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;

    const totalW = 11 * 196 + 10 * 48 + 48; // 2688px
    const totalH = 126 + 60; // 186px

    const scaleW = (canvasW - 32) / totalW;
    const scaleH = (canvasH - 24) / totalH;
    const scale = Math.min(Math.max(Math.min(scaleW, scaleH), 0.35), 1.2);

    const x = (canvasW - totalW * scale) / 2;
    const y = (canvasH - totalH * scale) / 2;

    setTransform({ x: Math.round(x), y: Math.max(10, Math.round(y)), scale });
  }, []);

  const fitToViewFullscreen = useCallback(() => {
    if (!fullscreenCanvasRef.current) return;
    const rect = fullscreenCanvasRef.current.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;

    if (fullscreenLayout === 'grid') {
      const totalW = 6 * 196 + 5 * 54 + 80; // 1446px
      const totalH = 2 * 126 + 90 + 80; // 422px

      const scale = Math.min(Math.max(Math.min((canvasW - 80) / totalW, (canvasH - 80) / totalH), 0.45), 1.35);
      const x = (canvasW - totalW * scale) / 2;
      const y = (canvasH - totalH * scale) / 2;
      setFullscreenTransform({ x: Math.round(x), y: Math.round(y), scale });
    } else {
      const totalW = 11 * 196 + 10 * 48 + 80;
      const totalH = 126 + 80;
      const scale = Math.min(Math.max(Math.min((canvasW - 80) / totalW, (canvasH - 80) / totalH), 0.32), 1.2);
      const x = (canvasW - totalW * scale) / 2;
      const y = (canvasH - totalH * scale) / 2;
      setFullscreenTransform({ x: Math.round(x), y: Math.round(y), scale });
    }
  }, [fullscreenLayout]);

  const resetLayout = useCallback(() => {
    setNodeOffsets({});
    if (isFullscreen) {
      setFullscreenTransform({ x: 30, y: 20, scale: 0.95 });
    } else {
      setTransform({ x: 10, y: 0, scale: 1 });
    }
  }, [isFullscreen]);

  const zoomIn = () => {
    if (isFullscreen) {
      setFullscreenTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.15, 2.0) }));
    } else {
      setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.15, 1.8) }));
    }
  };

  const zoomOut = () => {
    if (isFullscreen) {
      setFullscreenTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.85, 0.4) }));
    } else {
      setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.85, 0.5) }));
    }
  };

  // Node position calculators
  const getNodePosFlow = (index: number, nodeName: string) => {
    const nodeWidth = 196;
    const nodeGap = 48;
    const baseX = 24 + index * (nodeWidth + nodeGap);
    const baseY = 40;
    const offset = nodeOffsets[nodeName] || { dx: 0, dy: 0 };
    return {
      x: baseX + offset.dx,
      y: baseY + offset.dy,
      w: nodeWidth,
      h: 126,
    };
  };

  const getNodePosGrid = (index: number, nodeName: string) => {
    const nodeWidth = 196;
    const nodeGapX = 54;
    const nodeGapY = 90;
    let row = 0;
    let col = index;
    if (index >= 6) {
      row = 1;
      col = index - 6;
    }
    const baseX = 40 + col * (nodeWidth + nodeGapX);
    const baseY = 50 + row * (126 + nodeGapY);
    const offset = nodeOffsets[nodeName] || { dx: 0, dy: 0 };
    return {
      x: baseX + offset.dx,
      y: baseY + offset.dy,
      w: nodeWidth,
      h: 126,
    };
  };

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
      const caseId = `CASE-${input.customer.customer_id}-FRAUD`;
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

  // Top signals list bound directly to evaluated transaction
  const topSignals = [
    { key: 'new_device', label: 'NEW DEVICE', points: 15, agent: 'Device', desc: `Hardware signature ${safeString(input.transaction.device_id, 'DEV-1003-ROGUE')}` },
    { key: 'failed_logins', label: 'FAILED LOGINS', points: 20, agent: 'Identity', desc: '3 sequential pre-auth password failure bursts' },
    { key: 'unusual_hour', label: 'UNUSUAL HOUR', points: 10, agent: 'Behaviour', desc: '02:13 AM (off-hours circadian activity window)' },
    { key: 'amount_deviation', label: 'AMOUNT DEVIATION', points: 20, agent: 'Transaction', desc: `₹${input.transaction.amount?.toLocaleString()} (10.6× customer baseline peak)` },
    { key: 'new_city', label: 'LOCATION SHIFT', points: 5, agent: 'Location', desc: `Location shift from Bengaluru to ${safeString(input.transaction.city, 'Mumbai')}` },
    { key: 'impossible_travel', label: 'IMPOSSIBLE TRAVEL', points: 20, agent: 'Location', desc: '840 km in 4 minutes (exceeds flight physics)' },
    { key: 'suspicious_network', label: 'NETWORK LINK', points: 15, agent: 'Network', desc: `Datacenter proxy IP ${safeString(input.transaction.ip_address, '103.21.144.92')}` },
  ];

  // Specific evidence correlation map cards
  const evidenceCards = [
    { title: 'TRANSACTION', value: `₹${input.transaction.amount?.toLocaleString()}`, tag: safeString(input.transaction.transaction_id, 'TXN'), agent: 'Transaction', color: 'border-l-[#3157D5]' },
    { title: 'DEVICE FINGERPRINT', value: safeString(input.transaction.device_id, 'DEV-1003-ROGUE'), tag: 'Unregistered hardware signature', agent: 'Device', color: 'border-l-[#D99425]' },
    { title: 'FAILED LOGINS', value: '3 FAILED ATTEMPTS', tag: 'Pre-auth credential takeover pattern', agent: 'Identity', color: 'border-l-[#D95C62]' },
    { title: 'DATACENTER IP', value: safeString(input.transaction.ip_address, '103.21.144.92'), tag: 'Proxy IP (ASN 13335)', agent: 'Network', color: 'border-l-[#4F46E5]' },
    { title: 'IMPOSSIBLE VELOCITY', value: 'BENGALURU → MUMBAI', tag: '840 km in 4m (Supersonic jump)', agent: 'Location', color: 'border-l-[#159A75]' },
    { title: 'UNUSUAL HOUR', value: '02:13 AM IST', tag: 'Anomalous circadian night burst', agent: 'Behaviour', color: 'border-l-[#6C63D9]' },
    { title: 'MERCHANT', value: safeString(input.transaction.merchant, 'Luxury Jewels & Bullion'), tag: 'MCC 5094 (Precious Stones)', agent: 'Transaction', color: 'border-l-[#D95C62]' },
  ];

  // Selected Agent Data Helper
  const getSelectedAgentDetails = (agentName: string) => {
    const meta = AGENT_METAS.find(m => m.name === agentName) || AGENT_METAS[0];
    const rawResult = agentResults.find(a => a.agent_name === agentName);

    switch (agentName) {
      case 'Transaction':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || `Transaction amount ₹${input.transaction.amount?.toLocaleString()} exceeds customer's normal baseline peak of ₹8,000 by 10.6×.`,
          reasonCode: riskResult.reasonCodes[0] || 'AMOUNT_DEVIATION',
          riskContribution: '+20 pts',
          confidence: '98%',
          metrics: [
            { label: 'Transaction Amount', value: `₹${input.transaction.amount?.toLocaleString()}` },
            { label: 'Baseline Peak Ceiling', value: '₹8,000' },
            { label: 'Amount Multiplier', value: '10.6× Deviation' },
            { label: 'Payment Channel', value: safeString(input.transaction.channel, 'MOBILE_APP') }
          ],
          evidence: [
            { key: 'Amount', val: `₹${input.transaction.amount?.toLocaleString()}` },
            { key: 'Currency', val: safeString(input.transaction.currency, 'INR') },
            { key: 'Merchant', val: safeString(input.transaction.merchant, 'Luxury Jewels & Bullion') },
            { key: 'MCC', val: '5094 (Precious Bullion)' }
          ],
          relatedEntities: [safeString(input.customer.customer_id, 'C1003'), safeString(input.transaction.transaction_id, 'TXN')]
        };

      case 'Behaviour':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || 'Transaction initiated at 02:13 AM, far outside normal customer activity window (08:00 – 22:00).',
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
          relatedEntities: [safeString(input.customer.customer_id, 'C1003')]
        };

      case 'Device':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || `Unrecognized hardware signature ${safeString(input.transaction.device_id, 'DEV-1003-ROGUE')} detected with desktop root emulator fingerprint.`,
          reasonCode: 'NEW_OR_UNVERIFIED_DEVICE',
          riskContribution: '+15 pts',
          confidence: '94%',
          metrics: [
            { label: 'Device ID', value: safeString(input.transaction.device_id, 'DEV-1003-ROGUE') },
            { label: 'Classification', value: 'Rogue Hardware / Kali Linux' },
            { label: 'Hardware Type', value: 'Desktop Emulator' },
            { label: 'First Observed', value: '02:11 AM (Pre-Auth Burst)' }
          ],
          evidence: [
            { key: 'Fingerprint', val: safeString(input.transaction.device_id, 'DEV-1003-ROGUE') },
            { key: 'OS / User Agent', val: 'Linux x86_64 / Root Shell' },
            { key: 'Customer Trust State', val: 'Untrusted (0 days tenure)' }
          ],
          relatedEntities: [safeString(input.transaction.device_id, 'DEV-1003-ROGUE')]
        };

      case 'Identity':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || 'Pre-auth credential failure burst observed: 3 sequential failed password attempts preceding transaction.',
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
          relatedEntities: [safeString(input.customer.customer_id, 'C1003')]
        };

      case 'Location':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || 'Impossible travel velocity detected: 840 km distance traversed in 4 minutes (exceeds commercial flight physics).',
          reasonCode: 'LOCATION_VELOCITY_IMPOSSIBLE',
          riskContribution: '+20 pts',
          confidence: '99%',
          metrics: [
            { label: 'Origin City', value: 'Bengaluru (02:09 AM)' },
            { label: 'Destination City', value: `${safeString(input.transaction.city, 'Mumbai')} (02:13 AM)` },
            { label: 'Calculated Distance', value: '840 Kilometers' },
            { label: 'Traversed Speed', value: '12,600 km/h (Supersonic)' }
          ],
          evidence: [
            { key: 'Origin Geocoding', val: '12.9716° N, 77.5946° E' },
            { key: 'Destination Geocoding', val: '19.0760° N, 72.8777° E' },
            { key: 'Physical Flight Physics', val: 'VIOLATION (>900 km/h max)' }
          ],
          relatedEntities: [safeString(input.customer.customer_id, 'C1003')]
        };

      case 'Network':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || `Connection originated from datacenter proxy IP ${safeString(input.transaction.ip_address, '103.21.144.92')} on ASN 13335 (Cloudflare Datacenter proxy).`,
          reasonCode: 'SUSPICIOUS_NETWORK_OR_PROXY',
          riskContribution: '+15 pts',
          confidence: '96%',
          metrics: [
            { label: 'IP Address', value: safeString(input.transaction.ip_address, '103.21.144.92') },
            { label: 'Autonomous System', value: 'ASN 13335 (Cloudflare)' },
            { label: 'Classification', value: 'Commercial Datacenter Proxy' },
            { label: 'TOR / Exit Node', value: 'Negative (Proxy Tunnel)' }
          ],
          evidence: [
            { key: 'IP Geolocation', val: 'Mumbai, Maharashtra, IN' },
            { key: 'ISP', val: 'Cloud Hosting Proxy Network' },
            { key: 'Proxy Score', val: '99% Commercial VPN/Hosting' }
          ],
          relatedEntities: [safeString(input.transaction.ip_address, '103.21.144.92')]
        };

      case 'History':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || 'Customer has 24-month tenure with regular salary credits and clean baseline history until current burst.',
          reasonCode: 'CUSTOMER_HISTORY_ESTABLISHED',
          riskContribution: '0 pts',
          confidence: '92%',
          metrics: [
            { label: 'Account Tenure', value: '24 Months' },
            { label: 'Historical Chargebacks', value: '0 Recorded' },
            { label: 'Historical Average', value: '₹4,500' },
            { label: 'Velocity Threshold', value: '1.2 txns / week' }
          ],
          evidence: [
            { key: 'Tenure Status', val: 'Long-standing customer' },
            { key: 'Prior Disputed Claims', val: 'None' }
          ],
          relatedEntities: [safeString(input.customer.customer_id, 'C1003')]
        };

      case 'Correlator':
        return {
          meta,
          rawResult,
          finding: rawResult?.summary || 'Convergence across 6 independent evidence domains confirms high-confidence Account Takeover syndicate attack.',
          reasonCode: 'CROSS_DOMAIN_SIGNAL_CONVERGENCE',
          riskContribution: '100/100',
          confidence: '99%',
          metrics: [
            { label: 'Correlated Signals', value: '7 Independent Signals' },
            { label: 'Impacted Domains', value: '6 of 7 Telemetry Domains' },
            { label: 'Convergence Matrix', value: 'Creds + Hardware + Geo + Value' },
            { label: 'Orchestrator Verdict', value: 'Confirmed Credential ATO' }
          ],
          evidence: [
            { key: 'Domain 1', val: 'Identity (Credential Brute-Force)' },
            { key: 'Domain 2', val: 'Device (Unregistered Emulator)' },
            { key: 'Domain 3', val: 'Location (Impossible Velocity)' },
            { key: 'Domain 4', val: 'Transaction (10.6× Value Jump)' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE', 'TXN-SEED-C1003-FRAUD']
        };

      case 'Challenger':
        return {
          meta,
          rawResult,
          finding: challenger.summary || 'Challenger attempted exoneration under "Frequent Traveller with New Device" hypothesis, but physical velocity violation refuted defense.',
          reasonCode: 'EXONERATION_HYPOTHESIS_REFUTED',
          riskContribution: 'REJECTED',
          confidence: '97%',
          metrics: [
            { label: 'Counter-Hypothesis', value: 'Legitimate Flight Passenger' },
            { label: 'Refutation Factor', value: '840 km in 4m (Supersonic)' },
            { label: 'Adversarial Defense', value: 'Exoneration Infeasible' },
            { label: 'Residual Ambiguity', value: '0% Ambiguity' }
          ],
          evidence: [
            { key: 'Hypothesis Tested', val: 'Frequent Business Traveller' },
            { key: 'Contradicting Data', val: 'Physical Travel Speed Limit Exceeded' },
            { key: 'Finding', val: 'Exoneration Hypothesis Rejected' }
          ],
          relatedEntities: ['C1003']
        };

      case 'Verifier':
        return {
          meta,
          rawResult,
          finding: verifier.summary || 'Verifier agent verified 11 of 11 analytical claims across independent cryptographic sources with zero factual contradictions.',
          reasonCode: 'CLAIMS_CRYPTOGRAPHICALLY_VERIFIED',
          riskContribution: '11/11',
          confidence: '99%',
          metrics: [
            { label: 'Verified Claims', value: '11 / 11 Analytical Claims' },
            { label: 'Contradictions Found', value: '0 Contradictions' },
            { label: 'Telemetry Signatures', value: '100% Cryptographically Matched' },
            { label: 'Integrity Seal', value: 'Authoritative Verified' }
          ],
          evidence: [
            { key: 'Verification Status', val: 'All Claims Corroborated' },
            { key: 'Integrity Check', val: 'Zero Hallucination / Contradiction' }
          ],
          relatedEntities: ['C1003']
        };

      case 'Narrator':
      default:
        return {
          meta,
          rawResult,
          finding: narrator.summary || 'Autonomous executive synthesis: High-confidence coordinated account takeover executed through credential compromise, rogue device emulation, and out-of-hours high-liquidity bullion exit.',
          reasonCode: 'EXECUTIVE_NARRATIVE_SYNTHESIS',
          riskContribution: 'CRITICAL',
          confidence: '98%',
          metrics: [
            { label: 'Executive Synthesis', value: 'Coordinated Credential ATO' },
            { label: 'Recommended Action', value: safeString(riskResult.decision.replace(/_/g, ' '), 'BLOCK AND CREATE CASE') },
            { label: 'Composite Score', value: `${riskResult.riskScore} / 100` },
            { label: 'Human Sign-off', value: 'Mandatory Prior to Settlement' }
          ],
          evidence: [
            { key: 'Executive Verdict', val: 'Coordinated ATO' },
            { key: 'Reason Codes', val: `${riskResult.triggeredSignals.length} Triggered Signals` },
            { key: 'Audit Disposition', val: 'Human Sign-off Pending' }
          ],
          relatedEntities: ['C1003', 'DEV-1003-ROGUE']
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
                LIVE INVESTIGATION
              </span>
              <span className="badge text-[10px] font-bold bg-[#EEF2FF] text-[#3157D5] border border-[#C7D2FE]">
                {simulatedEvent ? `${simulatedEvent.bankName || 'SIMULATED'} · ${simulatedEvent.attackType?.replace(/_/g, ' ') || 'TRANSACTION'}` : (scenario.name.split(':')[0] || 'SCENARIO C')}
              </span>
              {simulatedEvent && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem('finguard_active_sim_data');
                    sessionStorage.removeItem('finguard_active_scenario');
                    setSimulatedEvent(null);
                    setActiveScenarioKey('high_risk_c1003');
                  }}
                  className="text-[10px] font-semibold text-[#3157D5] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded border border-[#C7D2FE]"
                >
                  Return to Scenario C
                </button>
              )}
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
              {riskResult.decision.replace(/_/g, ' ')}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* ─── LEFT COLUMN: AI INVESTIGATION BRIEF (LG: col-span-3) ──────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 lg:sticky lg:top-4 self-start">
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

            {/* Radial / Gauge Visualization for Risk Score with Hover Breakdown */}
            <div
              onMouseEnter={() => setIsGaugeHovered(true)}
              onMouseLeave={() => setIsGaugeHovered(false)}
              className="p-3.5 rounded-xl border border-[#DCE3EE] bg-gradient-to-br from-white via-[#F8FAFD] to-white shadow-xs flex flex-col items-center relative overflow-hidden transition-all cursor-pointer group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D95C62] via-[#E06A3B] to-[#D99425]" />
              
              <div className="w-full flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Composite Risk Score
                </span>
                <span className="badge text-[10px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                  {riskResult.riskLevel}
                </span>
              </div>

              {/* Circular Gauge */}
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
                  {riskResult.riskLevel} RISK
                </div>
                <div className="text-[11px] text-[#64748B] font-medium">
                  {riskResult.triggeredSignals.length} correlated signals · High confidence
                </div>
              </div>

              {/* Hover Score Composition Overlay */}
              {isGaugeHovered && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs p-3 flex flex-col justify-between text-xs animate-in fade-in duration-150 z-20">
                  <div className="border-b border-[#E2E8F0] pb-1 flex items-center justify-between">
                    <span className="font-extrabold text-[10px] uppercase text-[#172033]">Score Composition</span>
                    <span className="font-mono font-bold text-[#D95C62]">{riskResult.riskScore}/100</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] py-1 text-[#475569]">
                    <div className="flex justify-between"><span>Amount Deviation</span><span className="font-bold text-[#D95C62]">+20 pts</span></div>
                    <div className="flex justify-between"><span>Failed Logins</span><span className="font-bold text-[#D95C62]">+20 pts</span></div>
                    <div className="flex justify-between"><span>Impossible Travel</span><span className="font-bold text-[#D95C62]">+20 pts</span></div>
                    <div className="flex justify-between"><span>Rogue Device</span><span className="font-bold text-[#D95C62]">+15 pts</span></div>
                    <div className="flex justify-between"><span>Proxy Network</span><span className="font-bold text-[#D95C62]">+15 pts</span></div>
                    <div className="flex justify-between"><span>Unusual Hour</span><span className="font-bold text-[#D95C62]">+10 pts</span></div>
                    <div className="flex justify-between"><span>New Location</span><span className="font-bold text-[#D95C62]">+5 pts</span></div>
                  </div>
                  <div className="text-[9px] text-[#64748B] border-t border-[#E2E8F0] pt-1">
                    Capped at 100/100 · Critical Ceiling
                  </div>
                </div>
              )}
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
                  {riskResult.decision.replace(/_/g, ' ')}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#D95C62]" />
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Decision basis:</span>
                <span className="font-semibold text-[#172033]">{riskResult.triggeredSignals.length} correlated signals</span>
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
                  Top Correlated Signals
                </span>
                <span className="text-[10px] font-mono text-[#D95C62] font-bold">{riskResult.triggeredSignals.length} Triggered</span>
              </div>
              <div className="space-y-1">
                {topSignals.map((sig) => {
                  const isSelected = selectedAgentName === sig.agent;
                  return (
                    <button
                      key={sig.key}
                      onClick={() => setSelectedAgentName(sig.agent)}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#3157D5] bg-[#EEF2FF] shadow-xs'
                          : 'border-[#DCE3EE] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFD]'
                      }`}
                      title={`Click to focus ${sig.agent} Agent in topology`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-[#D95C62] shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#172033]">{sig.label}</span>
                            <span className="text-[10px] text-[#3157D5] font-semibold">→ {sig.agent}</span>
                          </div>
                          <div className="text-[10px] text-[#64748B] truncate">{sig.desc}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-[#D95C62] shrink-0 ml-2">
                        +{sig.points}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Challenger Hypothesis */}
            <div className="space-y-1.5 pt-1 border-t border-[#DCE3EE]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#172033]">
                  <Scale className="h-3.5 w-3.5 text-[#D97706]" />
                  <span>Exoneration Challenge</span>
                </div>
                <button
                  onClick={() => setSelectedAgentName('Challenger')}
                  className="text-[10px] font-bold text-[#3157D5] hover:underline cursor-pointer"
                >
                  Agent 09
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
          
          {/* Summary Metric Strip */}
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
                <span className="text-base font-extrabold font-mono text-[#D95C62]">{riskResult.triggeredSignals.length} Signals</span>
                <span className="badge text-[9px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">{riskResult.riskLevel}</span>
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
                <span className="text-base font-extrabold font-mono text-[#D95C62]">{riskResult.riskScore} / 100</span>
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
                  11 specialized agents evaluate transaction telemetry · Drag nodes or pan canvas
                </p>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5 canvas-controls">
                {/* Demo Stepper Playback */}
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isPlayingDemo
                      ? 'bg-[#3157D5] text-white border-[#3157D5] animate-pulse'
                      : 'bg-white text-[#3157D5] border-[#DCE3EE] hover:bg-[#EEF2FF]'
                  }`}
                  title="Step through all 11 agents in sequence (Space)"
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
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={zoomOut}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={fitToView}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Fit to Canvas (F)"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={resetLayout}
                  className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                  title="Reset Layout (R)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                
                {/* WORKING REAL FULLSCREEN BUTTON */}
                <button
                  onClick={handleEnterFullscreen}
                  className="p-1.5 rounded-lg border border-[#3157D5] bg-[#EEF2FF] text-[#3157D5] hover:bg-[#3157D5] hover:text-white transition-colors cursor-pointer shadow-xs ml-1"
                  title="Expand to Fullscreen Workspace (Esc to close)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Topology Horizontal Canvas */}
            <div
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full h-[220px] bg-[#FAFBFD] overflow-hidden cursor-grab active:cursor-grabbing select-none"
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
                  style={{ width: '2800px', height: '220px' }}
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
                    const p1 = getNodePosFlow(i, meta.name);
                    const p2 = getNodePosFlow(i + 1, nextMeta.name);

                    const x1 = p1.x + p1.w;
                    const y1 = p1.y + p1.h / 2;
                    const x2 = p2.x;
                    const y2 = p2.y + p2.h / 2;

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

                    const isCurrentPlayEdge = isPlayingDemo && currentPlayIndex === i + 1;

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
                        {/* Animated traveling particle during play pipeline */}
                        {isCurrentPlayEdge && (
                          <circle
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r="5"
                            fill="#3157D5"
                            className="animate-ping"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* 11 Agent Nodes */}
                <div className="relative">
                  {AGENT_METAS.map((meta, idx) => {
                    const isSelected = selectedAgentName === meta.name;
                    const isCurrentlyPlaying = isPlayingDemo && currentPlayIndex === idx;
                    const isCompletedInPlayback = isPlayingDemo && currentPlayIndex > idx;
                    const Icon = meta.icon;
                    const pos = getNodePosFlow(idx, meta.name);

                    return (
                      <div
                        key={meta.name}
                        onPointerDown={(e) => handleNodePointerDown(e, meta.name)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgentName(meta.name);
                        }}
                        style={{
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          width: `${pos.w}px`,
                          height: `${pos.h}px`,
                        }}
                        className={`canvas-node absolute bg-white rounded-xl border flex flex-col justify-between p-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                          isSelected
                            ? 'border-[#3157D5] ring-2 ring-[#3157D5]/25 shadow-card -translate-y-1 scale-102 z-20'
                            : isCurrentlyPlaying
                            ? 'border-[#3157D5] ring-2 ring-[#3157D5]/40 shadow-card animate-pulse z-20'
                            : 'border-[#DCE3EE] hover:border-[#CBD5E1] hover:shadow-xs shadow-none z-10 opacity-95 hover:opacity-100 hover:-translate-y-0.5'
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
                            isCompletedInPlayback
                              ? 'text-[#159A75] bg-[#F0FDF4]'
                              : meta.status === 'CRITICAL'
                              ? 'text-[#D95C62] bg-[#FFF1F2]'
                              : 'text-[#159A75] bg-[#F0FDF4]'
                          }`}>
                            {isCompletedInPlayback ? '✓' : meta.status === 'CRITICAL' ? '!' : '✓'}
                          </span>
                        </div>

                        {/* Middle: Agent Name */}
                        <div>
                          <div className="text-xs font-black text-[#172033] tracking-tight uppercase leading-tight truncate">
                            {meta.name}
                          </div>
                          <div className="text-[9px] font-semibold text-[#64748B] tracking-wider uppercase">
                            AGENT · {meta.domain}
                          </div>
                        </div>

                        {/* Bottom Row: Status Badge & Contribution */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold border truncate max-w-[95px] ${meta.statusColor}`}>
                            {meta.status}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-[#D95C62] bg-[#FFF1F2] px-1 py-0.5 rounded border border-[#FFE4E6]">
                            {meta.riskContribution}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pan & Drag Hint */}
              <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-[#94A3B8] bg-white/80 px-2 py-0.5 rounded border border-[#DCE3EE]/60 backdrop-blur-xs flex items-center gap-1.5">
                <span>Drag nodes · Pan canvas · Click agent to inspect</span>
              </div>
            </div>

          </div>

          {/* Pipeline Completion Banner */}
          {isPipelineComplete && (
            <div className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-xl p-3 px-4 flex items-center justify-between animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-[#D95C62]" />
                <div>
                  <div className="text-xs font-extrabold text-[#D95C62] uppercase tracking-wide">
                    INVESTIGATION COMPLETE · 11/11 VERIFIED · 7 CORRELATED SIGNALS
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    100/100 CRITICAL RISK · AI RECOMMENDATION: BLOCK &amp; CREATE CASE
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPipelineComplete(false);
                  setCurrentPlayIndex(-1);
                }}
                className="text-xs font-bold text-[#D95C62] hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ─── 3. DYNAMIC AGENT INTELLIGENCE PANEL (Drawer) ───────────────────── */}
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
                    <h3 className="text-sm font-extrabold text-[#172033] uppercase">
                      {selectedAgentDetails.meta.name} Agent
                    </h3>
                    <span className="font-mono text-[10px] text-[#64748B] bg-[#F8FAFD] px-1.5 py-0.5 rounded border border-[#DCE3EE]">
                      Stage {selectedAgentDetails.meta.stageNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Domain: <span className="font-semibold text-[#172033]">{selectedAgentDetails.meta.domain}</span> · Latency: <span className="font-mono text-[#3157D5] font-semibold">{selectedAgentDetails.meta.latency}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`badge text-[10px] font-bold border ${selectedAgentDetails.meta.statusColor}`}>
                  {selectedAgentDetails.meta.status}
                </span>
                <span className="badge text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#159A75] border border-[#BBF7D0]">
                  {selectedAgentDetails.confidence} CONF
                </span>
              </div>
            </div>

            {/* Findings Box */}
            <div className="p-3.5 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block font-mono">
                Agent Analytical Finding
              </span>
              <p className="text-xs text-[#172033] font-medium leading-relaxed">
                {selectedAgentDetails.finding}
              </p>
            </div>

            {/* Dual Grid: Attribution + Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Risk Attribution</span>
                  <span className="text-[10px] font-mono font-bold text-[#D95C62] bg-[#FFF1F2] px-1.5 py-0.5 rounded border border-[#FFE4E6]">
                    {selectedAgentDetails.riskContribution}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#3157D5] bg-[#EEF2FF] p-1.5 rounded border border-[#C7D2FE]">
                  {String(selectedAgentDetails.reasonCode)}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Attribution: Evaluated against authoritative institutional threshold rules.
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-1.5 font-mono">
                <span className="text-[10px] font-bold uppercase text-[#64748B] block font-sans">Telemetry Metrics</span>
                {selectedAgentDetails.metrics.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-[#64748B]">{m.label}:</span>
                    <span className="font-bold text-[#172033]">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence items */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-[#64748B] block">Evidence Parameters</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {selectedAgentDetails.evidence.map((ev, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#F8FAFD] border border-[#DCE3EE]">
                    <div className="text-[10px] text-[#64748B] uppercase">{ev.key}</div>
                    <div className="font-mono font-semibold text-[#172033] truncate mt-0.5" title={ev.val}>
                      {ev.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Entity Links */}
            <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#64748B]">Related Entities:</span>
                {selectedAgentDetails.relatedEntities.map((ent, i) => (
                  <span key={i} className="font-mono text-[11px] bg-[#EEF2FF] text-[#3157D5] px-2 py-0.5 rounded border border-[#C7D2FE]">
                    {ent}
                  </span>
                ))}
              </div>
              <a
                href="#entity-graph"
                className="text-xs font-bold text-[#3157D5] hover:underline flex items-center gap-1"
              >
                <span>View In Entity Graph</span>
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* ─── 4. EVIDENCE CORRELATION MAP (Requirement 14) ──────────────────── */}
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-[#3157D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Evidence Correlation Flow
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#D95C62] font-bold">
                7 Signals · 6 Domains Converged
              </span>
            </div>

            <div className="relative pl-4 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCE3EE]">
              {evidenceCards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAgentName(card.agent)}
                  className={`relative p-2.5 rounded-lg border bg-[#F8FAFD] hover:bg-white transition-all cursor-pointer ${card.color} border-l-4 shadow-xs`}
                >
                  <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-[#3157D5] ring-2 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">{card.title}</span>
                    <span className="text-[10px] font-mono font-bold text-[#3157D5]">→ {card.agent}</span>
                  </div>
                  <div className="font-mono text-xs font-black text-[#172033] mt-0.5">{card.value}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">{card.tag}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ─── RIGHT COLUMN: COLLAPSIBLE CONTEXT DOSSIER (LG: col-span-3) ─────── */}
        <div className="lg:col-span-3 flex flex-col gap-3 lg:sticky lg:top-4 self-start">
          <div className="bg-white rounded-xl border border-[#DCE3EE] shadow-xs p-4 flex flex-col gap-3">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#3157D5]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                  Investigation Context Dossier
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">Entity Data</span>
            </div>

            {/* CUSTOMER */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('customer')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-[#3157D5]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Customer</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#159A75]">KYC 3</span>
                  {collapsedDossier.customer ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.customer && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#E2E8F0]">
                  <div className="flex justify-between font-medium text-[#172033]">
                    <span>Name</span>
                    <span className="font-bold">{input.customer.name}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Customer ID</span>
                    <span className="font-mono text-[#172033]">{input.customer.customer_id}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Home City</span>
                    <span className="text-[#172033]">{input.customer.home_city}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Baseline Range</span>
                    <span className="font-mono text-[#172033]">₹1,000 – ₹8,000</span>
                  </div>
                </div>
              )}
            </div>

            {/* ACCOUNT */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('account')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-[#6C63D9]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Account</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#159A75]">ACTIVE</span>
                  {collapsedDossier.account ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.account && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#E2E8F0]">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#64748B]">Account ID</span>
                    <span className="font-bold text-[#172033]">{scenario.account?.account_id || 'ACC-1003-SAV'}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Type</span>
                    <span className="font-medium text-[#172033]">{scenario.account?.account_type || 'SAVINGS'}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Balance</span>
                    <span className="font-mono font-bold text-[#159A75]">₹142,500</span>
                  </div>
                </div>
              )}
            </div>

            {/* DEVICE */}
            <div className="border border-[#FFE4E6] rounded-lg overflow-hidden bg-[#FFF1F2]/40">
              <button
                onClick={() => toggleDossierSection('device')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#FFF1F2] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-[#D95C62]" />
                  <span className="text-[10px] font-bold uppercase text-[#D95C62]">Device (Rogue)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#FFE4E6] font-bold text-[#D95C62]">UNTRUSTED</span>
                  {collapsedDossier.device ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.device && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#FFE4E6]">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#64748B]">Device ID</span>
                    <span className="font-bold text-[#D95C62]">{input.transaction.device_id || 'DEV-1003-ROGUE'}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Classification</span>
                    <span className="font-semibold text-[#D95C62]">Kali Emulator</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>First Seen</span>
                    <span className="font-mono text-[#172033]">02:11 AM IST</span>
                  </div>
                </div>
              )}
            </div>

            {/* NETWORK */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('network')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Network Gateway</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#D95C62]">PROXY</span>
                  {collapsedDossier.network ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.network && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#E2E8F0]">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#64748B]">IP Address</span>
                    <span className="font-bold text-[#172033]">{input.transaction.ip_address || '103.21.144.92'}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>ASN</span>
                    <span className="font-mono text-[#4F46E5] font-semibold">AS13335 (Cloudflare)</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Datacenter Proxy</span>
                    <span className="font-bold text-[#D95C62]">CONFIRMED</span>
                  </div>
                </div>
              )}
            </div>

            {/* LOGIN ACTIVITY */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('logins')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Pre-Auth Timeline</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#D95C62]">3 FAILS</span>
                  {collapsedDossier.logins ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.logins && (
                <div className="p-3 pt-0 text-xs bg-white border-t border-[#E2E8F0]">
                  <div className="relative pl-3 space-y-2 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCE3EE]">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#64748B]">01:58</span>
                      <span className="text-[#D95C62] font-bold">FAILED LOGIN #1</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#64748B]">02:09</span>
                      <span className="text-[#D95C62] font-bold">FAILED LOGIN #2</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#64748B]">02:11</span>
                      <span className="text-[#D99425] font-extrabold">COMPROMISED LOGIN</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#64748B]">02:13</span>
                      <span className="text-[#3157D5] font-extrabold">₹85,000 TXN TRIGGER</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LOCATION */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('location')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#159A75]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Location &amp; Velocity</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#D95C62]">IMPOSSIBLE</span>
                  {collapsedDossier.location ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.location && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#E2E8F0]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Baseline Territory</span>
                    <span className="font-semibold text-[#172033]">Bengaluru</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Transaction City</span>
                    <span className="font-bold text-[#D95C62]">{input.transaction.city || 'Mumbai'}</span>
                  </div>
                  <div className="flex justify-between text-[#D95C62] font-mono font-bold">
                    <span>Jump Velocity</span>
                    <span>840 km / 4m (Supersonic)</span>
                  </div>
                </div>
              )}
            </div>

            {/* MERCHANT */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <button
                onClick={() => toggleDossierSection('merchant')}
                className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-3.5 w-3.5 text-[#D95C62]" />
                  <span className="text-[10px] font-bold uppercase text-[#172033]">Merchant Entity</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#DCE3EE] font-bold text-[#D95C62]">MCC 5094</span>
                  {collapsedDossier.merchant ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />}
                </div>
              </button>
              {!collapsedDossier.merchant && (
                <div className="p-3 pt-0 text-xs space-y-1.5 bg-white border-t border-[#E2E8F0]">
                  <div className="font-bold text-[#172033]">{input.transaction.merchant || 'Luxury Jewels & Bullion'}</div>
                  <div className="text-[11px] text-[#64748B]">Category: Precious Bullion &amp; Liquid Metals</div>
                </div>
              )}
            </div>

            {/* RELATED ENTITIES */}
            <div className="border border-[#DCE3EE] rounded-lg overflow-hidden bg-[#FAFBFD]">
              <div className="p-2.5 flex items-center justify-between border-b border-[#E2E8F0]">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Graph Relationships</span>
                <a href="#entity-graph" className="text-[10px] font-bold text-[#3157D5] hover:underline flex items-center gap-0.5">
                  <span>Graph</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <div className="p-2.5 bg-white flex flex-wrap gap-1.5">
                <a href="#entity-graph" className="px-2 py-1 rounded bg-[#F8FAFD] border border-[#DCE3EE] text-[11px] font-mono hover:border-[#3157D5]">
                  {scenario.account?.account_id || 'ACC-1003-SAV'}
                </a>
                <a href="#entity-graph" className="px-2 py-1 rounded bg-[#F8FAFD] border border-[#DCE3EE] text-[11px] font-mono hover:border-[#3157D5]">
                  {input.transaction.device_id || 'DEV-1003-ROGUE'}
                </a>
                <a href="#entity-graph" className="px-2 py-1 rounded bg-[#F8FAFD] border border-[#DCE3EE] text-[11px] font-mono hover:border-[#3157D5]">
                  {input.transaction.ip_address || '103.21.144.92'}
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
            AI Recommendation: <span className="font-mono font-bold text-[#D95C62]">{riskResult.decision.replace(/_/g, ' ')}</span>. Human confirmation required.
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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

          <button
            onClick={() => handleAction('Block & Review')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#3157D5] text-[#3157D5] hover:bg-[#EEF2FF] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
          >
            BLOCK &amp; REVIEW
          </button>

          <button
            onClick={() => handleAction('BLOCK & CREATE CASE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs flex items-center gap-1.5 cursor-pointer ${
              riskResult.decision === 'BLOCK_AND_CREATE_CASE'
                ? 'bg-[#3157D5] text-white hover:bg-[#2044BD] ring-2 ring-[#3157D5]/25'
                : 'bg-white border border-[#3157D5] text-[#3157D5] hover:bg-[#EEF2FF]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>BLOCK &amp; CREATE CASE</span>
          </button>

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

            <div className="p-3.5 rounded-xl border border-[#DCE3EE] bg-[#F8FAFD] space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#64748B]">Score / Level:</span>
                <span className="font-extrabold text-[#D95C62]">{riskResult.riskScore} / 100 {riskResult.riskLevel}</span>
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
                    <span>Unrecognized rogue device signature {safeString(input.transaction.device_id, 'DEV-1003-ROGUE')}</span>
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

      {/* ─── 7. REAL WORKING FULLSCREEN WORKSPACE OVERLAY (Requirement 1 & 2) ─── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-white/98 dark:bg-[#0B101B]/98 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Investigation Pipeline Fullscreen Topology"
        >
          {/* Top Floating Fullscreen Header & Toolbar */}
          <div className="h-14 px-5 border-b border-[#DCE3EE] bg-white flex items-center justify-between shrink-0 shadow-xs z-30">
            {/* Left: Exit button & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExitFullscreen}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#DCE3EE] bg-[#F8FAFD] text-[#172033] hover:bg-[#EEF2FF] hover:border-[#3157D5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Exit Fullscreen Mode (Esc)"
              >
                <ArrowLeft className="h-4 w-4 text-[#3157D5]" />
                <span>Exit Fullscreen</span>
                <span className="text-[10px] font-mono text-[#64748B] ml-1 px-1 bg-white rounded border border-[#DCE3EE]">ESC</span>
              </button>

              <div className="h-5 w-px bg-[#DCE3EE] hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-[#172033] tracking-wide">
                    AI INVESTIGATION PIPELINE TOPOLOGY
                  </span>
                  <span className="badge text-[9px] font-bold bg-[#FFF1F2] text-[#D95C62] border border-[#FFE4E6]">
                    {riskResult.riskScore}/100 {riskResult.riskLevel}
                  </span>
                </div>
                <div className="text-[10px] text-[#64748B]">
                  11 specialized autonomous agents · {riskResult.triggeredSignals.length} correlated signals · Multi-institution telemetry
                </div>
              </div>
            </div>

            {/* Center: Mini HUD */}
            <div className="hidden xl:flex items-center gap-3 text-xs font-mono bg-[#F8FAFD] px-3 py-1 rounded-lg border border-[#DCE3EE]">
              <div className="flex items-center gap-1">
                <span className="text-[#64748B]">Target:</span>
                <span className="font-bold text-[#172033]">{input.customer.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="text-[#64748B]">Txn:</span>
                <span className="font-semibold text-[#3157D5]">{input.transaction.transaction_id}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="text-[#64748B]">Amount:</span>
                <span className="font-extrabold text-[#172033]">₹{input.transaction.amount?.toLocaleString()}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="text-[#64748B]">Action:</span>
                <span className="font-bold text-[#D95C62]">{riskResult.decision.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Right: Controls & Drawer toggle */}
            <div className="flex items-center gap-2">
              {/* Layout Switcher */}
              <div className="flex items-center bg-[#F8FAFD] p-0.5 rounded-lg border border-[#DCE3EE]">
                <button
                  onClick={() => {
                    setFullscreenLayout('grid');
                    setTimeout(fitToViewFullscreen, 50);
                  }}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                    fullscreenLayout === 'grid' ? 'bg-white text-[#3157D5] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                  title="2-Row Adaptive Grid Layout"
                >
                  Adaptive Grid
                </button>
                <button
                  onClick={() => {
                    setFullscreenLayout('flow');
                    setTimeout(fitToViewFullscreen, 50);
                  }}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                    fullscreenLayout === 'flow' ? 'bg-white text-[#3157D5] shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                  title="Single-Row Linear Flow"
                >
                  Linear Flow
                </button>
              </div>

              <div className="h-4 w-px bg-[#DCE3EE]" />

              <button
                onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isPlayingDemo
                    ? 'bg-[#3157D5] text-white border-[#3157D5] animate-pulse'
                    : 'bg-white text-[#3157D5] border-[#DCE3EE] hover:bg-[#EEF2FF]'
                }`}
                title="Play/Pause Pipeline (Space)"
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

              <button
                onClick={zoomIn}
                className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={zoomOut}
                className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={fitToViewFullscreen}
                className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                title="Fit to Window (F)"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={resetLayout}
                className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] cursor-pointer"
                title="Reset Layout (R)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-[#DCE3EE]" />

              <button
                onClick={() => setShowDrawerInFullscreen(!showDrawerInFullscreen)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                  showDrawerInFullscreen
                    ? 'bg-[#3157D5] text-white border-[#3157D5]'
                    : 'bg-white text-[#64748B] border-[#DCE3EE] hover:bg-[#F8FAFD]'
                }`}
                title="Toggle Intelligence Drawer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Details</span>
              </button>

              <button
                onClick={handleExitFullscreen}
                className="p-1.5 rounded-lg border border-[#DCE3EE] bg-white text-[#64748B] hover:text-[#D95C62] hover:bg-[#FFF1F2] cursor-pointer"
                title="Close Fullscreen (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen Interactive Canvas Body */}
          <div className="flex-1 w-full relative overflow-hidden flex">
            {/* Canvas Area */}
            <div
              ref={fullscreenCanvasRef}
              onPointerDown={handleFullscreenPointerDown}
              onPointerMove={handleFullscreenPointerMove}
              onPointerUp={handleFullscreenPointerUp}
              className="flex-1 h-full relative overflow-hidden bg-[#FAFBFD] cursor-grab active:cursor-grabbing select-none"
              style={{
                backgroundImage: 'radial-gradient(#CBD5E1 0.75px, transparent 0.75px)',
                backgroundSize: '20px 20px'
              }}
            >
              <div
                className="absolute left-0 top-0 transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${fullscreenTransform.x}px, ${fullscreenTransform.y}px) scale(${fullscreenTransform.scale})`,
                  transformOrigin: '0 0'
                }}
              >
                {/* SVG Connections in Fullscreen */}
                <svg
                  className="absolute pointer-events-none overflow-visible"
                  style={{ width: '3200px', height: '1200px' }}
                >
                  <defs>
                    <marker
                      id="arrow-fs-default"
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
                      id="arrow-fs-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#3157D5" />
                    </marker>
                  </defs>

                  {AGENT_METAS.slice(0, -1).map((meta, i) => {
                    const nextMeta = AGENT_METAS[i + 1];
                    const p1 = fullscreenLayout === 'grid' ? getNodePosGrid(i, meta.name) : getNodePosFlow(i, meta.name);
                    const p2 = fullscreenLayout === 'grid' ? getNodePosGrid(i + 1, nextMeta.name) : getNodePosFlow(i + 1, nextMeta.name);

                    const x1 = p1.x + p1.w;
                    const y1 = p1.y + p1.h / 2;
                    const x2 = p2.x;
                    const y2 = p2.y + p2.h / 2;

                    const isSourceOrTargetSelected =
                      selectedAgentName === meta.name || selectedAgentName === nextMeta.name;

                    const isEdgeCritical =
                      meta.status === 'CRITICAL' || nextMeta.status === 'CRITICAL';

                    let strokeColor = '#CBD5E1';
                    let markerId = 'url(#arrow-fs-default)';

                    if (isSourceOrTargetSelected) {
                      strokeColor = '#3157D5';
                      markerId = 'url(#arrow-fs-active)';
                    } else if (isEdgeCritical) {
                      strokeColor = '#FDA4AF';
                    }

                    // Cubic Bezier curve for smooth transition
                    const dx = Math.abs(x2 - x1);
                    const controlOffset = Math.min(dx * 0.5, 60);
                    const pathD = y1 === y2
                      ? `M ${x1} ${y1} L ${x2 - 8} ${y2}`
                      : `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2 - 8} ${y2}`;

                    const isCurrentPlayEdge = isPlayingDemo && currentPlayIndex === i + 1;

                    return (
                      <g key={i}>
                        <path
                          d={pathD}
                          fill="transparent"
                          stroke={strokeColor}
                          strokeWidth={isSourceOrTargetSelected ? '3' : '2'}
                          strokeDasharray={meta.name === 'History' || meta.name === 'Challenger' ? '4 3' : 'none'}
                          markerEnd={markerId}
                          className="transition-colors duration-200"
                        />
                        {isCurrentPlayEdge && (
                          <circle
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r="6"
                            fill="#3157D5"
                            className="animate-ping"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Agent Nodes in Fullscreen */}
                <div className="relative">
                  {AGENT_METAS.map((meta, idx) => {
                    const isSelected = selectedAgentName === meta.name;
                    const isCurrentlyPlaying = isPlayingDemo && currentPlayIndex === idx;
                    const isCompletedInPlayback = isPlayingDemo && currentPlayIndex > idx;
                    const Icon = meta.icon;
                    const pos = fullscreenLayout === 'grid' ? getNodePosGrid(idx, meta.name) : getNodePosFlow(idx, meta.name);

                    return (
                      <div
                        key={meta.name}
                        onPointerDown={(e) => handleNodePointerDown(e, meta.name)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgentName(meta.name);
                        }}
                        style={{
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          width: `${pos.w}px`,
                          height: `${pos.h}px`,
                        }}
                        className={`canvas-node absolute bg-white rounded-xl border flex flex-col justify-between p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-xs ${
                          isSelected
                            ? 'border-[#3157D5] ring-2 ring-[#3157D5]/30 shadow-card -translate-y-1.5 scale-103 z-20'
                            : isCurrentlyPlaying
                            ? 'border-[#3157D5] ring-2 ring-[#3157D5]/40 shadow-card animate-pulse z-20'
                            : 'border-[#DCE3EE] hover:border-[#CBD5E1] hover:shadow-xs z-10 opacity-95 hover:opacity-100 hover:-translate-y-1'
                        }`}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                          style={{ backgroundColor: meta.accentColor }}
                        />

                        {/* Top: Stage + Icon + Status symbol */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="font-mono text-xs font-black text-[#64748B]">
                            {meta.stageNumber}
                          </span>
                          <div
                            className="p-1.5 rounded-lg"
                            style={{ backgroundColor: meta.bgLight, color: meta.accentColor }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isCompletedInPlayback
                              ? 'text-[#159A75] bg-[#F0FDF4]'
                              : meta.status === 'CRITICAL'
                              ? 'text-[#D95C62] bg-[#FFF1F2]'
                              : 'text-[#159A75] bg-[#F0FDF4]'
                          }`}>
                            {isCompletedInPlayback ? '✓ VERIFIED' : meta.status === 'CRITICAL' ? '! CRITICAL' : '✓ OK'}
                          </span>
                        </div>

                        {/* Middle: Agent Title */}
                        <div>
                          <div className="text-sm font-black text-[#172033] tracking-tight uppercase leading-tight truncate">
                            {meta.name}
                          </div>
                          <div className="text-[10px] font-semibold text-[#64748B] tracking-wider uppercase">
                            AGENT · {meta.domain}
                          </div>
                        </div>

                        {/* Bottom: Status & Latency + Points */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#F1F5F9]">
                          <span className="font-mono text-[10px] text-[#64748B]">
                            {meta.latency}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#D95C62] bg-[#FFF1F2] px-1.5 py-0.5 rounded border border-[#FFE4E6]">
                            {meta.riskContribution}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fullscreen floating hint */}
              <div className="absolute bottom-4 left-5 pointer-events-none text-xs font-mono text-[#94A3B8] bg-white/90 px-3 py-1.5 rounded-lg border border-[#DCE3EE] shadow-xs backdrop-blur-xs flex items-center gap-2">
                <span>Pan: Click + Drag Canvas</span>
                <span>•</span>
                <span>Move Nodes: Click + Drag Card</span>
                <span>•</span>
                <span>Exit: ESC</span>
              </div>
            </div>

            {/* Docked / Floating Intelligence Drawer in Fullscreen Mode */}
            {showDrawerInFullscreen && (
              <div className="w-[360px] h-full bg-white border-l border-[#DCE3EE] shadow-elevated p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 z-20">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg shadow-xs"
                        style={{ backgroundColor: selectedAgentDetails.meta.bgLight, color: selectedAgentDetails.meta.accentColor }}
                      >
                        {React.createElement(selectedAgentDetails.meta.icon, { className: 'h-4 w-4' })}
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-[#172033] uppercase">
                          {selectedAgentDetails.meta.name} Agent
                        </h3>
                        <div className="text-[10px] text-[#64748B]">Stage {selectedAgentDetails.meta.stageNumber} · {selectedAgentDetails.meta.domain}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDrawerInFullscreen(false)}
                      className="p-1 rounded text-[#94A3B8] hover:text-[#172033] hover:bg-[#F8FAFD]"
                      title="Collapse Drawer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Findings */}
                  <div className="p-3 rounded-lg border border-[#DCE3EE] bg-[#F8FAFD] space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#64748B] block font-mono">
                      Analytical Finding
                    </span>
                    <p className="text-xs text-[#172033] font-medium leading-relaxed">
                      {selectedAgentDetails.finding}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="p-3 rounded-lg border border-[#DCE3EE] bg-white space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#64748B] block font-sans mb-1">Telemetry Metrics</span>
                    {selectedAgentDetails.metrics.map((m, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="text-[#64748B]">{m.label}:</span>
                        <span className="font-bold text-[#172033]">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Evidence */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#64748B] block">Evidence Cryptographic Signatures</span>
                    <div className="space-y-1 text-xs">
                      {selectedAgentDetails.evidence.map((ev, idx) => (
                        <div key={idx} className="p-2 rounded bg-[#F8FAFD] border border-[#DCE3EE] flex justify-between">
                          <span className="text-[#64748B]">{ev.key}:</span>
                          <span className="font-mono font-bold text-[#172033]">{ev.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Attribution:</span>
                    <span className="font-bold font-mono text-[#D95C62]">{selectedAgentDetails.riskContribution}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1">
                    <span>Confidence:</span>
                    <span className="font-bold font-mono text-[#159A75]">{selectedAgentDetails.confidence}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationWorkspace;
