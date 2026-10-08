import React from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Activity,
  Lock,
  Info,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTheme, Theme } from '../context/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, actualTheme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">System Settings</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Appearance preferences, platform operational status, and governance parameters
          </p>
        </div>
        <Badge variant="accent">
          Active: {actualTheme.toUpperCase()}
        </Badge>
      </div>

      {/* ─── 1. THEME SETTINGS ──────────────────────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Appearance &amp; Theme</h2>
          </div>
        }
      >
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          FinGuard AI defaults to a crisp Light theme with full support for Dark mode and OS System preference.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                id: 'light',
                label: 'Light (Default)',
                desc: 'Clean white surfaces with high contrast',
                icon: Sun,
              },
              {
                id: 'dark',
                label: 'Dark',
                desc: 'Deep obsidian for low-light environments',
                icon: Moon,
              },
              {
                id: 'system',
                label: 'System Preference',
                desc: 'Automatically follow your operating system',
                icon: Laptop,
              },
            ] as const
          ).map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id as Theme)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                theme === id
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]/40 shadow-xs'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-surface-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${theme === id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                {theme === id && (
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">{label}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ─── 2. SYSTEM STATUS (PRODUCT-FACING) ──────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">System Status</h2>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Platform Status</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 dot-emerald" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Operational</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Data Mode</span>
            <span className="badge text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40">
              Synthetic Sandbox
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Investigation Engine Status</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-[var(--text-primary)]">Deterministic Ready</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Audit Logging Status</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-[var(--text-primary)]">Append-Only Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] font-medium">AI Assistance Status</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="font-medium text-[var(--text-primary)]">Grounded Narratives (Standby)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 3. SECURITY & PRIVACY ──────────────────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Security &amp; Privacy Governance</h2>
          </div>
        }
      >
        <div className="space-y-2.5 text-xs text-[var(--text-secondary)]">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">Synthetic Data Only:</strong> All customer profiles, account numbers, transactions, devices, and network identifiers are strictly fictional.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">No Real Banking Connections:</strong> The platform does not connect to live core banking systems, open banking APIs, or payment gateways.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">No Real Payment Processing:</strong> All account holds, step-up challenges, and account freezes are simulated for investigation demonstration.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">Human-in-the-Loop Safeguard:</strong> Autonomous systems only produce risk scores and recommendations. High-impact actions require explicit investigator confirmation.
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 4. ABOUT ───────────────────────────────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">About FinGuard AI</h2>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[var(--text-muted)] text-[11px] mb-1">Application</div>
            <div className="font-semibold text-[var(--text-primary)]">FinGuard AI</div>
            <div className="text-[var(--text-secondary)] text-[11px]">Fraud Intelligence Platform</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-[11px] mb-1">Environment</div>
            <div className="font-semibold text-[var(--text-primary)]">Demo Prototype</div>
            <div className="text-[var(--text-secondary)] text-[11px]">Phase 2 Foundation</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-[11px] mb-1">Specification</div>
            <div className="font-semibold text-[var(--text-primary)]">V3 Master Architecture</div>
            <div className="text-[var(--text-secondary)] text-[11px]">Hackathon Edition</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
