import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Network,
  User,
  CreditCard,
  Activity,
  Smartphone,
  MapPin,
  Store,
  Maximize,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  X,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Globe,
  GitMerge,
  FileText,
  CheckCircle2,
  ChevronRight,
  Route,
} from 'lucide-react';
import {
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_ACCOUNTS,
  SYNTHETIC_TRANSACTIONS,
  SYNTHETIC_DEVICES,
  SYNTHETIC_MERCHANTS,
  SYNTHETIC_NETWORK_SIGNALS,
} from '../data/scenarios';
import { DEMO_IDENTITIES } from '../data/phoneFixtures';
import { Transaction, Case, Customer, Device } from '../types';
import { transactionsCol, casesCol, devicesCol } from '../firebase/collections';
import { getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { FraudCaseReportModal } from '../components/reports/FraudCaseReportModal';

// ─── TYPES & DATA CONTRACTS ──────────────────────────────────────────────────
export type NodeType = 'Customer' | 'Account' | 'Transaction' | 'Device' | 'Network' | 'Merchant';

export type EdgeCategory = 'DIRECT_EVIDENCE' | 'OBSERVED_RELATION' | 'INFERRED_SUSPICIOUS';

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  isHighRisk: boolean;
  x: number;
  y: number;
  riskScore?: number;
  riskTier?: string;
  amount?: number;
  decision?: string;
  data?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  category: EdgeCategory;
  explanation: string;
  sourceRecord: string;
  isSuspicious?: boolean;
}

export type InvestigationCluster =
  | 'FRAUD_RING_SCENARIO_E'
  | 'ATO_HERO_C1003'
  | 'BASELINE_C1001'
  | 'MULTI_BANK_FLEET'
  | 'ALL_ENTITIES';

// Entity Styling
const entityTypeConfig: Record<
  NodeType,
  {
    color: string;
    colorDark: string;
    bgLight: string;
    bgDark: string;
    label: string;
  }
> = {
  Customer: {
    color: '#3157D5',
    colorDark: '#5B7CFF',
    bgLight: '#EEF2FF',
    bgDark: 'rgba(91, 124, 255, 0.15)',
    label: 'Customer',
  },
  Account: {
    color: '#6C63D9',
    colorDark: '#8B7CFF',
    bgLight: '#F3F0FF',
    bgDark: 'rgba(139, 124, 255, 0.15)',
    label: 'Account',
  },
  Transaction: {
    color: '#159A9C',
    colorDark: '#22C7C9',
    bgLight: '#E6F7F7',
    bgDark: 'rgba(34, 199, 201, 0.15)',
    label: 'Transaction',
  },
  Device: {
    color: '#D99425',
    colorDark: '#F2B84B',
    bgLight: '#FEFCE8',
    bgDark: 'rgba(242, 184, 75, 0.15)',
    label: 'Device',
  },
  Network: {
    color: '#D95C62',
    colorDark: '#FF6B76',
    bgLight: '#FFF1F2',
    bgDark: 'rgba(255, 107, 118, 0.15)',
    label: 'Network / IP',
  },
  Merchant: {
    color: '#159A75',
    colorDark: '#35C995',
    bgLight: '#F0FDF4',
    bgDark: 'rgba(53, 201, 149, 0.15)',
    label: 'Merchant',
  },
};

