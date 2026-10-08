import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Network, User, CreditCard, Activity, Smartphone, MapPin, Store, Maximize, ZoomIn, ZoomOut, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { 
  SYNTHETIC_CUSTOMERS, 
  SYNTHETIC_ACCOUNTS, 
  SYNTHETIC_TRANSACTIONS, 
  SYNTHETIC_DEVICES,
  SYNTHETIC_MERCHANTS,
  SYNTHETIC_NETWORK_SIGNALS
} from '../data/scenarios';
import { Transaction } from '../types';

type NodeType = 'Customer' | 'Account' | 'Transaction' | 'Device' | 'Network' | 'Merchant';

interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  isHighRisk: boolean;
  x: number;
  y: number;
  data?: any;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  isSuspicious?: boolean;
}

// Entity configuration matching global color direction
const entityTypeConfig: Record<NodeType, {
  color: string;
  bgLight: string;
  topAccent: string;
  label: string;
}> = {
  Customer: {
    color: '#3157D5', // Sapphire Blue
    bgLight: '#EEF2FF',
    topAccent: 'bg-[#3157D5]',
    label: 'Customer',
  },
  Account: {
    color: '#6C63D9', // Soft Violet
    bgLight: '#F3F0FF',
    topAccent: 'bg-[#6C63D9]',
    label: 'Account',
  },
  Transaction: {
    color: '#159A9C', // Teal
    bgLight: '#E6F7F7',
    topAccent: 'bg-[#159A9C]',
    label: 'Transaction',
  },
  Device: {
    color: '#D99425', // Amber
    bgLight: '#FEFCE8',
    topAccent: 'bg-[#D99425]',
    label: 'Device',
  },
  Network: {
    color: '#D95C62', // Coral
    bgLight: '#FFF1F2',
    topAccent: 'bg-[#D95C62]',
    label: 'Network / IP',
  },
  Merchant: {
    color: '#159A75', // Emerald
    bgLight: '#F0FDF4',
    topAccent: 'bg-[#159A75]',
    label: 'Merchant',
  },
};

