import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Activity, MapPin, AlertCircle } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { transactionsCol, casesCol } from '../firebase/collections';
import { Transaction, Case } from '../types';

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState({
    totalTx: 0,
    txVolume: 0,
    blocked: 0,
    allowed: 0,
    stepUp: 0,
    totalCases: 0,
    criticalCases: 0,
    highCases: 0
  });

  const [topSignals, setTopSignals] = useState<{name: string, count: number}[]>([]);
  const [geoData, setGeoData] = useState<{city: string, count: number}[]>([]);

  useEffect(() => {
    const unsubTx = onSnapshot(collection(transactionsCol().firestore, 'transactions'), snap => {
      let total = 0, vol = 0, blocked = 0, allowed = 0, stepUp = 0;
      const cities: Record<string, number> = {};
      
      snap.forEach(doc => {
        const tx = doc.data() as Transaction;
        total++;
        vol += tx.amount;
        if (tx.status === 'BLOCK_AND_REVIEW' || tx.status === 'BLOCKED') blocked++;
        else if (tx.status === 'STEP_UP_VERIFICATION') stepUp++;
        else allowed++;

        cities[tx.city] = (cities[tx.city] || 0) + 1;
      });

      const sortedCities = Object.entries(cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats(s => ({ ...s, totalTx: total, txVolume: vol, blocked, allowed, stepUp }));
      setGeoData(sortedCities);
    });

    const unsubCases = onSnapshot(collection(casesCol().firestore, 'cases'), snap => {
      let total = 0, critical = 0, high = 0;
      const signals: Record<string, number> = {};

      snap.forEach(doc => {
        const c = doc.data() as Case;
        total++;
        if (c.riskLevel === 'CRITICAL') critical++;
        else if (c.riskLevel === 'HIGH') high++;

        if (c.reasonCodes) {
          c.reasonCodes.forEach(rc => {
            const rcStr = rc as unknown as string;
            signals[rcStr] = (signals[rcStr] || 0) + 1;
          });
        }
      });

      const sortedSignals = Object.entries(signals)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats(s => ({ ...s, totalCases: total, criticalCases: critical, highCases: high }));
      setTopSignals(sortedSignals);
    });

    return () => { unsubTx(); unsubCases(); };
  }, []);

  const totalActioned = stats.blocked + stats.allowed + stats.stepUp;
  const blockedPct = totalActioned ? Math.round((stats.blocked / totalActioned) * 100) : 0;
  const allowedPct = totalActioned ? Math.round((stats.allowed / totalActioned) * 100) : 0;
  const stepUpPct = totalActioned ? Math.round((stats.stepUp / totalActioned) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Fraud Analytics Dashboard</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Live monitoring of typologies, risk distribution, and investigation metrics
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">Total Transaction Volume</div>
          <div className="text-2xl font-black font-mono text-[var(--text-primary)]">₹{(stats.txVolume / 1000).toFixed(1)}k</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" /> {stats.totalTx} transactions
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">Blocked / High Risk</div>
          <div className="text-2xl font-black font-mono text-rose-600">{stats.blocked}</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1">Interdicted pre-auth</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">Total Investigations</div>
          <div className="text-2xl font-black font-mono text-[var(--text-primary)]">{stats.totalCases}</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1">Cases generated</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">Critical Escalations</div>
          <div className="text-2xl font-black font-mono text-amber-500">{stats.criticalCases}</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1">Require immediate review</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Decision Distribution */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" /> Decision Distribution
          </h2>
          
          <div className="flex h-6 rounded-full overflow-hidden mb-6">
            <div style={{ width: `${allowedPct}%` }} className="bg-emerald-500 transition-all duration-1000" title={`Allowed: ${allowedPct}%`} />
            <div style={{ width: `${stepUpPct}%` }} className="bg-amber-500 transition-all duration-1000" title={`Step-Up: ${stepUpPct}%`} />
            <div style={{ width: `${blockedPct}%` }} className="bg-rose-500 transition-all duration-1000" title={`Blocked: ${blockedPct}%`} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500"></span>
                <span className="font-medium text-[var(--text-primary)]">Allowed</span>
              </div>
              <span className="text-[var(--text-secondary)] font-mono">{stats.allowed} ({allowedPct}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-500"></span>
                <span className="font-medium text-[var(--text-primary)]">Step-Up Verification</span>
              </div>
              <span className="text-[var(--text-secondary)] font-mono">{stats.stepUp} ({stepUpPct}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-500"></span>
                <span className="font-medium text-[var(--text-primary)]">Blocked & Review</span>
              </div>
              <span className="text-[var(--text-secondary)] font-mono">{stats.blocked} ({blockedPct}%)</span>
            </div>
          </div>
        </div>

        {/* Top Risk Signals */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--accent)]" /> Top Risk Signals (Cases)
          </h2>
          <div className="space-y-4">
            {topSignals.map((signal, idx) => {
              const max = topSignals[0]?.count || 1;
              const pct = Math.round((signal.count / max) * 100);
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-primary)] truncate pr-2" title={signal.name}>{signal.name}</span>
                    <span className="text-[var(--text-secondary)] font-mono shrink-0">{signal.count} hits</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-[var(--accent)] transition-all duration-1000" />
                  </div>
                </div>
              );
            })}
            {topSignals.length === 0 && (
              <div className="text-xs text-[var(--text-muted)] text-center py-4">No risk signals recorded yet.</div>
            )}
          </div>
        </div>

        {/* Geographic Summary */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--accent)]" /> Geographic Activity (Tx Volume)
          </h2>
          <div className="space-y-4">
            {geoData.map((geo, idx) => {
              const max = geoData[0]?.count || 1;
              const pct = Math.round((geo.count / max) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-[var(--text-primary)] truncate" title={geo.city}>
                    {geo.city}
                  </div>
                  <div className="flex-1 h-2 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-emerald-500 transition-all duration-1000" />
                  </div>
                  <div className="w-8 text-right text-xs text-[var(--text-secondary)] font-mono">
                    {geo.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Investigation Funnel */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--accent)]" /> Investigation Case Funnel
          </h2>
          <div className="flex h-32 items-end justify-around border-b border-[var(--border-subtle)] pb-2 relative">
            {/* Grid lines */}
            <div className="absolute inset-x-0 bottom-1/3 h-px bg-[var(--border-subtle)] border-dashed"></div>
            <div className="absolute inset-x-0 bottom-2/3 h-px bg-[var(--border-subtle)] border-dashed"></div>
            
            <div className="flex flex-col items-center gap-2 z-10 w-1/3">
              <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{stats.blocked + stats.stepUp}</div>
              <div 
                className="w-12 bg-slate-400 rounded-t-sm transition-all duration-1000"
                style={{ height: `${stats.blocked + stats.stepUp ? 100 : 0}%` }}
              />
              <div className="text-[10px] text-center text-[var(--text-muted)] h-6">Flagged<br/>Events</div>
            </div>
            
            <div className="flex flex-col items-center gap-2 z-10 w-1/3">
              <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{stats.totalCases}</div>
              <div 
                className="w-12 bg-amber-500 rounded-t-sm transition-all duration-1000"
                style={{ height: `${stats.totalCases ? (stats.totalCases / (stats.blocked + stats.stepUp || 1)) * 100 : 0}%`, minHeight: stats.totalCases ? '10%' : 0 }}
              />
              <div className="text-[10px] text-center text-[var(--text-muted)] h-6">Cases<br/>Created</div>
            </div>
            
            <div className="flex flex-col items-center gap-2 z-10 w-1/3">
              <div className="text-xs font-mono font-bold text-rose-500">{stats.criticalCases}</div>
              <div 
                className="w-12 bg-rose-500 rounded-t-sm shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000"
                style={{ height: `${stats.criticalCases ? (stats.criticalCases / (stats.blocked + stats.stepUp || 1)) * 100 : 0}%`, minHeight: stats.criticalCases ? '10%' : 0 }}
              />
              <div className="text-[10px] text-center text-rose-500 h-6">Critical<br/>Escalations</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
