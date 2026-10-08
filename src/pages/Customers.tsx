import React, { useState, useEffect } from 'react';
import { Users, Search, X, Activity, Smartphone, Clock, MapPin, FolderKanban } from 'lucide-react';
import { customersCol, transactionsCol, devicesCol, loginEventsCol, casesCol } from '../firebase/collections';
import { query, onSnapshot, where } from 'firebase/firestore';
import { Customer, Transaction, Device, LoginEvent, Case } from '../types';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Detail panel state
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(customersCol()), (snap) => {
      const data: Customer[] = [];
      snap.forEach(doc => data.push({ ...doc.data(), id: doc.id } as Customer));
      setCustomers(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;
    
    const cid = selectedCustomer.customer_id;
    
    const unsubTx = onSnapshot(query(transactionsCol(), where('customer_id', '==', cid)), snap => {
      const data: Transaction[] = [];
      snap.forEach(doc => data.push(doc.data() as Transaction));
      setTxs(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    
    const unsubDev = onSnapshot(query(devicesCol(), where('customer_id', '==', cid)), snap => {
      const data: Device[] = [];
      snap.forEach(doc => data.push(doc.data() as Device));
      setDevices(data);
    });
    
    const unsubLogins = onSnapshot(query(loginEventsCol(), where('customer_id', '==', cid)), snap => {
      const data: LoginEvent[] = [];
      snap.forEach(doc => data.push(doc.data() as LoginEvent));
      setLogins(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    
    const unsubCases = onSnapshot(query(casesCol(), where('customerId', '==', cid)), snap => {
      const data: Case[] = [];
      snap.forEach(doc => data.push({ ...doc.data(), id: doc.id } as Case));
      setCases(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => { unsubTx(); unsubDev(); unsubLogins(); unsubCases(); };
  }, [selectedCustomer]);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.customer_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[var(--bg-root)] relative">
      {/* CUSTOMER LIST */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedCustomer ? 'hidden lg:flex lg:w-1/3 border-r border-[var(--border-subtle)] pr-4' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Customer Intelligence</h1>
          </div>
          <span className="badge bg-[var(--accent-light)] text-[var(--accent)]">
            {filtered.length} Profiles
          </span>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {filtered.map(c => (
            <div 
              key={c.customer_id} 
              onClick={() => setSelectedCustomer(c)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedCustomer?.customer_id === c.customer_id ? 'border-[var(--accent)] bg-[var(--accent-light)]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[var(--text-primary)]">{c.name}</span>
                <span className={`badge text-[9px] ${
                  c.risk_profile === 'LOW' ? 'bg-emerald-500/10 text-emerald-600' :
                  c.risk_profile === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-rose-500/10 text-rose-600'
                }`}>
                  {c.risk_profile}
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono mb-2">{c.customer_id}</div>
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.home_city}</span>
                <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> {c.usual_device_ids?.length || 0} Devices</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              No customers found.
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMER DETAIL PANEL */}
      {selectedCustomer && (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-root)] lg:pl-4 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setSelectedCustomer(null)} className="lg:hidden p-1 mr-2 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedCustomer.name}</h2>
                <span className={`badge text-[10px] ${
                  selectedCustomer.risk_profile === 'LOW' ? 'bg-emerald-500 text-white border-transparent' :
                  selectedCustomer.risk_profile === 'MEDIUM' ? 'bg-amber-500 text-white border-transparent' :
                  'bg-rose-600 text-white border-transparent'
                }`}>
                  {selectedCustomer.risk_profile} RISK
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono">{selectedCustomer.customer_id}</div>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="hidden lg:block p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded-md text-[var(--text-muted)]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 flex flex-col lg:flex-row gap-4">
            
            <div className="w-full lg:w-1/3 space-y-4">
              {/* Profile Overview */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3">Profile Overview</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                    <span className="text-[var(--text-muted)]">Home City</span>
                    <span className="font-medium text-[var(--text-primary)]">{selectedCustomer.home_city}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                    <span className="text-[var(--text-muted)]">Normal Value Range</span>
                    <span className="font-medium font-mono text-[var(--text-primary)]">₹{selectedCustomer.normal_amount_min} - ₹{selectedCustomer.normal_amount_max}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                    <span className="text-[var(--text-muted)]">Usual Cities</span>
                    <span className="font-medium text-[var(--text-primary)] text-right">{selectedCustomer.usual_cities?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-[var(--text-muted)]">Known Devices</span>
                    <span className="font-medium text-[var(--text-primary)]">{devices.length}</span>
                  </div>
                </div>
              </div>

              {/* Connected Devices */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Device Footprint
                </h3>
                <div className="space-y-2">
                  {devices.map(d => (
                    <div key={d.device_id} className="p-2 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-[120px]">{d.device_id}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{d.device_type}</span>
                    </div>
                  ))}
                  {devices.length === 0 && <div className="text-xs text-[var(--text-muted)]">No devices found.</div>}
                </div>
              </div>

              {/* Login Activity */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Recent Logins
                </h3>
                <div className="space-y-2">
                  {logins.slice(0,5).map((l, i) => (
                    <div key={i} className="flex justify-between items-center text-xs pb-1 border-b border-[var(--border-subtle)] last:border-0">
                      <span className="text-[var(--text-muted)] font-mono">{new Date(l.timestamp).toLocaleDateString()}</span>
                      <span className="truncate mx-2 text-[var(--text-secondary)] max-w-[80px]">{l.city}</span>
                      <span className={l.success ? 'text-emerald-500' : 'text-rose-500'}>{l.success ? 'OK' : 'FAIL'}</span>
                    </div>
                  ))}
                  {logins.length === 0 && <div className="text-xs text-[var(--text-muted)]">No login data.</div>}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-2/3 space-y-4">
              {/* Risk History / Cases */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> Active & Past Investigations
                </h3>
                <div className="space-y-2">
                  {cases.map(c => (
                    <div key={c.id} className="p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge text-[9px] ${c.riskLevel === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'}`}>{c.riskLevel}</span>
                          <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{c.caseNumber}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">{c.investigationSummary?.substring(0, 80)}...</div>
                      </div>
                      <a href="#cases" className="btn-secondary text-[10px] px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Case
                      </a>
                    </div>
                  ))}
                  {cases.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-muted)]">
                      No investigations on record for this customer.
                    </div>
                  )}
                </div>
              </div>

              {/* Transactions */}
              <div className="glass-card p-4 rounded-lg flex-1 min-h-0 flex flex-col">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Transaction History
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[var(--bg-surface)] z-10 text-[10px] uppercase text-[var(--text-muted)]">
                      <tr>
                        <th className="py-2 border-b border-[var(--border-subtle)]">Date/ID</th>
                        <th className="py-2 border-b border-[var(--border-subtle)]">Merchant/City</th>
                        <th className="py-2 border-b border-[var(--border-subtle)] text-right">Amount</th>
                        <th className="py-2 border-b border-[var(--border-subtle)] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map(tx => (
                        <tr key={tx.transaction_id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-subtle)] transition-colors">
                          <td className="py-2">
                            <div className="font-medium text-[var(--text-primary)]">{new Date(tx.timestamp).toLocaleDateString()}</div>
                            <div className="text-[9px] text-[var(--text-muted)] font-mono">{tx.transaction_id}</div>
                          </td>
                          <td className="py-2">
                            <div className="text-[var(--text-primary)] truncate max-w-[120px]">{tx.merchant}</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">{tx.city}</div>
                          </td>
                          <td className="py-2 text-right font-mono font-bold text-[var(--text-primary)]">
                            ₹{tx.amount.toLocaleString()}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`badge text-[9px] ${
                              tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED' ? 'bg-rose-500/10 text-rose-600' :
                              tx.status === 'STEP_UP_VERIFICATION' ? 'bg-amber-500/10 text-amber-600' :
                              'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {tx.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {txs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">No transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
