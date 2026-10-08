import React, { useState, useEffect, useMemo } from 'react';
import { query, orderBy, onSnapshot } from 'firebase/firestore';
import { transactionsCol, customersCol } from '../firebase/collections';
import { Transaction, Customer } from '../types';
import { 
  Radio, Search, Filter, ShieldAlert, AlertTriangle, 
  ArrowUpRight, Clock, Activity, ShieldCheck
} from 'lucide-react';

export const LiveEvents: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  useEffect(() => {
    // Fetch customers to enrich events
    const unsubCustomers = onSnapshot(query(customersCol()), (snapshot) => {
      const custs: Record<string, Customer> = {};
      snapshot.forEach(doc => {
        custs[doc.id] = doc.data() as Customer;
      });
      setCustomers(custs);
    });

    // Fetch transactions
    const unsubTx = onSnapshot(query(transactionsCol(), orderBy('timestamp', 'desc')), (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => {
        txs.push({ ...doc.data(), transaction_id: doc.id } as Transaction);
      });
      setTransactions(txs);
    });

    return () => {
      unsubCustomers();
      unsubTx();
    };
  }, []);

  const getEventEnrichment = (tx: Transaction) => {
    let riskLevel = 'LOW';
    let riskScore = 15;
    let signal = 'Normal activity';
    let isCritical = false;

    if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') {
      riskLevel = 'CRITICAL';
      riskScore = 95;
      signal = 'High-risk location & velocity';
      isCritical = true;
    } else if (tx.status === 'STEP_UP_VERIFICATION') {
      riskLevel = 'HIGH';
      riskScore = 75;
      signal = 'Unusual device footprint';
    } else if (tx.amount > 50000) {
      riskLevel = 'MEDIUM';
      riskScore = 45;
      signal = 'High value transaction';
    }

    return { riskLevel, riskScore, signal, isCritical };
  };

  const enrichedEvents = useMemo(() => {
    return transactions.map(tx => {
      const enrichment = getEventEnrichment(tx);
      const customer = customers[tx.customer_id];
      return { ...tx, ...enrichment, customerName: customer?.name || tx.customer_id };
    });
  }, [transactions, customers]);

  const filteredEvents = enrichedEvents.filter(e => {
    const matchesSearch = 
      e.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.merchant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRisk === 'ALL' || e.riskLevel === filterRisk;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="h-6 w-6 text-[var(--accent)] animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Event Stream</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Real-time transaction & telemetry ingestion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="badge bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-[10px]">
            Synthetic Data • Demo Environment
          </span>
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {filteredEvents.length} Events Processing
          </span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-3 rounded-lg shrink-0 border border-[var(--border-subtle)]">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by ID, Customer, or Merchant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-root)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <Filter className="h-4 w-4 text-[var(--text-muted)] mr-1" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <button
              key={level}
              onClick={() => setFilterRisk(level)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                filterRisk === level 
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm' 
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--text-muted)]'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* FEED LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] z-10 shadow-sm backdrop-blur-md bg-opacity-90">
            <tr>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)] whitespace-nowrap">Time & ID</th>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)]">Customer & Origin</th>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)] text-right">Amount</th>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)]">Risk Level</th>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)]">Top Signal</th>
              <th className="py-3 px-4 text-xs font-bold uppercase text-[var(--text-muted)] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {filteredEvents.map(event => (
              <tr 
                key={event.transaction_id} 
                className={`transition-colors group hover:bg-[var(--bg-surface-subtle)] ${
                  event.isCritical ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''
                }`}
              >
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <Clock className={`h-3 w-3 ${event.isCritical ? 'text-rose-500' : 'text-[var(--text-muted)]'}`} />
                    <span className="text-xs font-medium">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{event.transaction_id}</div>
                </td>
                
                <td className="py-3 px-4">
                  <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    {event.customerName}
                    {event.isCritical && <ShieldAlert className="h-3 w-3 text-rose-500" />}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                    <ArrowUpRight className="h-3 w-3 text-[var(--text-muted)]" /> {event.city} • {event.merchant}
                  </div>
                </td>

                <td className="py-3 px-4 text-right">
                  <div className={`text-sm font-black font-mono ${event.isCritical ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
                    ₹{event.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{event.transaction_type}</div>
                </td>

                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${
                      event.riskLevel === 'CRITICAL' ? 'bg-rose-600 text-white border-transparent' :
                      event.riskLevel === 'HIGH' ? 'bg-orange-500 text-white border-transparent' :
                      event.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {event.riskLevel}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold">
                      {event.riskScore}/100
                    </span>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 max-w-[200px] truncate">
                    {event.isCritical ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{event.signal}</span>
                  </div>
                </td>

                <td className="py-3 px-4 text-right">
                  {event.isCritical ? (
                    <a 
                      href="#investigation-workspace" 
                      className="inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 py-1.5 px-3 rounded-md shadow-sm transition-colors"
                    >
                      Investigate
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-root)] text-[var(--text-muted)] border border-[var(--border-subtle)] py-1.5 px-3 rounded-md">
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] text-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Activity className="h-8 w-8 opacity-20" />
                    <p>No transactions found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