export const EntityGraph: React.FC = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('C1003');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Pan and Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Rebuild graph data when customer changes
  useEffect(() => {
    const cust = SYNTHETIC_CUSTOMERS[selectedCustomerId as keyof typeof SYNTHETIC_CUSTOMERS] || Object.values(SYNTHETIC_CUSTOMERS)[0];
    const accs = Object.values(SYNTHETIC_ACCOUNTS).filter(a => a.customer_id === cust.customer_id);
    const txs = SYNTHETIC_TRANSACTIONS.filter(t => t.customer_id === cust.customer_id);

    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    // LEVEL 0: Customer
    newNodes.push({
      id: cust.customer_id,
      type: 'Customer',
      title: cust.name,
      subtitle: cust.customer_id,
      icon: User,
      isHighRisk: cust.risk_profile === 'HIGH',
      x: 0,
      y: 0,
      data: cust
    });

    // LEVEL 1: Accounts
    const accSpacing = 300;
    const startXAcc = -((accs.length - 1) * accSpacing) / 2;
    accs.forEach((acc, i) => {
      newNodes.push({
        id: acc.account_id,
        type: 'Account',
        title: acc.account_type,
        subtitle: acc.account_id,
        icon: CreditCard,
        isHighRisk: false,
        x: startXAcc + i * accSpacing,
        y: 150,
        data: acc
      });
      newEdges.push({ 
        id: `e-${cust.customer_id}-${acc.account_id}`, 
        source: cust.customer_id, 
        target: acc.account_id,
        isSuspicious: false
      });
    });

    // LEVEL 2: Transactions
    const txByAcc: Record<string, Transaction[]> = {};
    accs.forEach(a => txByAcc[a.account_id] = []);
    txs.forEach(t => {
      if (t.account_id && txByAcc[t.account_id]) txByAcc[t.account_id].push(t);
    });

    const txSpacing = 220;
    accs.forEach((acc, i) => {
      const accTxs = txByAcc[acc.account_id] || [];
      const startXTx = (startXAcc + i * accSpacing) - ((accTxs.length - 1) * txSpacing) / 2;
      
      accTxs.forEach((tx, j) => {
        const isTxSuspicious = tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED' || tx.amount >= 50000;
        newNodes.push({
          id: tx.transaction_id,
          type: 'Transaction',
          title: `₹${tx.amount.toLocaleString()}`,
          subtitle: tx.transaction_id,
          icon: Activity,
          isHighRisk: isTxSuspicious,
          x: startXTx + j * txSpacing,
          y: 300,
          data: tx
        });
        newEdges.push({ 
          id: `e-${acc.account_id}-${tx.transaction_id}`, 
          source: acc.account_id, 
          target: tx.transaction_id,
          isSuspicious: isTxSuspicious
        });

        // LEVEL 3: Devices, Network, Merchant (per tx)
        const dev = SYNTHETIC_DEVICES.find(d => d.device_id === tx.device_id);
        const ip = SYNTHETIC_NETWORK_SIGNALS.find(n => n.ip_address === tx.ip_address);
        const merch = Object.values(SYNTHETIC_MERCHANTS).find(m => m.name === tx.merchant);

        const entitySpacing = 160;
        const txX = startXTx + j * txSpacing;
        const startXEnt = txX - entitySpacing; // 3 entities: dev, ip, merch

        // Device
        const devId = dev?.device_id || `dev-${tx.transaction_id}`;
        const isDevHighRisk = dev ? !dev.known : true;
        if (!newNodes.find(n => n.id === devId)) {
          newNodes.push({
            id: devId,
            type: 'Device',
            title: dev?.device_type || 'Unknown Device',
            subtitle: devId,
            icon: Smartphone,
            isHighRisk: isDevHighRisk,
            x: startXEnt,
            y: 450,
            data: dev
          });
        }
        newEdges.push({ 
          id: `e-${tx.transaction_id}-${devId}`, 
          source: tx.transaction_id, 
          target: devId,
          isSuspicious: isDevHighRisk
        });

        // IP
        const ipId = ip?.ip_address || tx.ip_address;
        const isIpHighRisk = ip ? (ip.is_vpn || ip.is_tor || ip.is_datacenter_proxy || ip.risk_weight > 50) : false;
        if (!newNodes.find(n => n.id === ipId)) {
          newNodes.push({
            id: ipId,
            type: 'Network',
            title: ipId,
            subtitle: ip?.city || tx.city,
            icon: MapPin,
            isHighRisk: isIpHighRisk,
            x: startXEnt + entitySpacing,
            y: 450,
            data: ip
          });
        }
        newEdges.push({ 
          id: `e-${tx.transaction_id}-${ipId}`, 
          source: tx.transaction_id, 
          target: ipId,
          isSuspicious: isIpHighRisk
        });

        // Merchant
        const merchId = merch?.merchant_id || `merch-${tx.transaction_id}`;
        const isMerchHighRisk = merch ? merch.risk_score > 70 : false;
        if (!newNodes.find(n => n.id === merchId)) {
          newNodes.push({
            id: merchId,
            type: 'Merchant',
            title: merch?.name || tx.merchant,
            subtitle: merch?.category || 'General Merchant',
            icon: Store,
            isHighRisk: isMerchHighRisk,
            x: startXEnt + entitySpacing * 2,
            y: 450,
            data: merch
          });
        }
        newEdges.push({ 
          id: `e-${tx.transaction_id}-${merchId}`, 
          source: tx.transaction_id, 
          target: merchId,
          isSuspicious: isMerchHighRisk
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId(null);
  }, [selectedCustomerId]);

  // Fit to view automatically on nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      fitToView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // Interaction handlers
  const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
    if (e.button !== 0) return;
    
    if ((e.target as Element).closest('.graph-controls') || (e.target as Element).closest('.node-details')) return;
    
    if (nodeId) {
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).id === 'graph-canvas') {
        setSelectedNodeId(null);
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
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
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

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.1), 3);
      
      const rect = el.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      
      const scaleRatio = newScale / transform.scale;
      
      setTransform(prev => ({
        x: pointerX - (pointerX - prev.x) * scaleRatio,
        y: pointerY - (pointerY - prev.y) * scaleRatio,
        scale: newScale
      }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [transform.scale]);

  const fitToView = () => {
    if (nodes.length === 0 || !containerRef.current) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 100;
    
    const graphWidth = maxX - minX + 240;
    const graphHeight = maxY - minY + 140;

    const scaleX = (rect.width - padding) / graphWidth;
    const scaleY = (rect.height - padding) / graphHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.2);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setTransform({
      x: rect.width / 2 - cx * scale,
      y: rect.height / 2 - cy * scale,
      scale
    });
  };

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(t.scale / 1.2, 0.1) }));

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach(e => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        connected.add(e.id);
      }
    });
    return connected;
  }, [selectedNodeId, edges]);
  
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach(e => {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    });
    return connected;
  }, [selectedNodeId, edges]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] relative">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Network className="h-5 w-5 text-[#3157D5]" />
            Entity Relationship Graph
          </h1>
          <p className="text-xs text-[#64748B]">
            Interactive topology mapping across customer accounts, devices, network addresses &amp; merchants
          </p>
        </div>

        {/* Legend strip + Customer selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#DCE3EE] shadow-xs text-[11px] font-medium text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3157D5]" /> Customer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#6C63D9]" /> Account
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#159A9C]" /> Transaction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D99425]" /> Device
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D95C62]" /> Network
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#159A75]" /> Merchant
            </span>
          </div>

          {/* Customer select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Customer:</span>
            <select 
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="text-xs font-semibold bg-white border border-[#DCE3EE] rounded-lg px-3 py-1.5 text-[#172033] focus:outline-none focus:border-[#3157D5] shadow-xs cursor-pointer"
            >
              {Object.values(SYNTHETIC_CUSTOMERS).map(c => (
                <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div 
        ref={containerRef}
        id="graph-canvas"
        className="flex-1 rounded-xl border border-[#DCE3EE] bg-[#F7F9FC] overflow-hidden relative shadow-xs cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Subtle dot grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.35]" 
          style={{ 
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', 
            backgroundSize: '32px 32px' 
          }} 
        />
        
        {/* Graph Transform Container */}
        <div 
          className="absolute origin-top-left transition-transform duration-100 ease-out"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        >
          {/* Edges SVG */}
          <svg className="absolute overflow-visible top-0 left-0" style={{ zIndex: 0 }}>
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              
              const isHighlighted = connectedEdges.has(edge.id);
              const isFaded = selectedNodeId && !isHighlighted;
              
              // Colors: sapphire when selected, coral if suspicious relationship, soft slate default
              let strokeColor = '#CBD5E1';
              if (isHighlighted) {
                strokeColor = '#3157D5';
              } else if (edge.isSuspicious) {
                strokeColor = '#D95C62';
              }

              const strokeWidth = isHighlighted ? 2.5 : (edge.isSuspicious ? 1.75 : 1.25);
              const strokeDasharray = edge.isSuspicious && !isHighlighted ? '4 3' : undefined;
              
              return (
                <path 
                  key={edge.id}
                  d={`M ${src.x} ${src.y} C ${src.x} ${(src.y + tgt.y)/2}, ${tgt.x} ${(src.y + tgt.y)/2}, ${tgt.x} ${tgt.y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  className="transition-all duration-300"
                  opacity={isFaded ? 0.2 : 0.9}
                />
              );
            })}
          </svg>

          {/* LIGHT WHITE NODES WITH SUBTLE COLORED ACCENTS */}
          {nodes.map(node => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            const isConnected = connectedNodes.has(node.id);
            const isFaded = selectedNodeId && !isSelected && !isConnected;
            const cfg = entityTypeConfig[node.type];
            
            return (
              <div 
                key={node.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e, node.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[13px] min-w-[175px] max-w-[210px] cursor-grab active:cursor-grabbing select-none bg-white transition-all duration-200 ${
                  isSelected 
                    ? 'border border-[#3157D5] ring-2 ring-[#3157D5]/40 shadow-[0_8px_20px_rgba(49,87,213,0.18)] scale-[1.03] z-20' 
                    : node.isHighRisk
                      ? 'border border-[#D95C62]/70 shadow-[0_4px_14px_rgba(217,92,98,0.15)] hover:border-[#D95C62] z-10'
                      : 'border border-[#DCE3EE] shadow-card hover:border-[#CBD5E1] hover:shadow-md z-10'
                }`}
                style={{ 
                  left: node.x, 
                  top: node.y,
                  opacity: isFaded ? 0.35 : 1
                }}
              >
                {/* Colored Top Accent Line */}
                <div 
                  className={`h-1.5 w-full rounded-t-[12px]`}
                  style={{ backgroundColor: cfg.color }}
                />

                <div className="p-3">
                  {/* Entity Type + Icon + Risk Indicator */}
                  <div className="flex items-center justify-between gap-1.5 mb-2 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="p-1.5 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: cfg.bgLight, color: cfg.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: cfg.color }}>
                        {node.type}
                      </span>
                    </div>

                    {/* Risk Badge */}
                    {node.isHighRisk && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#D95C62] px-1.5 py-0.5 rounded bg-[#FFF1F2] border border-[#FFE4E6]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D95C62]" />
                        RISK
                      </span>
                    )}
                  </div>

                  {/* Node Title & Subtitle */}
                  <div className="text-xs font-bold text-[#172033] truncate pointer-events-none">
                    {node.title}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono truncate mt-0.5 pointer-events-none">
                    {node.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Graph Controls Toolbar */}
        <div className="graph-controls absolute top-3.5 right-3.5 flex flex-col gap-2 z-30">
          <div className="flex bg-white border border-[#DCE3EE] rounded-lg shadow-sm overflow-hidden p-1 gap-1">
            <button 
              onClick={zoomIn} 
              className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] rounded transition-colors" 
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button 
              onClick={zoomOut} 
              className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] rounded transition-colors" 
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-px bg-[#DCE3EE] my-1 mx-0.5" />
            <button 
              onClick={fitToView} 
              className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] rounded transition-colors" 
              title="Fit to View"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                setSelectedCustomerId(p => p);
                fitToView();
              }} 
              className="p-2 text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFD] rounded transition-colors" 
              title="Reset Layout"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="text-[10px] text-[#64748B] text-right px-2.5 py-1 bg-white/90 rounded-lg backdrop-blur-xs border border-[#DCE3EE] shadow-xs">
            Drag nodes • Pan canvas • Scroll to zoom
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="node-details absolute bottom-4 right-4 w-80 bg-white/95 backdrop-blur-md border border-[#DCE3EE] rounded-xl shadow-elevated z-30 flex flex-col">
            <div className="flex items-center justify-between p-3.5 border-b border-[#DCE3EE]">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ 
                    backgroundColor: entityTypeConfig[selectedNode.type].bgLight, 
                    color: entityTypeConfig[selectedNode.type].color 
                  }}
                >
                  <selectedNode.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#172033]">{selectedNode.type} Details</h3>
                  <span className="text-[10px] text-[#64748B] font-mono">{selectedNode.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNodeId(null)} 
                className="text-[#64748B] hover:text-[#172033] p-1 rounded hover:bg-[#F8FAFD]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-3.5 space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">Entity Reference</div>
                <div className="text-sm font-bold text-[#172033]">{selectedNode.title}</div>
                <div className="text-xs font-mono text-[#64748B]">{selectedNode.subtitle}</div>
              </div>

              {selectedNode.isHighRisk && (
                <div className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-lg p-2.5 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#D95C62] shrink-0 mt-0.5" />
                  <div className="text-[11px] text-[#D95C62] font-semibold leading-relaxed">
                    Elevated risk profile detected. Flagged by autonomous risk engine for investigator review.
                  </div>
                </div>
              )}

              <div className="space-y-1.5 border-t border-[#DCE3EE] pt-2.5">
                <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-1">Entity Telemetry</div>
                {selectedNode.data && Object.entries(selectedNode.data).map(([k, v]: [string, any]) => {
                  if (typeof v === 'object' || k.includes('id')) return null;
                  return (
                    <div key={k} className="flex justify-between text-xs py-0.5 border-b border-[#F8FAFD]">
                      <span className="text-[#64748B] capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-[#172033] font-medium font-mono text-[11px] truncate max-w-[150px]">{String(v)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EntityGraph;
