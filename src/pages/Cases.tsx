import React from 'react';
import { FolderKanban } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Cases: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Case Management</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Active fraud cases queue, disposition tracking, SLA monitoring, and analyst notes
          </p>
        </div>
        <Badge variant="default">
          Queue Ready
        </Badge>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Case Queue &amp; Ledger
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md">
            Persisted cases, analyst dispositions (Allow, Step-Up, Hold, Block), and append-only audit histories will populate here.
          </p>
          <div className="terminal-text text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 rounded-md border border-[var(--border-subtle)]">
            Storage target: Firestore /cases &amp; /audit_logs
          </div>
        </div>
      </Card>
    </div>
  );
};
