import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Activity,
  Database,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Stat item for the left info panel
const SystemStat: React.FC<{ label: string; value: string; accent?: 'emerald' | 'cyan' | 'amber' }> = ({
  label,
  value,
  accent = 'cyan',
}) => {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    cyan: 'text-[var(--accent)]',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className="terminal-text text-[var(--text-muted)] uppercase tracking-wider text-[10px]">{label}</span>
      <span className={`terminal-text font-semibold ${colorMap[accent]} text-xs`}>{value}</span>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { signInAnonymously, signInWithEmail, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch {
      // Error is caught and surfaced in context/error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    try {
      await signInAnonymously();
    } catch {
      // Error is caught and surfaced in context/error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-[calc(100vh-110px)] flex bg-[var(--bg-root)] text-[var(--text-primary)]">
      {/* LEFT PANEL — Brand & system info */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 relative">
        <div className="relative">
          {/* Logo & wordmark */}
          <div className="flex items-center gap-3 mb-12">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                FinGuard <span className="text-[var(--accent)]">AI</span>
              </div>
              <div className="terminal-text text-[var(--text-muted)] text-[11px]">Fraud Intelligence Platform</div>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
              AI-Powered<br />
              <span className="text-[var(--accent)]">Fraud Operations</span><br />
              Command Center
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
              Deterministic risk scoring, multi-signal fraud investigation,
              and AI-assisted case triage for banking fraud analysts.
            </p>
          </div>

          {/* System stats */}
          <div className="glass-card p-5 mb-8">
            <div className="terminal-text text-[var(--text-muted)] uppercase tracking-wider mb-3 text-[10px]">
              System Status
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SystemStat label="Firestore" value="CONNECTED" accent="emerald" />
              <SystemStat label="Auth Provider" value="Firebase v11" accent="cyan" />
              <SystemStat label="Scenarios" value="3 Canonical" accent="cyan" />
              <SystemStat label="Data Mode" value="Synthetic" accent="amber" />
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dot-emerald" />
              <span className="terminal-text text-emerald-600 dark:text-emerald-400 text-xs">All systems operational</span>
            </div>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              { icon: Activity, text: 'Real-time transaction risk scoring' },
              { icon: Database, text: 'Firestore-backed investigation pipeline' },
              { icon: Cpu, text: 'Deterministic 6-agent fraud analysis' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--accent)]">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <div className="relative terminal-text text-[var(--text-muted)] text-[11px]">
          finguard-ai-prototype · Hackathon Demo · Synthetic Data Only
        </div>
      </div>

      {/* RIGHT PANEL — Login form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand (hidden on desktop) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-[var(--text-primary)]">FinGuard <span className="text-[var(--accent)]">AI</span></div>
              <div className="terminal-text text-[var(--text-muted)] text-[11px]">Fraud Investigation Platform</div>
            </div>
          </div>

          {/* Card */}
          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                Investigator Access
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Authenticate to access the fraud operations dashboard
              </p>
            </div>

            {/* Error */}
            {displayError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-300 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Demo CTA — primary action */}
            <div className="mb-6">
              <button
                onClick={handleDemoSignIn}
                disabled={isSubmitting}
                className="w-full btn-primary justify-center py-2.5 text-sm"
              >
                <Fingerprint className="h-4 w-4" />
                <span>{isSubmitting ? 'Authenticating…' : 'Enter as Demo Investigator'}</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </button>
              <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
                Instant access · Recommended for hackathon review
              </p>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-subtle)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[var(--bg-surface)] px-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  or sign in with credentials
                </span>
              </div>
            </div>

            {/* Email / Password */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Investigator Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@finguard.internal"
                  className="input-field"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field pr-10"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-ghost justify-center py-2 mt-1 text-xs"
              >
                <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Sign In With Credentials</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Firebase Auth</span>
              <span>finguard-ai-prototype</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
