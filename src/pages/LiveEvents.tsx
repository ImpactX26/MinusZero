import React from 'react';
import { Radio } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const LiveEvents: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Financial Events</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time transaction stream and telemetry ingestion monitor
          </p>
        </div>
        <Badge variant="accent" dot>
          Ingestion Ready
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Live Event Stream
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md">
            Continuous synthetic transaction events and ingress telemetry will appear in this stream during later phases.
          </p>
          <div className="terminal-text text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 rounded-md border border-[var(--border-subtle)]">
            Listener target: Firestore /transactions collection
          </div>
        </div>
      </Card>
    </div>
  );
};
