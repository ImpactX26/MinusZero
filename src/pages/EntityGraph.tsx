import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Network, User, CreditCard, Activity, Smartphone, MapPin, Store, AlertTriangle, Maximize, ZoomIn, ZoomOut, RefreshCw, X } from 'lucide-react';
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
  icon: any;
  isHighRisk: boolean;
  x: number;
  y: number;
  data?: any;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

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
      newEdges.push({ id: `e-${cust.customer_id}-${acc.account_id}`, source: cust.customer_id, target: acc.account_id });
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
        newNodes.push({
          id: tx.transaction_id,
          type: 'Transaction',
          title: `₹${tx.amount.toLocaleString()}`,
          subtitle: tx.transaction_id,
          icon: Activity,
          isHighRisk: tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED',
          x: startXTx + j * txSpacing,
          y: 300,
          data: tx
        });
        newEdges.push({ id: `e-${acc.account_id}-${tx.transaction_id}`, source: acc.account_id, target: tx.transaction_id });

        // LEVEL 3: Devices, Network, Merchant (per tx)
        const dev = SYNTHETIC_DEVICES.find(d => d.device_id === tx.device_id);
        const ip = SYNTHETIC_NETWORK_SIGNALS.find(n => n.ip_address === tx.ip_address);
        const merch = Object.values(SYNTHETIC_MERCHANTS).find(m => m.name === tx.merchant);

        const entitySpacing = 160;
        const txX = startXTx + j * txSpacing;
        const startXEnt = txX - entitySpacing; // 3 entities: dev, ip, merch

        // Device
        const devId = dev?.device_id || `dev-${tx.transaction_id}`;
        if (!newNodes.find(n => n.id === devId)) {
          newNodes.push({
            id: devId,
            type: 'Device',
            title: dev?.device_type || 'Unknown Device',
            subtitle: devId,
            icon: Smartphone,
            isHighRisk: dev ? !dev.known : true,
            x: startXEnt,
            y: 450,
            data: dev
          });
        }
        newEdges.push({ id: `e-${tx.transaction_id}-${devId}`, source: tx.transaction_id, target: devId });

        // IP
        const ipId = ip?.ip_address || tx.ip_address;
        if (!newNodes.find(n => n.id === ipId)) {
          newNodes.push({
            id: ipId,
            type: 'Network',
            title: ipId,
            subtitle: ip?.city || tx.city,
            icon: MapPin,
            isHighRisk: ip ? (ip.is_vpn || ip.is_tor) : false,
            x: startXEnt + entitySpacing,
            y: 450,
            data: ip
          });
        }
        newEdges.push({ id: `e-${tx.transaction_id}-${ipId}`, source: tx.transaction_id, target: ipId });

        // Merchant
        const merchId = merch?.merchant_id || `merch-${tx.transaction_id}`;
        if (!newNodes.find(n => n.id === merchId)) {
          newNodes.push({
            id: merchId,
            type: 'Merchant',
            title: merch?.name || tx.merchant,
            subtitle: merch?.category || 'Unknown Category',
            icon: Store,
            isHighRisk: merch ? merch.risk_score > 70 : false,
            x: startXEnt + entitySpacing * 2,
            y: 450,
            data: merch
          });
        }
        newEdges.push({ id: `e-${tx.transaction_id}-${merchId}`, source: tx.transaction_id, target: merchId });
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
  }, [nodes.length]); // Only fit on initial load or customer change, not when dragging

  // Interaction handlers
  const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
    if (e.button !== 0) return; // Only left click
    
    // Ignore if clicking on UI elements outside the graph surface
    if ((e.target as Element).closest('.graph-controls') || (e.target as Element).closest('.node-details')) return;
    
    // Only capture pointer on the container or nodes
    if (nodeId) {
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).id === 'graph-canvas') {
        setSelectedNodeId(null); // Clicked on background
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

  // Setup wheel zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.1), 3);
      
      // Zoom around pointer
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
    
    const graphWidth = maxX - minX + 200; // approx node width
    const graphHeight = maxY - minY + 100; // approx node height

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

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.2, 3) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale / 1.2, 0.1) }));

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
    <div className="flex flex-col h-[calc(100vh-6rem)] relative bg-[var(--bg-root)]">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-4 z-10 px-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Network className="h-5 w-5 text-[var(--accent)]" />
            Entity Relationship Graph
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Interactive topology mapping and entity context
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-sm"
          >
            {Object.values(SYNTHETIC_CUSTOMERS).map(c => (
              <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Graph Area */}
      <div 
        ref={containerRef}
        id="graph-canvas"
        className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Graph Transform Container */}
        <div 
          className="absolute origin-top-left"
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
              
              return (
                <path 
                  key={edge.id}
                  d={`M ${src.x} ${src.y} C ${src.x} ${(src.y + tgt.y)/2}, ${tgt.x} ${(src.y + tgt.y)/2}, ${tgt.x} ${tgt.y}`}
                  fill="none"
                  stroke={isHighlighted ? 'var(--accent)' : 'var(--border-default)'}
                  strokeWidth={isHighlighted ? 3 : 2}
                  className="transition-all duration-300"
                  opacity={isFaded ? 0.2 : 0.8}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            const isConnected = connectedNodes.has(node.id);
            const isFaded = selectedNodeId && !isSelected && !isConnected;
            
            return (
              <div 
                key={node.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e, node.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-3 rounded-lg border min-w-[160px] cursor-grab active:cursor-grabbing transition-colors duration-200 select-none ${
                  isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/50 shadow-lg shadow-[var(--accent)]/10 z-20' : 
                  'border-[var(--border-subtle)] hover:border-[var(--border-default)] shadow-md z-10'
                } ${
                  node.isHighRisk ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/40' : 'bg-[var(--bg-root)]'
                }`}
                style={{ 
                  left: node.x, 
                  top: node.y,
                  opacity: isFaded ? 0.3 : 1
                }}
              >
                <div className="flex items-center gap-2 mb-2 pointer-events-none">
                  <div className={`p-1.5 rounded-md ${node.isHighRisk ? 'bg-rose-500/20 text-rose-600' : 'bg-[var(--bg-surface-subtle)] text-[var(--accent)]'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">{node.type}</span>
                </div>
                <div className={`text-sm font-bold truncate pointer-events-none ${node.isHighRisk ? 'text-rose-700 dark:text-rose-400' : 'text-[var(--text-primary)]'}`}>
                  {node.title}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate mt-0.5 pointer-events-none">
                  {node.subtitle}
                </div>
                
                {/* Risk Badge if critical */}
                {node.isHighRisk && (
                  <div className="absolute -top-2 -right-2 h-4 w-4 bg-rose-500 rounded-full border-2 border-[var(--bg-root)] animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Graph Controls Toolbar */}
        <div className="graph-controls absolute top-4 right-4 flex flex-col gap-2 z-30">
          <div className="flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm overflow-hidden p-1 gap-1">
            <button onClick={zoomIn} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] rounded transition-colors" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={zoomOut} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] rounded transition-colors" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-px bg-[var(--border-subtle)] my-1 mx-0.5" />
            <button onClick={fitToView} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] rounded transition-colors" title="Fit to View">
              <Maximize className="h-4 w-4" />
            </button>
            <button onClick={() => {
              // trigger rebuild
              setSelectedCustomerId(p => p);
              fitToView();
            }} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] rounded transition-colors" title="Reset Layout">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] text-right px-2 py-1 bg-[var(--bg-surface)]/80 rounded backdrop-blur border border-[var(--border-subtle)] shadow-sm">
            Drag nodes • Pan canvas • Scroll to zoom
          </div>
        </div>

        {/* Selected Node Details Panel */}
        {selectedNode && (
          <div className="node-details absolute bottom-6 right-6 w-80 bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-xl shadow-xl z-30 flex flex-col animate-in slide-in-from-right-4 fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <selectedNode.icon className={`h-5 w-5 ${selectedNode.isHighRisk ? 'text-rose-500' : 'text-[var(--accent)]'}`} />
                <h3 className="font-bold text-[var(--text-primary)]">{selectedNode.type} Details</h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1">Entity Reference</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{selectedNode.title}</div>
                <div className="text-xs font-mono text-[var(--text-secondary)]">{selectedNode.subtitle}</div>
              </div>

              {selectedNode.isHighRisk && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                    Suspicious risk factors associated with this entity. Further investigation required.
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Context Data</div>
                {selectedNode.data && Object.entries(selectedNode.data).map(([k, v]: [string, any]) => {
                  if (typeof v === 'object' || k.includes('id')) return null;
                  return (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)] capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[150px]">{String(v)}</span>
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
