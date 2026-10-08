import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  X,
  Smartphone,
  MapPin,
  FolderKanban,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  customersCol,
  transactionsCol,
  devicesCol,
  loginEventsCol,
  casesCol,
  accountsCol,
} from '../firebase/collections';
import { query, onSnapshot } from 'firebase/firestore';
import { Customer, Transaction, Device, LoginEvent, Case, Account } from '../types';
import {
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_ACCOUNTS,
  SYNTHETIC_DEVICES,
  SYNTHETIC_LOGIN_EVENTS,
  SYNTHETIC_TRANSACTIONS,
} from '../data/scenarios';

type RiskFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
type DetailTab = 'overview' | 'transactions' | 'devices' | 'logins' | 'locations' | 'risk';

export const Customers: React.FC = () => {
  // Master lists
  const [customers, setCustomers] = useState<Customer[]>(() => Object.values(SYNTHETIC_CUSTOMERS));
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(() => SYNTHETIC_TRANSACTIONS);
  const [allAccounts, setAllAccounts] = useState<Record<string, Account>>(() => SYNTHETIC_ACCOUNTS);
  const [allDevices, setAllDevices] = useState<Device[]>(() => SYNTHETIC_DEVICES);
  const [allLogins, setAllLogins] = useState<LoginEvent[]>(() => SYNTHETIC_LOGIN_EVENTS);
  const [allCases, setAllCases] = useState<Case[]>([]);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [personaFilter, setPersonaFilter] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('C1003');
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // 1. Subscribe to Firestore Customers (merge with synthetic fallback)
  useEffect(() => {
    const unsub = onSnapshot(query(customersCol()), (snap) => {
      if (!snap.empty) {
        const firestoreMap = new Map<string, Customer>();
        snap.forEach((doc) => {
          const c = { ...doc.data(), id: doc.id } as Customer;
          firestoreMap.set(c.customer_id, c);
        });
        // Merge: firestore documents overwrite synthetic records with matching customer_id
        const merged = Object.values(SYNTHETIC_CUSTOMERS).map((synth) => firestoreMap.get(synth.customer_id) || synth);
        // Include any new firestore customers not in synthetic list
        firestoreMap.forEach((cust, id) => {
          if (!SYNTHETIC_CUSTOMERS[id]) merged.push(cust);
        });
        setCustomers(merged);
      }
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Transactions
  useEffect(() => {
    const unsub = onSnapshot(query(transactionsCol()), (snap) => {
      if (!snap.empty) {
        const firestoreTxs: Transaction[] = [];
        snap.forEach((doc) => firestoreTxs.push({ ...doc.data(), id: doc.id } as Transaction));
        
        // Merge with synthetic, prioritizing firestore items by transaction_id
        const txMap = new Map<string, Transaction>();
        SYNTHETIC_TRANSACTIONS.forEach((t) => txMap.set(t.transaction_id, t));
        firestoreTxs.forEach((t) => txMap.set(t.transaction_id, t));
        setAllTransactions(Array.from(txMap.values()));
      }
    });
    return () => unsub();
  }, []);

  // 3. Subscribe to Accounts
  useEffect(() => {
    const unsub = onSnapshot(query(accountsCol()), (snap) => {
      if (!snap.empty) {
        const accMap = { ...SYNTHETIC_ACCOUNTS };
        snap.forEach((doc) => {
          const a = doc.data() as Account;
          accMap[a.account_id] = a;
        });
        setAllAccounts(accMap);
      }
    });
    return () => unsub();
  }, []);

  // 4. Subscribe to Devices
  useEffect(() => {
    const unsub = onSnapshot(query(devicesCol()), (snap) => {
      if (!snap.empty) {
        const devMap = new Map<string, Device>();
        SYNTHETIC_DEVICES.forEach((d) => devMap.set(d.device_id, d));
        snap.forEach((doc) => {
          const d = doc.data() as Device;
          devMap.set(d.device_id, d);
        });
        setAllDevices(Array.from(devMap.values()));
      }
    });
    return () => unsub();
  }, []);

  // 5. Subscribe to Login Events
  useEffect(() => {
    const unsub = onSnapshot(query(loginEventsCol()), (snap) => {
      if (!snap.empty) {
        const logMap = new Map<string, LoginEvent>();
        SYNTHETIC_LOGIN_EVENTS.forEach((l) => logMap.set(l.event_id, l));
        snap.forEach((doc) => {
          const l = doc.data() as LoginEvent;
          logMap.set(l.event_id, l);
        });
        setAllLogins(Array.from(logMap.values()));
      }
    });
    return () => unsub();
  }, []);

  // 6. Subscribe to Cases
  useEffect(() => {
    const unsub = onSnapshot(query(casesCol()), (snap) => {
      const data: Case[] = [];
      snap.forEach((doc) => data.push({ ...doc.data(), id: doc.id } as Case));
      
      // If Firestore is empty, provide canonical C1003 investigation case for immediate demo utility
      if (data.length === 0) {
        data.push({
          id: 'CASE-C1003-HERO',
          caseNumber: 'CASE-2026-C1003',
          transactionId: 'TXN-SEED-C1003-FRAUD',
          customerId: 'C1003',
          status: 'IN_REVIEW',
          riskScore: 95,
          riskLevel: 'CRITICAL',
          confidence: 0.96,
          verdict: 'COORDINATED_ACCOUNT_TAKEOVER',
          recommendation: 'BLOCK_AND_CREATE_CASE',
          investigationSummary:
            'Critical account takeover confirmed. 3 sequential password failure bursts in Mumbai at 02:00 followed by credential compromise via Kali Linux root emulator DEV-1003-ROGUE. Out-of-hours ₹85,000 transfer to high-risk jewellery merchant.',
          createdAt: '2026-10-07T02:15:00Z',
          updatedAt: '2026-10-07T02:20:00Z',
        });
      }
      setAllCases(data);
    });
    return () => unsub();
  }, []);

  // Helper map for customer transaction statistics
  const customerStats = useMemo(() => {
    const stats: Record<string, { count: number; volume: number; blockedCount: number; lastDate: string | null }> = {};
    for (const c of customers) {
      stats[c.customer_id] = { count: 0, volume: 0, blockedCount: 0, lastDate: null };
    }
    for (const t of allTransactions) {
      if (!stats[t.customer_id]) {
        stats[t.customer_id] = { count: 0, volume: 0, blockedCount: 0, lastDate: null };
      }
      stats[t.customer_id].count++;
      stats[t.customer_id].volume += t.amount;
      if (t.status === 'BLOCK_AND_REVIEW' || t.status === 'BLOCKED') {
        stats[t.customer_id].blockedCount++;
      }
      if (!stats[t.customer_id].lastDate || new Date(t.timestamp) > new Date(stats[t.customer_id].lastDate!)) {
        stats[t.customer_id].lastDate = t.timestamp;
      }
    }
    return stats;
  }, [customers, allTransactions]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.customer_id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  // Customer-scoped data
  const customerTxs = useMemo(() => {
    if (!selectedCustomer) return [];
    return allTransactions
      .filter((t) => t.customer_id === selectedCustomer.customer_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allTransactions, selectedCustomer]);

  const customerDevices = useMemo(() => {
    if (!selectedCustomer) return [];
    return allDevices.filter((d) => d.customer_id === selectedCustomer.customer_id);
  }, [allDevices, selectedCustomer]);

  const customerLogins = useMemo(() => {
    if (!selectedCustomer) return [];
    return allLogins
      .filter((l) => l.customer_id === selectedCustomer.customer_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allLogins, selectedCustomer]);

  const customerCases = useMemo(() => {
    if (!selectedCustomer) return [];
    return allCases.filter((c) => c.customerId === selectedCustomer.customer_id);
  }, [allCases, selectedCustomer]);

  const customerAccount = useMemo(() => {
    if (!selectedCustomer) return null;
    const accId = selectedCustomer.primary_account_id || selectedCustomer.account_ids?.[0];
    if (accId && allAccounts[accId]) return allAccounts[accId];
    return Object.values(allAccounts).find((a) => a.customer_id === selectedCustomer.customer_id) || null;
  }, [allAccounts, selectedCustomer]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Risk filter
      if (riskFilter !== 'ALL' && c.risk_profile !== riskFilter) return false;

      // Persona / Tag filter
      if (personaFilter === 'HERO_C1003' && c.customer_id !== 'C1003') return false;
      if (personaFilter === 'ATO' && !c.tags?.some((t) => t.includes('ATO') || t.includes('SUSPECT'))) return false;
      if (personaFilter === 'TRAVEL' && !c.tags?.some((t) => t.includes('TRAVEL'))) return false;
      if (personaFilter === 'MULE' && !c.tags?.some((t) => t.includes('MULE') || t.includes('RING'))) return false;
      if (personaFilter === 'CASES' && !allCases.some((cs) => cs.customerId === c.customer_id)) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const accNumber = customerAccount?.account_number?.toLowerCase() || '';
        const matchName = c.name.toLowerCase().includes(query);
        const matchId = c.customer_id.toLowerCase().includes(query);
        const matchCity = c.home_city.toLowerCase().includes(query);
        const matchOcc = c.occupation?.toLowerCase().includes(query) || false;
        const matchAcc = accNumber.includes(query) || (c.primary_account_id && c.primary_account_id.toLowerCase().includes(query));
        return matchName || matchId || matchCity || matchOcc || matchAcc;
      }

      return true;
    });
  }, [customers, riskFilter, personaFilter, searchTerm, customerAccount, allCases]);

  // Activity & risk summary text generator for list card
  const getActivitySummary = (c: Customer) => {
    if (c.customer_id === 'C1003') {
      return 'Coordinated ATO • Rogue Kali Linux Emulator • Urgent Case';
    }
    if (c.tags?.includes('ATO_VICTIM_HERO')) {
      return 'ATO Anomaly • Rogue Device Detected';
    }
    if (c.tags?.includes('FREQUENT_TRAVELER') || c.tags?.includes('SCENARIO_D')) {
      return 'Frequent Traveler • Recognized Device • Low Risk Travel';
    }
    if (c.tags?.includes('FRAUD_RING_MULE') || c.tags?.includes('SCENARIO_E')) {
      return 'Coordinated Fraud Ring • Shared Emulator Proxy Cluster';
    }
    if (c.tags?.includes('HNW_CLIENT')) {
      return 'High Net Worth • High-Limit Wealth Account';
    }
    if (c.tags?.includes('AMOUNT_ANOMALY')) {
      return 'Unusual Amount Spike • Step-Up Candidate';
    }
    if (c.risk_profile === 'HIGH') {
      return 'High Risk Tier • Elevated Anomaly Profile';
    }
    if (c.risk_profile === 'MEDIUM') {
      return 'Moderate Deviation • Step-Up Authentication Required';
    }
    return `Legitimate Baseline • Normal transactions in ${c.home_city}`;
  };

  // Open investigation action handler
  const handleOpenInvestigation = () => {
    if (!selectedCustomer) return;
    if (selectedCustomer.customer_id === 'C1003') {
      // Direct jump to multi-agent investigation workspace for canonical hero scenario
      window.location.hash = 'investigation-workspace';
    } else if (customerCases.length > 0) {
      window.location.hash = 'cases';
    } else {
      window.location.hash = 'investigations';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-7.5rem)] min-h-[700px] gap-4">
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* LEFT PANEL: SEARCH, FILTERS & CUSTOMER DIRECTORY                             */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-96 flex flex-col glass-card border-[var(--border-subtle)] p-4 shrink-0 overflow-hidden">
        {/* Header Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">Customer Intelligence</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">Dossiers & Telemetry</p>
            </div>
          </div>
          <span className="badge text-[10px] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
            {filteredCustomers.length} / {customers.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search name, C1003, account, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Risk Pills */}
        <div className="flex items-center gap-1 mb-2.5 pb-2 border-b border-[var(--border-subtle)] shrink-0 overflow-x-auto scrollbar-none">
          {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as RiskFilter[]).map((rf) => {
            const isSelected = riskFilter === rf;
            const colors = {
              ALL: isSelected ? 'bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)]',
              LOW: isSelected ? 'bg-[#16866A] text-white' : 'text-[#16866A] hover:bg-[#16866A]/10',
              MEDIUM: isSelected ? 'bg-[#B7791F] text-white' : 'text-[#B7791F] hover:bg-[#B7791F]/10',
              HIGH: isSelected ? 'bg-[#C43D4B] text-white' : 'text-[#C43D4B] hover:bg-[#C43D4B]/10',
            }[rf];

            return (
              <button
                key={rf}
                onClick={() => setRiskFilter(rf)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${colors}`}
              >
                {rf}
              </button>
            );
          })}
        </div>

        {/* Quick Persona Chips */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-none pb-1 shrink-0">
          <button
            onClick={() => setPersonaFilter('ALL')}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              personaFilter === 'ALL'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/30 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setPersonaFilter('HERO_C1003');
              setSelectedCustomerId('C1003');
            }}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              personaFilter === 'HERO_C1003'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/40 font-bold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            <Sparkles className="h-2.5 w-2.5 text-[#3157D5]" /> Demo (C1003)
          </button>
          <button
            onClick={() => setPersonaFilter('ATO')}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              personaFilter === 'ATO'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/40 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            ATO Suspects
          </button>
          <button
            onClick={() => setPersonaFilter('TRAVEL')}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              personaFilter === 'TRAVEL'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/40 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            Travelers (Scen D)
          </button>
          <button
            onClick={() => setPersonaFilter('MULE')}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              personaFilter === 'MULE'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/40 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            Fraud Ring (Scen E)
          </button>
          <button
            onClick={() => setPersonaFilter('CASES')}
            className={`text-[10px] px-2.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              personaFilter === 'CASES'
                ? 'bg-[#EEF2FF] text-[#3157D5] border border-[#3157D5]/40 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
            }`}
          >
            Has Cases
          </button>
        </div>

        {/* Customer List Scroll Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {filteredCustomers.map((c) => {
            const isSelected = selectedCustomer?.customer_id === c.customer_id;
            const stats = customerStats[c.customer_id] || { count: 0, volume: 0, blockedCount: 0 };
            const isC1003 = c.customer_id === 'C1003';
            const acc = allAccounts[c.primary_account_id || ''] || null;

            return (
              <div
                key={c.customer_id}
                onClick={() => setSelectedCustomerId(c.customer_id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'border-[#3157D5] bg-[#EEF2FF]/40 shadow-xs ring-1 ring-[#3157D5]/20'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-subtle)]/40'
                }`}
              >
                {/* Top Row: Name & Risk Badge */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-[var(--text-primary)] truncate">{c.name}</span>
                    {isC1003 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface-subtle)] text-[#3157D5] border border-[var(--border-subtle)] font-medium">
                        Hero
                      </span>
                    )}
                  </div>
                  <span
                    className={`badge text-[9px] font-mono px-1.5 py-0.2 shrink-0 flex items-center gap-1 ${
                      c.risk_profile === 'LOW'
                        ? 'bg-[#16866A]/10 text-[#16866A] border border-[#16866A]/20'
                        : c.risk_profile === 'MEDIUM'
                        ? 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                        : 'bg-[#C43D4B]/10 text-[#C43D4B] border border-[#C43D4B]/20 font-bold'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        c.risk_profile === 'LOW'
                          ? 'bg-[#16866A]'
                          : c.risk_profile === 'MEDIUM'
                          ? 'bg-[#B7791F]'
                          : 'bg-[#C43D4B]'
                      }`}
                    />
                    {c.risk_profile}
                  </span>
                </div>

                {/* Second Row: ID, Primary Account & Transaction Count */}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono mb-1.5">
                  <span className="text-[#3157D5] font-semibold">{c.customer_id}</span>
                  <span className="truncate max-w-[140px] text-[var(--text-secondary)]">
                    {acc?.account_number || c.primary_account_id || 'ACC-DEFAULT'}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {stats.count} {stats.count === 1 ? 'txn' : 'txns'}
                  </span>
                </div>

                {/* Third Row: Activity / Risk Summary Line */}
                <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-2 line-clamp-2">
                  {getActivitySummary(c)}
                </div>

                {/* Footer Metrics Strip */}
                <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border-subtle)]">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-[var(--text-muted)]" /> {c.home_city}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Smartphone className="h-2.5 w-2.5 text-[var(--text-muted)]" />{' '}
                    {c.usual_device_ids?.length || 1} {c.usual_device_ids?.length === 1 ? 'dev' : 'devs'}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    ₹{(stats.volume / 1000).toFixed(stats.volume >= 10000 ? 0 : 1)}k vol
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-[var(--text-muted)]">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No customers match the current filter or search criteria.
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANEL: RICH CUSTOMER INTELLIGENCE DOSSIER                              */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {selectedCustomer ? (
        <div className="flex-1 flex flex-col glass-card border-[var(--border-subtle)] p-5 overflow-hidden animate-in fade-in duration-200">
          {/* Header Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[var(--border-subtle)] gap-3 shrink-0">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center font-bold text-sm bg-[#0F172A] text-white shrink-0 border border-[var(--border-subtle)] shadow-xs">
                {selectedCustomer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedCustomer.name}</h2>
                  <span
                    className={`badge text-[10px] font-mono px-2 py-0.5 font-semibold flex items-center gap-1.5 ${
                      selectedCustomer.risk_profile === 'LOW'
                        ? 'bg-[#16866A]/10 text-[#16866A] border border-[#16866A]/20'
                        : selectedCustomer.risk_profile === 'MEDIUM'
                        ? 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                        : 'bg-[#C43D4B]/10 text-[#C43D4B] border border-[#C43D4B]/20'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedCustomer.risk_profile === 'LOW'
                          ? 'bg-[#16866A]'
                          : selectedCustomer.risk_profile === 'MEDIUM'
                          ? 'bg-[#B7791F]'
                          : 'bg-[#C43D4B]'
                      }`}
                    />
                    {selectedCustomer.risk_profile} RISK PROFILE
                  </span>
                  {selectedCustomer.customer_id === 'C1003' && (
                    <span className="badge text-[10px] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                      Scenario C Reference
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                  <span className="text-[#3157D5] font-bold">{selectedCustomer.customer_id}</span>
                  <span>•</span>
                  <span>{selectedCustomer.occupation || 'Retail Banking Customer'}</span>
                  <span>•</span>
                  <span>Tenure: {selectedCustomer.tenure_months || 24} mos</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[var(--text-muted)]" /> {selectedCustomer.home_city}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => {
                  window.location.hash = 'entity-graph';
                }}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                title="View relationship graph"
              >
                <Layers className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>Entity Graph</span>
              </button>

              <button
                onClick={handleOpenInvestigation}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-medium"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Open Investigation</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </div>

          {/* ─── C1003 HERO DEMO CALLOUT BANNER ───────────────────────────────────── */}
          {selectedCustomer.customer_id === 'C1003' && (
            <div className="mt-4 p-4 rounded-lg border border-[var(--border-subtle)] border-l-4 border-l-[#C43D4B] bg-[var(--bg-surface)] shrink-0 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#C43D4B]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
                      Scenario C: Coordinated Account Takeover (ATO)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                    Vikram’s profile illustrates the canonical ATO attack pattern: <span className="font-semibold text-[#C43D4B]">3 failed login attempts in Mumbai</span> preceded a session takeover via <span className="font-semibold text-[var(--text-primary)]">Kali Linux emulator (DEV-1003-ROGUE)</span> and an out-of-hours <span className="font-semibold font-mono text-[var(--text-primary)]">₹85,000</span> transfer to Luxury Jewels & Bullion.
                  </p>
                </div>
                <button
                  onClick={() => (window.location.hash = 'investigation-workspace')}
                  className="btn-primary text-white text-xs px-3.5 py-2 font-medium shrink-0 flex items-center gap-2 shadow-xs"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Launch Cockpit</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Attack Progression Strip */}
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <div className="text-[var(--text-muted)] font-mono">01:58 - 02:09</div>
                  <div className="font-semibold text-[#C43D4B] mt-0.5">3 Password Fails</div>
                  <div className="text-[var(--text-muted)] truncate">IP: 103.21.144.92 (Mumbai)</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <div className="text-[var(--text-muted)] font-mono">02:11</div>
                  <div className="font-semibold text-[#C43D4B] mt-0.5">Compromised Login</div>
                  <div className="text-[var(--text-muted)] truncate">DEV-1003-ROGUE (Kali VM)</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <div className="text-[var(--text-muted)] font-mono">02:13</div>
                  <div className="font-semibold text-[#C43D4B] mt-0.5">₹85,000 Outflow</div>
                  <div className="text-[var(--text-muted)] truncate">Luxury Jewels & Bullion</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <div className="text-[var(--text-muted)] font-mono">Deterministic Engine</div>
                  <div className="font-semibold text-[#C43D4B] mt-0.5">Score 95 • CRITICAL</div>
                  <div className="text-[#16866A] font-semibold truncate">BLOCK & Case Created</div>
                </div>
              </div>
            </div>
          )}

          {/* ─── QUICK METRICS STRIP ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Account ID</div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1 truncate">
                {customerAccount?.account_number || selectedCustomer.primary_account_id || 'ACC-N/A'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Balance: ₹{customerAccount?.current_balance?.toLocaleString() || '124,000'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Spend Baseline</div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1">
                ₹{selectedCustomer.normal_amount_min?.toLocaleString()} - ₹{selectedCustomer.normal_amount_max?.toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Hours: {selectedCustomer.normal_hours_start || 9}:00 - {selectedCustomer.normal_hours_end || 21}:00
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Activity Volume</div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1">
                {customerTxs.length} Transactions
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                Gross: ₹{customerTxs.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Known Devices</div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{customerDevices.length} Hardware Nodes</span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {customerLogins.length} recorded logins
              </div>
            </div>
          </div>

          {/* ─── DETAIL TABS STRIP ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] mb-4 shrink-0 overflow-x-auto scrollbar-none">
            {[
              { id: 'overview', label: 'Overview & Profile' },
              { id: 'transactions', label: `Transactions (${customerTxs.length})` },
              { id: 'devices', label: `Devices (${customerDevices.length})` },
              { id: 'logins', label: `Login Activity (${customerLogins.length})` },
              { id: 'locations', label: 'Locations & Travel' },
              { id: 'risk', label: `Risk History (${customerCases.length} Cases)` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── TAB CONTENT AREA ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {/* TAB 1: OVERVIEW & PROFILE */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Information Card */}
                <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Customer Demographic Baseline
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-[var(--border-subtle)]">
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Full Name</span>
                      <span className="font-semibold text-[var(--text-primary)]">{selectedCustomer.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Home City</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedCustomer.home_city}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Frequent / Usual Cities</span>
                      <span className="font-medium text-[var(--text-primary)] text-right">
                        {selectedCustomer.usual_cities?.join(', ') || selectedCustomer.home_city}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Frequent Merchants</span>
                      <span className="font-medium text-[var(--text-primary)] text-right max-w-[220px] truncate">
                        {selectedCustomer.frequent_merchants?.join(', ') || 'FreshMart Supermarket'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Account Status</span>
                      <span className="badge text-[10px] bg-emerald-500/10 text-emerald-600 font-mono">
                        {customerAccount?.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account & Limits Card */}
                <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Account Portfolio & Limits
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-[var(--border-subtle)]">
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Primary Account</span>
                      <span className="font-mono font-bold text-[var(--accent)]">
                        {customerAccount?.account_number || selectedCustomer.primary_account_id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Account Type</span>
                      <span className="font-mono text-[var(--text-primary)]">{customerAccount?.account_type || 'SAVINGS'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Daily Transaction Limit</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        ₹{(customerAccount?.daily_limit || 150000).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Normal Amount Range</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        ₹{selectedCustomer.normal_amount_min} - ₹{selectedCustomer.normal_amount_max}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[var(--text-muted)]">Normal Operating Hours</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {selectedCustomer.normal_hours_start || 9}:00 - {selectedCustomer.normal_hours_end || 21}:00 IST
                      </span>
                    </div>
                  </div>
                </div>

                {/* Behavioral & Security Summary */}
                <div className="md:col-span-2 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2">
                    Behavioral Context & Notes
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {selectedCustomer.notes ||
                      `${selectedCustomer.name} has maintained an account for ${
                        selectedCustomer.tenure_months || 24
                      } months. Profile characterized by typical retail transactions in ${
                        selectedCustomer.home_city
                      }. Tags: ${selectedCustomer.tags?.join(', ') || 'STANDARD_RETAIL'}.`}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: RECENT TRANSACTIONS */}
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--bg-surface-subtle)] text-[10px] uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Merchant / Beneficiary</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {customerTxs.map((t) => {
                        const isHighRisk = t.status === 'BLOCK_AND_REVIEW' || t.status === 'BLOCKED';
                        const isStepUp = t.status === 'STEP_UP_VERIFICATION';

                        return (
                          <tr
                            key={t.transaction_id}
                            className="hover:bg-[var(--bg-surface-subtle)] transition-colors"
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-medium text-[var(--text-primary)]">
                                {new Date(t.timestamp).toLocaleDateString()}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#3157D5] whitespace-nowrap">
                              {t.transaction_id}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-[var(--text-primary)]">{t.merchant}</div>
                              {t.beneficiary && (
                                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">
                                  To: {t.beneficiary}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[var(--text-secondary)]">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-[var(--text-muted)]" /> {t.city}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10px] text-[var(--text-muted)]">
                              {t.transaction_type}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap">
                              ₹{t.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span
                                className={`badge text-[9px] font-mono px-2 py-0.5 ${
                                  isHighRisk
                                    ? 'bg-[#C43D4B]/10 text-[#C43D4B] border border-[#C43D4B]/20 font-bold'
                                    : isStepUp
                                    ? 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                                    : 'bg-[#16866A]/10 text-[#16866A] border border-[#16866A]/20'
                                }`}
                              >
                                {t.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {customerTxs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                            No transactions recorded for this customer profile.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DEVICES */}
            {activeTab === 'devices' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customerDevices.map((d) => {
                    const isRogue = !d.known || d.is_root_or_emulator;

                    return (
                      <div
                        key={d.device_id}
                        className={`p-4 rounded-lg border transition-all ${
                          isRogue
                            ? 'border-[var(--border-subtle)] border-l-2 border-l-[#C43D4B] bg-[var(--bg-surface)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Smartphone className={`h-4 w-4 ${isRogue ? 'text-[#C43D4B]' : 'text-[#16866A]'}`} />
                            <span className="font-bold text-xs text-[var(--text-primary)]">
                              {d.model || d.device_type}
                            </span>
                          </div>
                          <span
                            className={`badge text-[9px] font-mono px-2 py-0.5 ${
                              isRogue
                                ? 'bg-[#C43D4B]/10 text-[#C43D4B] border border-[#C43D4B]/20 font-bold'
                                : 'bg-[#16866A]/10 text-[#16866A] border border-[#16866A]/20'
                            }`}
                          >
                            {isRogue ? 'ROGUE / UNTRUSTED' : 'KNOWN TRUSTED'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                            <span className="text-[var(--text-muted)]">Device ID</span>
                            <span className="font-mono text-[#3157D5] font-semibold">{d.device_id}</span>
                          </div>
                          <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                            <span className="text-[var(--text-muted)]">Operating System</span>
                            <span className="font-medium text-[var(--text-primary)]">{d.os || 'Android'}</span>
                          </div>
                          <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                            <span className="text-[var(--text-muted)]">Emulator / Root Status</span>
                            <span
                              className={`font-mono font-bold ${
                                d.is_root_or_emulator ? 'text-[#C43D4B]' : 'text-[#16866A]'
                              }`}
                            >
                              {d.is_root_or_emulator ? 'EMULATOR DETECTED' : 'Clean Hardware'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                            <span className="text-[var(--text-muted)]">Remote Access Tool</span>
                            <span
                              className={`font-mono font-bold ${
                                d.is_remote_access ? 'text-[#C43D4B]' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {d.is_remote_access ? 'DETECTED (HIGH RISK)' : 'None'}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 text-[10px] text-[var(--text-muted)]">
                            <span>First seen: {new Date(d.first_seen).toLocaleDateString()}</span>
                            <span>Last seen: {new Date(d.last_seen).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {customerDevices.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-xs text-[var(--text-muted)]">
                      No device telemetry registered for this customer.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: LOGIN ACTIVITY */}
            {activeTab === 'logins' && (
              <div className="space-y-3">
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--bg-surface-subtle)] text-[10px] uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">City / IP Address</th>
                        <th className="py-2.5 px-3">Device ID</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {customerLogins.map((l, i) => (
                        <tr
                          key={l.event_id || i}
                          className={`hover:bg-[var(--bg-surface-subtle)] transition-colors ${
                            !l.success ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[var(--text-primary)]">
                            {new Date(l.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[var(--text-muted)]" /> {l.city}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">{l.ip_address}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--accent)]">{l.device_id}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`badge text-[9px] font-mono px-2 py-0.5 ${
                                l.success
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold'
                              }`}
                            >
                              {l.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px]">
                            {l.failure_reason ? (
                              <span className="text-rose-600 font-bold">{l.failure_reason}</span>
                            ) : (
                              <span className="text-[var(--text-muted)]">Normal Session</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {customerLogins.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)]">
                            No login audit trail recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: LOCATIONS & TRAVEL */}
            {activeTab === 'locations' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                    <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                      Geographic Footprint & Baseline
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span className="text-[var(--text-muted)]">Registered Home City</span>
                        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-500" /> {selectedCustomer.home_city}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span className="text-[var(--text-muted)]">Usual / Frequent Cities</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">
                          {selectedCustomer.usual_cities?.join(', ') || selectedCustomer.home_city}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                        <span className="text-[var(--text-muted)]">Distinct Observed Locations</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {Array.from(new Set(customerTxs.map((t) => t.city).concat(customerLogins.map((l) => l.city)))).length}{' '}
                          Cities
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Travel & Velocity Assessment */}
                  <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
                    <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                      Geo-Velocity & Impossible Travel Check
                    </h3>
                    {selectedCustomer.customer_id === 'C1003' ? (
                      <div className="p-3 rounded border border-[var(--border-subtle)] border-l-2 border-l-[#C43D4B] bg-[var(--bg-surface)] text-xs space-y-1">
                        <div className="font-semibold text-[#C43D4B] flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> IMPOSSIBLE TRAVEL ANOMALY TRIGGERED
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Login in Bengaluru at 20:40 on DEV-1003-A, followed by login bursts from Mumbai at 01:58 (~840 km distance in under 5 hours without transit telemetry).
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded border border-[var(--border-subtle)] border-l-2 border-l-[#16866A] bg-[var(--bg-surface)] text-xs space-y-1">
                        <div className="font-semibold text-[#16866A] flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Normal Geo-Velocity
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          All recorded transactions fall within the customer’s expected travel corridor or adhere to the Isolation Rule.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cities breakdown table */}
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-surface-subtle)] text-[10px] uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Txn Count</th>
                        <th className="py-2.5 px-3 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {Array.from(new Set(customerTxs.map((t) => t.city))).map((city) => {
                        const txsInCity = customerTxs.filter((t) => t.city === city);
                        const vol = txsInCity.reduce((s, t) => s + t.amount, 0);
                        const isHome = city === selectedCustomer.home_city;
                        const isUsual = selectedCustomer.usual_cities?.includes(city);

                        return (
                          <tr key={city} className="hover:bg-[var(--bg-surface-subtle)]">
                            <td className="py-2.5 px-3 font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                              <MapPin className={`h-3 w-3 ${isHome ? 'text-[#16866A]' : 'text-[var(--text-muted)]'}`} />
                              {city}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`badge text-[9px] font-mono px-1.5 py-0.2 ${
                                  isHome
                                    ? 'bg-[#16866A]/10 text-[#16866A] border border-[#16866A]/20'
                                    : isUsual
                                    ? 'bg-[#3157D5]/10 text-[#3157D5] border border-[#3157D5]/20'
                                    : 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                                }`}
                              >
                                {isHome ? 'HOME BASE' : isUsual ? 'USUAL CORRIDOR' : 'UNFAMILIAR / NEW'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono">{txsInCity.length}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">₹{vol.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: RISK HISTORY & INVESTIGATIONS */}
            {activeTab === 'risk' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Associated Cases & Human-in-the-Loop Dispositions
                  </h3>
                  <button
                    onClick={handleOpenInvestigation}
                    className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5"
                  >
                    <FolderKanban className="h-3.5 w-3.5 text-[#3157D5]" />
                    <span>Open in Case Manager</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {customerCases.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[#3157D5]/40 transition-all space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge text-[9px] font-mono font-bold px-2 py-0.5 flex items-center gap-1 ${
                              cs.riskLevel === 'CRITICAL'
                                ? 'bg-[#C43D4B]/10 text-[#C43D4B] border border-[#C43D4B]/20'
                                : cs.riskLevel === 'HIGH'
                                ? 'bg-[#C65D1E]/10 text-[#C65D1E] border border-[#C65D1E]/20'
                                : 'bg-[#B7791F]/10 text-[#B7791F] border border-[#B7791F]/20'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                cs.riskLevel === 'CRITICAL'
                                  ? 'bg-[#C43D4B]'
                                  : cs.riskLevel === 'HIGH'
                                  ? 'bg-[#C65D1E]'
                                  : 'bg-[#B7791F]'
                              }`}
                            />
                            {cs.riskLevel} • SCORE {cs.riskScore}
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            {cs.caseNumber}
                          </span>
                        </div>
                        <span className="badge text-[9px] font-mono bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          STATUS: {cs.status}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {cs.investigationSummary}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
                        <span>Created: {new Date(cs.createdAt).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => (window.location.hash = 'investigation-workspace')}
                            className="text-[var(--accent)] hover:underline flex items-center gap-1"
                          >
                            Cockpit <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                          <span>•</span>
                          <button
                            onClick={() => (window.location.hash = 'cases')}
                            className="text-[var(--text-primary)] hover:underline flex items-center gap-1"
                          >
                            View Case <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {customerCases.length === 0 && (
                    <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-muted)] space-y-2">
                      <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500/50" />
                      <div>No active or past fraud investigations recorded for this customer profile.</div>
                      <div className="text-[10px]">
                        Transactions have operated within normal behavioral parameters.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center glass-card border-[var(--border-subtle)] p-12 text-center text-[var(--text-muted)]">
          <Users className="h-10 w-10 opacity-30 mb-2" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Select a Customer Profile</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
            Choose any customer from the directory to inspect their complete telemetry dossier, transaction trail, and device footprint.
          </p>
        </div>
      )}
    </div>
  );
};
export default Customers;