export const EntityGraph: React.FC = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  // 1. Investigation Cluster Selection
  const [activeCluster, setActiveCluster] = useState<InvestigationCluster>('FRAUD_RING_SCENARIO_E');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('C1015');

  // 2. Real-time Firestore Sync State
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [liveCases, setLiveCases] = useState<Case[]>([]);
  const [liveDevices, setLiveDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // 3. Graph Core State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  // 4. Selection & Interactive Navigation Stack
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState<number>(-1);

  // 5. Path Highlighting State (BFS)
  const [pathSourceId, setPathSourceId] = useState<string | null>(null);
  const [pathTargetId, setPathTargetId] = useState<string | null>(null);
  const [highlightedPathNodeIds, setHighlightedPathNodeIds] = useState<Set<string>>(new Set());
  const [highlightedPathEdgeIds, setHighlightedPathEdgeIds] = useState<Set<string>>(new Set());

  // 6. Filtering State
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterAmount, setFilterAmount] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 7. Pan and Zoom Transform State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 8. Fraud Case Report Modal State
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    caseData?: Case | null;
    transactionData?: Transaction | null;
  }>({
    isOpen: false,
    caseData: null,
    transactionData: null,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FIRESTORE LIVE SYNC (GRACEFUL FALLBACK)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isMounted = true;
    const fetchFirestoreRecords = async () => {
      setLoading(true);
      try {
        const [txSnap, caseSnap, devSnap] = await Promise.all([
          getDocs(query(transactionsCol(), orderBy('timestamp', 'desc'), limit(50))).catch(
            () => null
          ),
          getDocs(query(casesCol(), orderBy('createdAt', 'desc'), limit(30))).catch(() => null),
          getDocs(query(devicesCol(), limit(30))).catch(() => null),
        ]);

        if (isMounted) {
          if (txSnap && !txSnap.empty) {
            const txs: Transaction[] = [];
            txSnap.forEach((d) => txs.push({ ...d.data(), transaction_id: d.id } as Transaction));
            setLiveTransactions(txs);
          }
          if (caseSnap && !caseSnap.empty) {
            const cs: Case[] = [];
            caseSnap.forEach((d) => cs.push({ ...d.data(), id: d.id } as Case));
            setLiveCases(cs);
          }
          if (devSnap && !devSnap.empty) {
            const devs: Device[] = [];
            devSnap.forEach((d) => devs.push({ ...d.data(), device_id: d.id } as Device));
            setLiveDevices(devs);
          }
          setFirestoreError(null);
        }
      } catch (err: any) {
        console.warn('[EntityGraph] Firestore sync notice (falling back to fixtures):', err);
        if (isMounted) setFirestoreError('Using local synthetic ledger');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFirestoreRecords();
    return () => {
      isMounted = false;
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // GRAPH BUILD PIPELINE (COORDINATED FRAUD RING & ENTITY MESH)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    const addNode = (node: GraphNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        newNodes.push(node);
      }
    };

    const addEdge = (edge: GraphEdge) => {
      // Avoid duplicate parallel edges with same id
      if (!newEdges.some((e) => e.id === edge.id)) {
        newEdges.push(edge);
      }
    };

    // Combine synthetic transactions with real Firestore transactions
    const allTransactions = [...SYNTHETIC_TRANSACTIONS];
    liveTransactions.forEach((ltx) => {
      if (!allTransactions.some((t) => t.transaction_id === ltx.transaction_id)) {
        allTransactions.push(ltx);
      }
    });

    if (activeCluster === 'FRAUD_RING_SCENARIO_E') {
      // ───────────────────────────────────────────────────────────────────────
      // SCENARIO E: COORDINATED FRAUD RING CLUSTER (C1015, C1016, C1017, C1018)
      // ───────────────────────────────────────────────────────────────────────
      const ringCustomerIds = ['C1015', 'C1016', 'C1017', 'C1018'];
      const sharedDeviceId = 'DEV-RING-DEVICE-01';
      const sharedIpAddress = '185.220.101.5';
      const cryptoMerchantName = 'PeerTrade P2P Crypto Exchange';

      // 1. Center Hub: Shared Device Node
      addNode({
        id: sharedDeviceId,
        type: 'Device',
        title: 'Hardware Emulator Hub',
        subtitle: sharedDeviceId,
        icon: Smartphone,
        isHighRisk: true,
        riskScore: 92,
        riskTier: 'CRITICAL',
        x: 0,
        y: 0,
        data: {
          model: 'Google Pixel 7 (Rooted Android Emulator)',
          fingerprint: 'EMU-ROBOT-SIG-88219',
          status: 'UNTRUSTED_FLAGGED',
          sharedWith: ringCustomerIds.join(', '),
        },
      });

      // 2. Center Hub: Shared Datacenter Proxy IP
      addNode({
        id: sharedIpAddress,
        type: 'Network',
        title: 'Datacenter Proxy Hub',
        subtitle: sharedIpAddress,
        icon: Globe,
        isHighRisk: true,
        riskScore: 88,
        riskTier: 'HIGH',
        x: 0,
        y: 180,
        data: {
          ip: sharedIpAddress,
          type: 'Datacenter / Tor Exit Proxy',
          city: 'Frankfurt / Multi-hop',
          risk_weight: 85,
        },
      });

      // 3. Central Mule Beneficiary / Merchant
      const merchantId = 'MERCH_06';
      addNode({
        id: merchantId,
        type: 'Merchant',
        title: cryptoMerchantName,
        subtitle: 'Crypto P2P Gateway',
        icon: Store,
        isHighRisk: true,
        riskScore: 78,
        riskTier: 'HIGH',
        x: 0,
        y: -180,
        data: {
          name: cryptoMerchantName,
          category: 'CRYPTO / P2P ESCROW',
          beneficiary: 'MULE-WALLET-XYZ-99',
          mcc: '6051',
        },
      });

      // Inferred Suspicious Edge: Shared Infrastructure between Device and Proxy
      addEdge({
        id: `e-hub-dev-ip`,
        source: sharedDeviceId,
        target: sharedIpAddress,
        relationType: 'SHARED_PROXY_TUNNEL',
        category: 'INFERRED_SUSPICIOUS',
        explanation:
          'Device DEV-RING-DEVICE-01 systematically routes transactions via Datacenter Proxy 185.220.101.5.',
        sourceRecord: 'Network Telemetry & TCP Handshake Fingerprint',
        isSuspicious: true,
      });

      // 4. Radial Ring Customers and Their Accounts
      const radiusX = 420;
      const radiusY = 280;
      ringCustomerIds.forEach((cId, idx) => {
        const cust = SYNTHETIC_CUSTOMERS[cId as keyof typeof SYNTHETIC_CUSTOMERS];
        if (!cust) return;

        // Position 4 customers around the central hub
        const angle = (idx * Math.PI) / 2 + Math.PI / 4;
        const custX = Math.round(Math.cos(angle) * radiusX);
        const custY = Math.round(Math.sin(angle) * radiusY);

        // Customer Node
        addNode({
          id: cust.customer_id,
          type: 'Customer',
          title: cust.name,
          subtitle: `${cust.customer_id} • ${cust.occupation || 'Mule Profile'}`,
          icon: User,
          isHighRisk: true,
          riskScore: 85,
          riskTier: 'HIGH',
          x: custX,
          y: custY,
          data: cust,
        });

        // Account Node
        const accId = cust.primary_account_id || `ACC-${cId}-MULE`;
        const acc = SYNTHETIC_ACCOUNTS[accId];
        const accX = custX > 0 ? custX + 160 : custX - 160;
        const accY = custY;

        addNode({
          id: accId,
          type: 'Account',
          title: acc?.account_type || 'Savings Mule',
          subtitle: accId,
          icon: CreditCard,
          isHighRisk: true,
          riskScore: 80,
          riskTier: 'HIGH',
          x: accX,
          y: accY,
          data: acc || { account_id: accId, customer_id: cId, status: 'FLAGGED' },
        });

        // Direct Evidence Edge: Customer -> Account
        addEdge({
          id: `e-${cust.customer_id}-${accId}`,
          source: cust.customer_id,
          target: accId,
          relationType: 'ACCOUNT_HOLDER',
          category: 'DIRECT_EVIDENCE',
          explanation: `${cust.name} (${cId}) is the registered titular owner of account ${accId}.`,
          sourceRecord: `Firestore /accounts (${accId})`,
          isSuspicious: false,
        });

        // Inferred Suspicious Edge: Customer -> Shared Device
        addEdge({
          id: `e-inferred-${cId}-${sharedDeviceId}`,
          source: cust.customer_id,
          target: sharedDeviceId,
          relationType: 'SHARED_HARDWARE_FINGERPRINT',
          category: 'INFERRED_SUSPICIOUS',
          explanation: `Customer ${cust.name} (${cId}) shares device hardware fingerprint DEV-RING-DEVICE-01 with 3 other accounts.`,
          sourceRecord: `Device Registry & Telemetry (DEV-RING-DEVICE-01)`,
          isSuspicious: true,
        });

        // Observed Edge: Customer -> Shared Proxy
        addEdge({
          id: `e-inferred-${cId}-${sharedIpAddress}`,
          source: cust.customer_id,
          target: sharedIpAddress,
          relationType: 'SHARED_EGRESS_IP',
          category: 'OBSERVED_RELATION',
          explanation: `Login events and payments for ${cId} originate from common proxy subnet ${sharedIpAddress}.`,
          sourceRecord: `Firestore /login_events & network_signals`,
          isSuspicious: true,
        });

        // Ring Transactions
        const txs = allTransactions.filter((t) => t.customer_id === cId);
        txs.forEach((tx, tIdx) => {
          const txX = custX > 0 ? custX + 80 : custX - 80;
          const txY = custY > 0 ? custY + 120 + tIdx * 90 : custY - 120 - tIdx * 90;

          addNode({
            id: tx.transaction_id,
            type: 'Transaction',
            title: `₹${tx.amount.toLocaleString('en-IN')}`,
            subtitle: `${tx.transaction_id} • ${tx.status}`,
            icon: Activity,
            isHighRisk: true,
            riskScore: tx.risk_score || 85,
            riskTier: 'CRITICAL',
            amount: tx.amount,
            decision: tx.decision || 'BLOCK_AND_CREATE_CASE',
            x: txX,
            y: txY,
            data: tx,
          });

          // Direct Evidence: Account -> Transaction
          addEdge({
            id: `e-${accId}-${tx.transaction_id}`,
            source: accId,
            target: tx.transaction_id,
            relationType: 'TRANSACTION_DEBIT',
            category: 'DIRECT_EVIDENCE',
            explanation: `Account ${accId} executed payment of ₹${tx.amount.toLocaleString(
              'en-IN'
            )} via IMPS.`,
            sourceRecord: `Firestore /transactions (${tx.transaction_id})`,
            isSuspicious: false,
          });

          // Observed Relation: Transaction -> Merchant
          addEdge({
            id: `e-${tx.transaction_id}-${merchantId}`,
            source: tx.transaction_id,
            target: merchantId,
            relationType: 'ESCROW_SETTLEMENT',
            category: 'OBSERVED_RELATION',
            explanation: `Transaction routed to ${cryptoMerchantName} destination wallet MULE-WALLET-XYZ-99.`,
            sourceRecord: `Firestore /transactions (${tx.transaction_id})`,
            isSuspicious: true,
          });

          // Observed Relation: Transaction -> Device
          addEdge({
            id: `e-${tx.transaction_id}-${sharedDeviceId}`,
            source: tx.transaction_id,
            target: sharedDeviceId,
            relationType: 'EXECUTED_ON_DEVICE',
            category: 'OBSERVED_RELATION',
            explanation: `Payment originated from physical/emulated hardware ${sharedDeviceId}.`,
            sourceRecord: `Transaction Hardware Signature`,
            isSuspicious: true,
          });
        });
      });
    } else {
      // ───────────────────────────────────────────────────────────────────────
      // SINGLE CUSTOMER / DEMO IDENTITY VIEW (C1001, C1003, C1002, C1004, etc.)
      // ───────────────────────────────────────────────────────────────────────
      const targetCustId =
        activeCluster === 'ATO_HERO_C1003'
          ? 'C1003'
          : activeCluster === 'BASELINE_C1001'
          ? 'C1001'
          : selectedCustomerId;

      const cust: Customer =
        SYNTHETIC_CUSTOMERS[targetCustId as keyof typeof SYNTHETIC_CUSTOMERS] ||
        (DEMO_IDENTITIES[targetCustId] ? DEMO_IDENTITIES[targetCustId].customer : undefined) ||
        Object.values(SYNTHETIC_CUSTOMERS)[0];

      const accs = Object.values(SYNTHETIC_ACCOUNTS).filter(
        (a) => a.customer_id === cust.customer_id
      );
      const txs = allTransactions.filter((t) => t.customer_id === cust.customer_id);

      // Level 0: Customer
      const isCustHighRisk =
        cust.risk_profile === 'HIGH' || cust.customer_id === 'C1003' || cust.customer_id === 'C1015';
      addNode({
        id: cust.customer_id,
        type: 'Customer',
        title: cust.name,
        subtitle: `${cust.customer_id} • ${cust.home_city}`,
        icon: User,
        isHighRisk: isCustHighRisk,
        riskScore: isCustHighRisk ? 85 : 15,
        riskTier: isCustHighRisk ? 'HIGH' : 'LOW',
        x: 0,
        y: 0,
        data: cust,
      });

      // Level 1: Accounts
      const accSpacing = 320;
      const startXAcc = -((accs.length - 1) * accSpacing) / 2;
      accs.forEach((acc, i) => {
        const accX = startXAcc + i * accSpacing;
        addNode({
          id: acc.account_id,
          type: 'Account',
          title: acc.account_type,
          subtitle: `${acc.account_id} • Balance ₹${acc.current_balance?.toLocaleString('en-IN')}`,
          icon: CreditCard,
          isHighRisk: isCustHighRisk,
          x: accX,
          y: 160,
          data: acc,
        });

        addEdge({
          id: `e-${cust.customer_id}-${acc.account_id}`,
          source: cust.customer_id,
          target: acc.account_id,
          relationType: 'ACCOUNT_HOLDER',
          category: 'DIRECT_EVIDENCE',
          explanation: `${cust.name} is the registered legal holder of ${acc.account_type} account ${acc.account_id}.`,
          sourceRecord: `Firestore /accounts (${acc.account_id})`,
          isSuspicious: false,
        });
      });

      // Level 2: Transactions
      const txSpacing = 240;
      accs.forEach((acc, i) => {
        const accTxs = txs.filter((t) => t.account_id === acc.account_id || !t.account_id);
        const startXTx = startXAcc + i * accSpacing - ((accTxs.length - 1) * txSpacing) / 2;

        accTxs.forEach((tx, j) => {
          const isTxHighRisk =
            tx.status === 'BLOCKED' ||
            tx.status === 'BLOCK_AND_REVIEW' ||
            (tx.risk_score && tx.risk_score >= 70) ||
            tx.amount >= 50000;

          const txX = startXTx + j * txSpacing;
          const txY = 320;

          addNode({
            id: tx.transaction_id,
            type: 'Transaction',
            title: `₹${tx.amount.toLocaleString('en-IN')}`,
            subtitle: `${tx.transaction_id} • ${tx.status}`,
            icon: Activity,
            isHighRisk: isTxHighRisk,
            riskScore: tx.risk_score || (isTxHighRisk ? 85 : 20),
            riskTier: isTxHighRisk ? 'CRITICAL' : 'LOW',
            amount: tx.amount,
            decision: tx.decision || (isTxHighRisk ? 'BLOCK_AND_REVIEW' : 'ALLOW'),
            x: txX,
            y: txY,
            data: tx,
          });

          addEdge({
            id: `e-${acc.account_id}-${tx.transaction_id}`,
            source: acc.account_id,
            target: tx.transaction_id,
            relationType: 'ISSUED_PAYMENT',
            category: 'DIRECT_EVIDENCE',
            explanation: `Payment of ₹${tx.amount.toLocaleString(
              'en-IN'
            )} initiated against account ${acc.account_id}.`,
            sourceRecord: `Firestore /transactions (${tx.transaction_id})`,
            isSuspicious: isTxHighRisk,
          });

          // Level 3: Hardware, Network, Merchant for this transaction
          const dev =
            SYNTHETIC_DEVICES.find((d) => d.device_id === tx.device_id) ||
            liveDevices.find((d) => d.device_id === tx.device_id);
          const ip = SYNTHETIC_NETWORK_SIGNALS.find((n) => n.ip_address === tx.ip_address);
          const merch = Object.values(SYNTHETIC_MERCHANTS).find((m) => m.name === tx.merchant);

          const devId = dev?.device_id || tx.device_id || `dev-${tx.transaction_id}`;
          const isDevHighRisk = dev ? !dev.known : tx.customer_id === 'C1003';
          addNode({
            id: devId,
            type: 'Device',
            title: dev?.device_type || 'Mobile Device',
            subtitle: devId,
            icon: Smartphone,
            isHighRisk: isDevHighRisk,
            riskScore: isDevHighRisk ? 80 : 10,
            x: txX - 140,
            y: 480,
            data: dev || { device_id: devId, known: !isDevHighRisk },
          });

          addEdge({
            id: `e-${tx.transaction_id}-${devId}`,
            source: tx.transaction_id,
            target: devId,
            relationType: 'HARDWARE_TERMINAL',
            category: 'OBSERVED_RELATION',
            explanation: `Transaction telemetry recorded hardware device signature ${devId}.`,
            sourceRecord: `Device Fingerprint Registry`,
            isSuspicious: isDevHighRisk,
          });

          const ipId = ip?.ip_address || tx.ip_address || '122.167.45.12';
          const isIpHighRisk = ip
            ? ip.is_vpn || ip.is_tor || ip.is_datacenter_proxy || ip.risk_weight > 50
            : tx.customer_id === 'C1003';
          addNode({
            id: ipId,
            type: 'Network',
            title: ipId,
            subtitle: ip?.city || tx.city || 'Bengaluru',
            icon: MapPin,
            isHighRisk: isIpHighRisk,
            riskScore: isIpHighRisk ? 85 : 10,
            x: txX,
            y: 480,
            data: ip || { ip_address: ipId, city: tx.city },
          });

          addEdge({
            id: `e-${tx.transaction_id}-${ipId}`,
            source: tx.transaction_id,
            target: ipId,
            relationType: 'NETWORK_ORIGIN',
            category: 'OBSERVED_RELATION',
            explanation: `TCP connection established from IP address ${ipId} (${
              ip?.is_vpn ? 'VPN Detected' : ip?.is_datacenter_proxy ? 'Datacenter Proxy' : 'Residential ISP'
            }).`,
            sourceRecord: `Network Telemetry & IP Geolocation`,
            isSuspicious: isIpHighRisk,
          });

          const merchId = merch?.merchant_id || `merch-${tx.merchant.replace(/\s+/g, '-').toLowerCase()}`;
          const isMerchHighRisk = merch ? merch.risk_score > 70 : tx.customer_id === 'C1003';
          addNode({
            id: merchId,
            type: 'Merchant',
            title: merch?.name || tx.merchant,
            subtitle: merch?.category || 'Retail Merchant',
            icon: Store,
            isHighRisk: isMerchHighRisk,
            riskScore: merch?.risk_score || (isMerchHighRisk ? 75 : 15),
            x: txX + 140,
            y: 480,
            data: merch || { name: tx.merchant, merchant_id: merchId },
          });

          addEdge({
            id: `e-${tx.transaction_id}-${merchId}`,
            source: tx.transaction_id,
            target: merchId,
            relationType: 'PAYEE_SETTLEMENT',
            category: 'DIRECT_EVIDENCE',
            explanation: `Payment cleared to merchant ${tx.merchant} (${merch?.mcc_code || 'General MCC'}).`,
            sourceRecord: `Payment Gateway Clearing Ledger`,
            isSuspicious: isMerchHighRisk,
          });
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);

    // Default select first high-risk node or root customer
    if (newNodes.length > 0) {
      const initialNode = newNodes.find((n) => n.isHighRisk) || newNodes[0];
      setSelectedNodeId(initialNode.id);
      setNavHistory([initialNode.id]);
      setNavIndex(0);
    }
  }, [activeCluster, selectedCustomerId, liveTransactions, liveDevices]);

  // Fit to view automatically on graph rebuild
  useEffect(() => {
    if (nodes.length > 0) {
      fitToView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, activeCluster]);

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & BREADCRUMBS
  // ══════════════════════════════════════════════════════════════════════════
  const handleSelectNode = useCallback(
    (nodeId: string, addToHistory: boolean = true) => {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);

      if (addToHistory) {
        setNavHistory((prev) => {
          const next = prev.slice(0, navIndex + 1);
          if (next[next.length - 1] !== nodeId) {
            next.push(nodeId);
            setNavIndex(next.length - 1);
            return next;
          }
          return prev;
        });
      }
    },
    [navIndex]
  );

  const handleNavBack = () => {
    if (navIndex > 0) {
      const targetId = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      setSelectedNodeId(targetId);
      setSelectedEdgeId(null);
    }
  };

  const handleNavForward = () => {
    if (navIndex < navHistory.length - 1) {
      const targetId = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      setSelectedNodeId(targetId);
      setSelectedEdgeId(null);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // BFS SHORTEST PATH FINDER (PATH HIGHLIGHTING)
  // ══════════════════════════════════════════════════════════════════════════
  const findPath = useCallback(
    (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) {
        setHighlightedPathNodeIds(new Set());
        setHighlightedPathEdgeIds(new Set());
        return;
      }

      // Adjacency graph
      const adj = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
      edges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push({ neighbor: e.target, edgeId: e.id });
        adj.get(e.target)!.push({ neighbor: e.source, edgeId: e.id });
      });

      // BFS queue
      const queue: string[] = [sourceId];
      const visited = new Set<string>([sourceId]);
      const parent = new Map<string, { prevNode: string; edgeId: string }>();

      let found = false;
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === targetId) {
          found = true;
          break;
        }

        const neighbors = adj.get(curr) || [];
        for (const { neighbor, edgeId } of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            parent.set(neighbor, { prevNode: curr, edgeId });
            queue.push(neighbor);
          }
        }
      }

      if (found) {
        const pathNodes = new Set<string>();
        const pathEdges = new Set<string>();

        let curr: string | undefined = targetId;
        pathNodes.add(curr);

        while (curr && curr !== sourceId) {
          const step = parent.get(curr);
          if (!step) break;
          pathEdges.add(step.edgeId);
          curr = step.prevNode;
          pathNodes.add(curr);
        }

        setHighlightedPathNodeIds(pathNodes);
        setHighlightedPathEdgeIds(pathEdges);
      } else {
        setHighlightedPathNodeIds(new Set());
        setHighlightedPathEdgeIds(new Set());
      }
    },
    [edges]
  );

  // Trigger path finding when source or target changes
  useEffect(() => {
    if (pathSourceId && pathTargetId) {
      findPath(pathSourceId, pathTargetId);
    } else {
      setHighlightedPathNodeIds(new Set());
      setHighlightedPathEdgeIds(new Set());
    }
  }, [pathSourceId, pathTargetId, findPath]);

  const clearPath = () => {
    setPathSourceId(null);
    setPathTargetId(null);
    setHighlightedPathNodeIds(new Set());
    setHighlightedPathEdgeIds(new Set());
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FILTERING LOGIC
  // ══════════════════════════════════════════════════════════════════════════
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      // Type Filter
      if (filterType !== 'ALL' && n.type !== filterType) return false;

      // Risk Filter
      if (filterRisk === 'HIGH_ONLY' && !n.isHighRisk) return false;
      if (filterRisk === 'LOW_ONLY' && n.isHighRisk) return false;

      // Amount Filter
      if (filterAmount === 'HIGH_VALUE' && n.type === 'Transaction' && (n.amount || 0) < 25000)
        return false;

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesSubtitle = n.subtitle.toLowerCase().includes(query);
        const matchesId = n.id.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubtitle && !matchesId) return false;
      }

      return true;
    });
  }, [nodes, filterType, filterRisk, filterAmount, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Selected Node Context
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Connected edges and neighbor nodes for selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    edges.forEach((e) => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        set.add(e.id);
      }
    });
    return set;
  }, [selectedNodeId, edges]);

  const neighborNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const list: Array<{ node: GraphNode; edge: GraphEdge }> = [];
    edges.forEach((e) => {
      if (e.source === selectedNodeId) {
        const tgt = nodes.find((n) => n.id === e.target);
        if (tgt) list.push({ node: tgt, edge: e });
      } else if (e.target === selectedNodeId) {
        const src = nodes.find((n) => n.id === e.source);
        if (src) list.push({ node: src, edge: e });
      }
    });
    return list;
  }, [selectedNodeId, edges, nodes]);

  // Selected Edge Context
  const selectedEdge = useMemo(() => {
    return edges.find((e) => e.id === selectedEdgeId) || null;
  }, [edges, selectedEdgeId]);

  // Relevant Case Context for Selected Node
  const relevantCase = useMemo<Case | null>(() => {
    if (!selectedNode) return null;

    // Check direct match from liveCases
    const directCase = liveCases.find(
      (c) =>
        c.transactionId === selectedNode.id ||
        c.customerId === selectedNode.id ||
        c.id === selectedNode.id
    );
    if (directCase) return directCase;

    // Check synthetic / scenario fallback
    if (selectedNode.id.includes('C1003') || selectedNode.id.includes('1003')) {
      return {
        id: 'CASE-2026-1004',
        caseNumber: 'CASE-2026-1004',
        transactionId: 'TXN-1003-85K',
        customerId: 'C1003',
        status: 'NEW',
        riskScore: 85,
        riskLevel: 'HIGH',
        confidence: 0.95,
        verdict: 'Account Takeover with Rogue Emulator',
        recommendation: 'BLOCK_AND_REVIEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (selectedNode.id.includes('C1015') || selectedNode.id.includes('RING')) {
      return {
        id: 'CASE-RING-1015',
        caseNumber: 'CASE-RING-1015',
        transactionId: 'TXN-SCENARIO-E-RING-01',
        customerId: 'C1015',
        status: 'NEW',
        riskScore: 92,
        riskLevel: 'CRITICAL',
        confidence: 0.98,
        verdict: 'Coordinated Multi-Mule Fraud Ring',
        recommendation: 'BLOCK_AND_CREATE_CASE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }, [selectedNode, liveCases]);

  // Relevant Transaction Context for Selected Node
  const relevantTransaction = useMemo<Transaction | null>(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === 'Transaction') {
      return (selectedNode.data as Transaction) || null;
    }
    // Find transaction where customer, device, or merchant matches
    const match =
      SYNTHETIC_TRANSACTIONS.find(
        (t) =>
          t.customer_id === selectedNode.id ||
          t.device_id === selectedNode.id ||
          t.ip_address === selectedNode.id ||
          t.merchant === selectedNode.title
      ) ||
      liveTransactions.find(
        (t) =>
          t.customer_id === selectedNode.id ||
          t.device_id === selectedNode.id ||
          t.ip_address === selectedNode.id
      );
    return match || null;
  }, [selectedNode, liveTransactions]);

  // ══════════════════════════════════════════════════════════════════════════
  // PAN & ZOOM CONTROLS
  // ══════════════════════════════════════════════════════════════════════════
  const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
    if (e.button !== 0) return;
    if (
      (e.target as Element).closest('.graph-controls') ||
      (e.target as Element).closest('.node-details')
    )
      return;

    if (nodeId) {
      setDraggingNodeId(nodeId);
      handleSelectNode(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).id === 'graph-canvas') {
        // Deselect if background clicked
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    }

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      const dx = (e.clientX - dragStart.x) / transform.scale;
      const dy = (e.clientY - dragStart.y) / transform.scale;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n))
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingNodeId(null);
    setIsPanning(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Wheel Zoom Listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.15), 3);

      const rect = el.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const scaleRatio = newScale / transform.scale;

      setTransform((prev) => ({
        x: pointerX - (pointerX - prev.x) * scaleRatio,
        y: pointerY - (pointerY - prev.y) * scaleRatio,
        scale: newScale,
      }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [transform.scale]);

  const fitToView = () => {
    if (nodes.length === 0 || !containerRef.current) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 120;
    const graphWidth = maxX - minX + 320;
    const graphHeight = maxY - minY + 220;

    const scaleX = (rect.width - padding) / graphWidth;
    const scaleY = (rect.height - padding) / graphHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.1);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setTransform({
      x: rect.width / 2 - cx * scale,
      y: rect.height / 2 - cy * scale,
      scale,
    });
  };

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(t.scale * 1.25, 3) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(t.scale / 1.25, 0.15) }));

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER INTERACTION
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[700px] relative">
      {/* ─── TOP CONTROL & FILTER BAR ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 mb-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Network className="h-5 w-5 text-indigo-500" />
                Interactive Fraud-Ring Investigation Workspace
              </h1>
              {loading && (
                <span className="text-[10px] text-indigo-400 font-mono animate-pulse">
                  Syncing Live Records...
                </span>
              )}
              {firestoreError && (
                <span className="text-[10px] text-amber-500/80 font-mono">
                  ({firestoreError})
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Multi-entity topological correlator across synthetic clusters, shared hardware emulators, and live
              Firestore events
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cluster Scenario Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 shadow-xs">
              <button
                onClick={() => {
                  setActiveCluster('FRAUD_RING_SCENARIO_E');
                  clearPath();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCluster === 'FRAUD_RING_SCENARIO_E'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)]'
                }`}
              >
                <GitMerge className="h-3.5 w-3.5 text-rose-500" />
                <span>Scenario E: Fraud Ring (4 Mules)</span>
              </button>

              <button
                onClick={() => {
                  setActiveCluster('ATO_HERO_C1003');
                  clearPath();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCluster === 'ATO_HERO_C1003'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)]'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                <span>Scenario C: Hero ATO (C1003)</span>
              </button>

              <button
                onClick={() => {
                  setActiveCluster('BASELINE_C1001');
                  clearPath();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCluster === 'BASELINE_C1001'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)]'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Scenario A: Baseline (Priya)</span>
              </button>
            </div>

            {/* Individual Customer Dropdown if in custom mode */}
            {activeCluster !== 'FRAUD_RING_SCENARIO_E' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Subject:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    clearPath();
                  }}
                  className="text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-xs"
                >
                  {Object.values(SYNTHETIC_CUSTOMERS).map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name} ({c.customer_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ─── SECONDARY FILTER & SEARCH BAR ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-xs">
          {/* Breadcrumbs & Navigation History */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleNavBack}
              disabled={navIndex <= 0}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] disabled:opacity-30 disabled:pointer-events-none"
              title="Navigate Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNavForward}
              disabled={navIndex >= navHistory.length - 1}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] disabled:opacity-30 disabled:pointer-events-none"
              title="Navigate Forward"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] overflow-hidden max-w-sm sm:max-w-md truncate">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                Trail:
              </span>
              {navHistory.slice(-3).map((histId, idx) => {
                const node = nodes.find((n) => n.id === histId);
                const isCurrent = histId === selectedNodeId;
                return (
                  <React.Fragment key={histId + idx}>
                    {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
                    <button
                      onClick={() => handleSelectNode(histId, false)}
                      className={`truncate max-w-[110px] hover:underline font-bold ${
                        isCurrent
                          ? 'text-indigo-500 dark:text-indigo-400 font-extrabold'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {node ? node.title : histId}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Filters & Search Input */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none"
            >
              <option value="ALL">All Entities ({nodes.length})</option>
              <option value="Customer">Customers</option>
              <option value="Account">Accounts</option>
              <option value="Transaction">Transactions</option>
              <option value="Device">Devices</option>
              <option value="Network">Networks / IPs</option>
              <option value="Merchant">Merchants</option>
            </select>

            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="text-xs bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="HIGH_ONLY">Flagged Risk Only</option>
              <option value="LOW_ONLY">Clean Baseline Only</option>
            </select>

            {/* Amount Filter */}
            <select
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value)}
              className="text-xs bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none"
            >
              <option value="ALL">All Amounts</option>
              <option value="HIGH_VALUE">High Value (&gt; ₹25,000)</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find node by name or ID..."
                className="w-44 sm:w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-root)] py-1 pl-8 pr-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN GRAPH CANVAS AREA ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        id="graph-canvas"
        className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-root)] overflow-hidden relative shadow-md cursor-grab active:cursor-grabbing touch-none select-none transition-colors duration-200"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Subtle dot matrix background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(#334155 1.5px, transparent 1.5px)'
              : 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Floating Path Highlight Info Banner */}
        {highlightedPathNodeIds.size > 0 && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="graph-controls absolute top-4 left-4 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-950/95 border border-indigo-500/40 text-indigo-200 shadow-xl backdrop-blur-md text-xs animate-in fade-in duration-200"
          >
            <Route className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>
              Path Discovered:{' '}
              <strong className="text-white font-mono">{highlightedPathEdgeIds.size} hops</strong>{' '}
              connecting <strong className="text-white">{pathSourceId}</strong> &rarr;{' '}
              <strong className="text-white">{pathTargetId}</strong>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearPath();
              }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] shadow-xs transition"
            >
              Clear Path
            </button>
          </div>
        )}

        {/* Empty State if All Nodes Filtered Out */}
        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none">
            <Filter className="h-10 w-10 text-[var(--text-muted)] opacity-30 mb-2" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No Nodes Match Filter</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
              Adjust your entity type, risk tier, or search query to reveal topological nodes.
            </p>
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterRisk('ALL');
                setFilterAmount('ALL');
                setSearchQuery('');
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold pointer-events-auto shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ─── GRAPH SVG EDGES & NODES TRANSFORM LAYER ───────────────────────── */}
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {/* SVG EDGES */}
          <svg className="absolute overflow-visible top-0 left-0" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="edge-inferred-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {filteredEdges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;

              const isPath = highlightedPathEdgeIds.has(edge.id);
              const isSelected = selectedEdgeId === edge.id;
              const isConnected = connectedEdges.has(edge.id);
              const isFaded =
                (selectedNodeId && !isConnected && !isPath) ||
                (highlightedPathEdgeIds.size > 0 && !isPath);

              // Edge stroke colors based on category:
              // - DIRECT_EVIDENCE: sapphire / solid
              // - OBSERVED_RELATION: emerald / slate
              // - INFERRED_SUSPICIOUS: danger gradient / dashed
              let strokeColor = isDark ? '#334155' : '#CBD5E1';
              let strokeWidth = 1.5;
              let strokeDasharray: string | undefined = undefined;

              if (isPath) {
                strokeColor = '#A855F7'; // Purple glow for path
                strokeWidth = 3.5;
              } else if (isSelected) {
                strokeColor = '#3B82F6';
                strokeWidth = 3;
              } else if (isConnected) {
                strokeColor = '#6366F1';
                strokeWidth = 2.5;
              } else if (edge.category === 'INFERRED_SUSPICIOUS') {
                strokeColor = isDark ? '#F43F5E' : '#E11D48';
                strokeWidth = 2;
                strokeDasharray = '6 4';
              } else if (edge.category === 'OBSERVED_RELATION') {
                strokeColor = isDark ? '#10B981' : '#059669';
                strokeWidth = 1.5;
              } else if (edge.category === 'DIRECT_EVIDENCE') {
                strokeColor = isDark ? '#3B82F6' : '#2563EB';
                strokeWidth = 1.75;
              }

              // Bezier curve
              const midY = (src.y + tgt.y) / 2;
              const midX = (src.x + tgt.x) / 2;
              const pathD = `M ${src.x} ${src.y} C ${src.x} ${midY}, ${tgt.x} ${midY}, ${tgt.x} ${tgt.y}`;

              return (
                <g key={edge.id} className="cursor-pointer">
                  {/* Invisible wide stroke for easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                    }}
                  />

                  {/* Rendered Edge Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    opacity={isFaded ? 0.2 : 0.9}
                    className={`transition-all duration-200 ${isPath ? 'animate-pulse' : ''}`}
                  />

                  {/* Inferred Suspicious Badge on Edge midpoint if active */}
                  {edge.category === 'INFERRED_SUSPICIOUS' && !isFaded && (
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      className="fill-rose-500 font-mono text-[9px] font-bold pointer-events-none select-none"
                    >
                      INFERRED LINK
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* DOM GRAPH NODES */}
          {filteredNodes.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            const isConnected = neighborNodes.some((nbr) => nbr.node.id === node.id);
            const isPathNode = highlightedPathNodeIds.has(node.id);
            const isFaded =
              (selectedNodeId && !isSelected && !isConnected && !isPathNode) ||
              (highlightedPathNodeIds.size > 0 && !isPathNode);

            const cfg = entityTypeConfig[node.type];
            const nodeAccent = isDark ? cfg.colorDark : cfg.color;
            const nodeBgBadge = isDark ? cfg.bgDark : cfg.bgLight;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e, node.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl min-w-[190px] max-w-[230px] cursor-grab active:cursor-grabbing select-none bg-[var(--bg-surface)] transition-all duration-150 ${
                  isPathNode
                    ? 'border-2 border-purple-500 ring-4 ring-purple-500/30 shadow-2xl scale-[1.05] z-30'
                    : isSelected
                    ? 'border-2 border-indigo-500 ring-4 ring-indigo-500/30 shadow-2xl scale-[1.04] z-30'
                    : node.isHighRisk
                    ? 'border border-rose-500/60 shadow-md hover:border-rose-500 hover:shadow-lg z-10'
                    : 'border border-[var(--border)] shadow-xs hover:border-[var(--border-strong)] hover:shadow-md z-10'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  opacity: isFaded ? 0.3 : 1,
                }}
              >
                {/* Colored Top Accent Bar */}
                <div
                  className="h-1.5 w-full rounded-t-xl"
                  style={{
                    backgroundColor: isPathNode
                      ? '#A855F7'
                      : isSelected
                      ? '#6366F1'
                      : node.isHighRisk
                      ? '#EF4444'
                      : nodeAccent,
                  }}
                />

                <div className="p-3">
                  {/* Entity Header Badge */}
                  <div className="flex items-center justify-between gap-1.5 mb-2 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="p-1.5 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: nodeBgBadge, color: nodeAccent }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider"
                        style={{ color: nodeAccent }}
                      >
                        {node.type}
                      </span>
                    </div>

                    {/* High Risk Flag */}
                    {node.isHighRisk && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        FLAGGED
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate pointer-events-none">
                    {node.title}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5 pointer-events-none">
                    {node.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── GRAPH CONTROLS (ZOOM & FIT) ────────────────────────────────────── */}
        <div className="graph-controls absolute top-4 right-4 flex flex-col gap-2 z-30">
          <div className="flex bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden p-1 gap-1">
            <button
              onClick={zoomIn}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-px bg-[var(--border)] my-1 mx-0.5" />
            <button
              onClick={fitToView}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] rounded-lg transition-colors"
              title="Fit to View"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                fitToView();
              }}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-root)] rounded-lg transition-colors"
              title="Reset View"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] text-right px-2.5 py-1 bg-[var(--bg-surface)]/90 rounded-lg border border-[var(--border)] shadow-xs">
            Drag nodes &bull; Pan canvas &bull; Scroll zoom
          </div>
        </div>

        {/* ─── SELECTED EDGE INSPECTOR DRAWER ─────────────────────────────────── */}
        {selectedEdge && (
          <div className="node-details absolute top-4 left-4 w-80 bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between p-3.5 border-b border-[var(--border)] bg-[var(--bg-root)]">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-indigo-500" />
                <h3 className="font-bold text-xs text-[var(--text-primary)]">Edge Forensic Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedEdgeId(null)}
                className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Relationship Type
                </span>
                <div className="font-mono font-bold text-indigo-500 text-sm mt-0.5">
                  {selectedEdge.relationType}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Classification
                </span>
                <div className="mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      selectedEdge.category === 'INFERRED_SUSPICIOUS'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : selectedEdge.category === 'OBSERVED_RELATION'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}
                  >
                    {selectedEdge.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Evidence Narrative
                </span>
                <p className="mt-1 text-[var(--text-secondary)] leading-relaxed text-[11px]">
                  {selectedEdge.explanation}
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Source Ledger Record
                </span>
                <div className="text-[11px] font-mono text-[var(--text-primary)] mt-0.5 truncate">
                  {selectedEdge.sourceRecord}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SELECTED NODE DETAILS PANEL (WITH CASE REPORT ACTION) ──────────── */}
        {selectedNode && (
          <div className="node-details absolute bottom-4 right-4 w-84 sm:w-96 max-h-[75vh] bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-[var(--border)] bg-[var(--bg-root)] shrink-0">
              <div className="flex items-center gap-2 truncate">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor: isDark
                      ? entityTypeConfig[selectedNode.type].bgDark
                      : entityTypeConfig[selectedNode.type].bgLight,
                    color: isDark
                      ? entityTypeConfig[selectedNode.type].colorDark
                      : entityTypeConfig[selectedNode.type].color,
                  }}
                >
                  <selectedNode.icon className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-xs text-[var(--text-primary)] truncate">
                    {selectedNode.type} Forensic Profile
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                    {selectedNode.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-surface)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {/* Name & Reference */}
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-0.5">
                  Entity Reference
                </div>
                <div className="text-sm font-black text-[var(--text-primary)]">{selectedNode.title}</div>
                <div className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{selectedNode.subtitle}</div>
              </div>

              {/* High Risk Banner & Inferred Disclaimer */}
              {selectedNode.isHighRisk && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                      Flagged by Autonomous Risk Correlator
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      Note: Shared hardware or IP infrastructure is an investigative signal and does not alone
                      constitute legal proof of fraud.
                    </p>
                  </div>
                </div>
              )}

              {/* Case Report Launch Button */}
              {relevantCase && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                      CASE: {relevantCase.caseNumber}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-mono">
                      {relevantCase.riskLevel} ({relevantCase.riskScore} pts)
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    {relevantCase.verdict}
                  </p>
                  <button
                    onClick={() =>
                      setReportModalData({
                        isOpen: true,
                        caseData: relevantCase,
                        transactionData: relevantTransaction,
                      })
                    }
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Open Explainable Fraud Report</span>
                  </button>
                </div>
              )}

              {/* Connected Entities Links (1-Click Interactive Navigation) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                    Connected Entities ({neighborNodes.length})
                  </span>
                  <span className="text-[10px] text-indigo-500 font-medium">1-Click Jump</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {neighborNodes.length === 0 ? (
                    <div className="text-[11px] text-[var(--text-muted)] italic">
                      No direct neighbors in current filter.
                    </div>
                  ) : (
                    neighborNodes.map(({ node: nbr, edge }, idx) => (
                      <div
                        key={nbr.id + idx}
                        onClick={() => handleSelectNode(nbr.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border)] hover:border-indigo-500/50 hover:bg-[var(--bg-surface)] cursor-pointer transition"
                      >
                        <div className="truncate mr-2">
                          <div className="font-bold text-[11px] text-[var(--text-primary)] truncate">
                            {nbr.title}
                          </div>
                          <div className="text-[9px] font-mono text-[var(--text-muted)] truncate">
                            {edge.relationType} &bull; {nbr.type}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Path Tracing Selector Tool */}
              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block mb-1">
                  Trace Path to Another Entity
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setPathSourceId(selectedNode.id);
                        setPathTargetId(e.target.value);
                      }
                    }}
                    defaultValue=""
                    className="flex-1 text-xs bg-[var(--bg-root)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" disabled>
                      Select Destination Entity...
                    </option>
                    {nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.type}: {n.title} ({n.id})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── EXPLAINABLE FRAUD CASE REPORT MODAL ──────────────────────────────── */}
      <FraudCaseReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData((prev) => ({ ...prev, isOpen: false }))}
        caseData={reportModalData.caseData}
        transactionData={reportModalData.transactionData}
      />
    </div>
  );
};

export default EntityGraph;
