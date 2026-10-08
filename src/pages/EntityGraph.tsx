import React from 'react';
import { Network } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const EntityGraph: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Entity &amp; Relationship Graph</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cross-entity linkages, device fingerprints, shared IP clusters, and fraud rings
          </p>
        </div>
        <Badge variant="accent">
          Graph Layer
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
            <Network className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            2D Entity Correlation Explorer
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md">
            Customer ↔ Device ↔ IP ↔ Beneficiary entity correlation and ring topology visualization will appear in this workspace.
          </p>
          <div className="terminal-text text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 rounded-md border border-[var(--border-subtle)]">
            Engine target: 2D lightweight SVG / Cytoscape graph
          </div>
        </div>
      </Card>
    </div>
  );
};
