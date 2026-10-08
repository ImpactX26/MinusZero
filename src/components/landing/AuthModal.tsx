import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Fingerprint,
  Loader2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
  targetTab?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'signin',
  targetTab = 'command-center',
}) => {
  const { signInAnonymously, signInWithEmail, signUpWithEmail, error, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    setLocalError(null);
    clearError();
    setForgotPasswordNotice(false);
  }, [initialTab, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateToTarget = () => {
    window.location.hash = targetTab;
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) {
      setLocalError('Please enter both investigator email and password.');
      return;
    }
    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    try {
      await signInWithEmail(signInEmail, signInPassword);
      navigateToTarget();
      onClose();
    } catch {
      // Handled in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName || !signUpEmail || !signUpPassword) {
      setLocalError('Please fill in all required registration fields.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setLocalError('Passwords do not match. Please verify your password confirmation.');
      return;
    }
    if (signUpPassword.length < 6) {
      setLocalError('Password must be at least 6 characters in length.');
      return;
    }
    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    try {
      if (signUpWithEmail) {
        await signUpWithEmail(signUpEmail, signUpPassword, signUpName);
      } else {
        await signInWithEmail(signUpEmail, signUpPassword);
      }
      navigateToTarget();
      onClose();
    } catch {
      // Handled in auth context
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
      navigateToTarget();
      onClose();
    } catch {
      // Handled in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
      {/* Dimmed backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl shadow-black/40 p-6 sm:p-8 z-10 overflow-hidden transform transition-all duration-300">
        {/* Ambient top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-70" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-[var(--primary)]/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-md shadow-[var(--primary)]/30 ring-1 ring-white/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-1.5">
              FinGuard <span className="text-[var(--accent)] font-extrabold">AI</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Access the Fraud Intelligence Platform
            </div>
          </div>
        </div>

        {/* Tabs: Sign In / Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setLocalError(null);
              clearError();
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'signin'
                ? 'bg-gradient-to-r from-[var(--primary)] to-[#4F46E5] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setLocalError(null);
              clearError();
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-[var(--primary)] to-[#4F46E5] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Display */}
        {displayError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{displayError}</div>
          </div>
        )}

        {/* ─── TAB 1: SIGN IN FORM ─── */}
        {activeTab === 'signin' && (
          <div>
            <form onSubmit={handleSignInSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Investigator Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="investigator@finguard.internal"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[var(--text-primary)]">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordNotice(true)}
                    className="text-[11px] text-[var(--primary)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-9 pr-10 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all"
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

              {/* Forgot password info toast */}
              {forgotPasswordNotice && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    In this prototype environment, enter credentials or use the instant{' '}
                    <strong className="text-[var(--text-primary)]">Demo Environment</strong> button below.
                  </span>
                </div>
              )}

              {/* Remember me checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border)] bg-[var(--surface-muted)] text-[var(--primary)] focus:ring-[var(--primary)] h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="remember-me" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Remember investigator session
                </label>
              </div>

              {/* Submit credentials button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[var(--primary)] via-[#4F46E5] to-[var(--secondary)] text-white text-xs font-semibold shadow-md shadow-[var(--primary)]/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying session…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[var(--surface)] px-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-muted)]">
                  OR
                </span>
              </div>
            </div>

            {/* Primary Demo Investigator Button */}
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <Fingerprint className="h-4 w-4 text-[var(--primary)]" />
              <span>Enter Demo Environment</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-[var(--primary)]" />
            </button>
            <p className="mt-2 text-center text-[10px] text-[var(--text-secondary)]">
              Demo access uses synthetic data and simulated transactions. No setup required.
            </p>
          </div>
        )}

        {/* ─── TAB 2: CREATE ACCOUNT FORM ─── */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Senior Fraud Analyst"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="analyst@bank.internal"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Password</label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2 px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Confirm</label>
                <input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2 px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[var(--primary)] via-[#4F46E5] to-[var(--secondary)] text-white text-xs font-semibold shadow-md shadow-[var(--primary)]/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Investigator Account…</span>
                </>
              ) : (
                <>
                  <span>Create Investigator Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-[var(--text-secondary)]">
              Your account will access the synthetic investigation environment.
            </p>
          </form>
        )}

        {/* ─── SECURITY TRUST PANEL ─── */}
        <div className="mt-6 pt-4 border-t border-[var(--border)] bg-[var(--surface-muted)] -mx-6 -mb-6 p-4 sm:p-5 rounded-b-2xl">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--text-primary)]">
              SECURE DEMO ENVIRONMENT
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)] shrink-0" />
              <span>Firebase Authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)] shrink-0" />
              <span>Synthetic transaction data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)] shrink-0" />
              <span>Deterministic risk engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)] shrink-0" />
              <span>Human-in-the-loop decisions</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2">
              <CheckCircle2 className="h-3 w-3 text-[var(--success)] shrink-0" />
              <span>Immutable audit trail hash-chain</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
