import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Fraud Analytics &amp; Reporting</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Typology distribution, false-positive metrics, detection velocity, and risk trends
          </p>
        </div>
        <Badge variant="default">
          Metrics
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Analytics Cockpit
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md">
            Aggregated metrics for risk distribution, agent agreement rates, and investigation SLA adherence will populate in Phase 8.
          </p>
          <div className="terminal-text text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 rounded-md border border-[var(--border-subtle)]">
            Visual layer: Recharts lightweight components
          </div>
        </div>
      </Card>
    </div>
  );
};
