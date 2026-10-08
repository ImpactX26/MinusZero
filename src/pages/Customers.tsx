import React from 'react';
import { Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SYNTHETIC_CUSTOMERS } from '../data/scenarios';

export const Customers: React.FC = () => {
  const customerList = Object.values(SYNTHETIC_CUSTOMERS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Customer Intelligence</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Synthetic customer behavioral profiles, trusted devices, and historical baselines
            </p>
          </div>
        </div>
        <Badge variant="accent">
          {customerList.length} Profiles
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {customerList.map((c) => (
          <Card key={c.customer_id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{c.name}</h3>
                <span className="terminal-text text-[11px] text-[var(--text-muted)]">{c.customer_id}</span>
              </div>
              <span className={`badge text-[9px] ${
                c.risk_profile === 'LOW'
                  ? 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/40'
                  : c.risk_profile === 'MEDIUM'
                  ? 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-950/40'
                  : 'text-rose-700 bg-rose-100 border-rose-300 dark:text-rose-400 dark:bg-rose-950/40'
              }`}>
                {c.risk_profile} PROFILE
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-[var(--text-secondary)] mt-3">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Home City:</span>
                <span className="font-medium text-[var(--text-primary)]">{c.home_city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Normal Range:</span>
                <span className="font-medium text-[var(--text-primary)]">INR {c.normal_amount_min} – {c.normal_amount_max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Known Devices:</span>
                <span className="font-medium text-[var(--text-primary)]">{c.usual_device_ids.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Frequent Cities:</span>
                <span className="font-medium text-[var(--text-primary)]">{c.usual_cities.join(', ')}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
