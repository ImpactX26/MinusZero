import React from 'react';
import {
  Shield,
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
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-xs">
            <Shield className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                FinGuard <span className="text-[var(--accent)] font-bold">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-none mt-0.5">
              Fraud Intelligence &amp; Investigation Platform
            </p>
          </div>
        </div>

        {/* Center: Subtle Synthetic Data Indicator */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-1.5 rounded border border-[#FEF08A] dark:border-amber-900/40 bg-[#FEFCE8] dark:bg-amber-950/20 px-2.5 py-0.5 text-[11px] text-[#B7791F] dark:text-amber-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B7791F]" />
            <span>Synthetic Data • Demo Environment</span>
          </div>
        </div>

        {/* Right actions: Theme selector + User session */}
        <div className="flex items-center gap-2.5">
          {/* Theme switcher */}
          <div className="flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-0.5">
            {(
              [
                { id: 'light', icon: Sun, title: 'Light' },
                { id: 'dark', icon: Moon, title: 'Dark' },
                { id: 'system', icon: Laptop, title: 'System' },
              ] as const
            ).map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setTheme(id as Theme)}
                title={title}
                aria-label={title}
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
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
              <div className="hidden sm:flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                <UserIcon className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="max-w-[120px] truncate font-mono text-[11px]">
                  {user.email ? user.email.split('@')[0] : 'Investigator'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="btn-ghost py-1 px-2 text-xs flex items-center gap-1.5"
                title="Sign out of platform"
              >
                <LogOut className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
