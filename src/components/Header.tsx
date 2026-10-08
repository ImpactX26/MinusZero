import React from 'react';
import { ShieldAlert, LogOut, User as UserIcon, Activity, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="header-blur sticky top-0 z-50 border-b border-[#1A2844]">
      {/* Scan line effect */}
      <div className="scan-line" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0284C7]/30 to-[#38BDF8]/10 border border-[#38BDF8]/25 glow-accent" />
            <ShieldAlert className="relative h-5 w-5 text-[#38BDF8]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white" style={{ letterSpacing: '-0.01em' }}>
                FinGuard<span className="text-[#38BDF8]"> AI</span>
              </span>
              <span className="badge" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8' }}>
                v0.2 · Phase 2
              </span>
            </div>
            <p className="terminal-text text-[#506080]">Banking Fraud-Investigation Platform</p>
          </div>
        </div>

        {/* Center status indicators */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dot-emerald" />
            <span className="terminal-text text-[#94A3B8]">Firestore <span className="text-emerald-400">LIVE</span></span>
          </div>
          <div className="h-4 w-px bg-[#1A2844]" />
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span className="terminal-text text-[#94A3B8]">3 canonical scenarios <span className="text-[#38BDF8]">ready</span></span>
          </div>
          <div className="h-4 w-px bg-[#1A2844]" />
          {/* Synthetic data badge */}
          <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 dot-amber" />
            <span className="terminal-text text-amber-300">Synthetic data · demo prototype</span>
          </div>
        </div>

        {/* User / Auth */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-[#1F3055] bg-[#0D1420] px-3 py-1.5">
              <UserIcon className="h-3.5 w-3.5 text-[#506080]" />
              <span className="terminal-text text-[#94A3B8] max-w-[160px] truncate">
                {user.email || 'Demo Investigator'}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="btn-ghost"
              title="Sign out of prototype"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}

        {!user && (
          <div className="flex items-center gap-2 terminal-text text-[#506080]">
            <Lock className="h-3.5 w-3.5" />
            <span>Not authenticated</span>
          </div>
        )}
      </div>
    </header>
  );
};
