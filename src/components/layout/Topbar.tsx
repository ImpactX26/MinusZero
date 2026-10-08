import React from 'react';
import {
  ShieldAlert,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, Theme } from '../../context/ThemeContext';

export const Topbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="header-blur sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                FinGuard <span className="text-[var(--accent)]">AI</span>
              </span>
              <span className="badge text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--accent)]/20">
                V3 Master
              </span>
            </div>
            <p className="terminal-text text-[var(--text-muted)] text-[10px]">
              Fraud Intelligence &amp; Investigation Platform
            </p>
          </div>
        </div>

        {/* Center: Synthetic Data Notice */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dot-amber" />
            <span className="terminal-text text-amber-700 dark:text-amber-300 text-[11px]">
              Synthetic data · Demo prototype
            </span>
          </div>
        </div>

        {/* Right actions: Theme selector + User session */}
        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-0.5">
            {(
              [
                { id: 'light', icon: Sun, title: 'Light mode' },
                { id: 'dark', icon: Moon, title: 'Dark mode' },
                { id: 'system', icon: Laptop, title: 'System preference' },
              ] as const
            ).map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setTheme(id as Theme)}
                title={title}
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  theme === id
                    ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* User profile & Sign out */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1">
                <UserIcon className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="terminal-text text-[var(--text-secondary)] text-[11px] max-w-[120px] truncate">
                  {user.email ? user.email.split('@')[0] : 'Demo Investigator'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="btn-ghost py-1 px-2.5 text-xs"
                title="Sign out of prototype"
              >
                <LogOut className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
