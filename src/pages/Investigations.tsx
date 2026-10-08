import React from 'react';
import { Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Investigations: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Investigation Workspace</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Multi-agent evidence analysis, correlation graph, and human-in-the-loop decision cockpit
          </p>
        </div>
        <Badge variant="accent" dot>
          Phase 6 Target
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Investigation Cockpit Foundation
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-lg">
            This workspace will host the 3-column triage layout: AI Brief &amp; Risk Waterfall, 11-Agent Progress Timeline with Evidence Provenance, and Entity Dossier with Human Action Confirmation.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <span className="badge text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40">
              Deterministic Scoring
            </span>
            <span className="badge text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--accent)]/30">
              Evidence-First
            </span>
            <span className="badge text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40">
              Human-in-the-Loop
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
