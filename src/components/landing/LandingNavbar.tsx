import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, Sun, Moon, Laptop, Menu, X, Loader2, Compass } from 'lucide-react';
import { useTheme, Theme } from '../../context/ThemeContext';

interface LandingNavbarProps {
  onOpenAuth: (initialTab?: 'signin' | 'signup') => void;
  onEnterDemo: (targetRoute?: string) => void;
  isAuthenticating?: boolean;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenAuth,
  onEnterDemo,
  isAuthenticating = false,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'Intelligence', href: '#how-it-works' },
    { label: 'Simulation', href: '#simulation-preview' },
    { label: 'Investigations', href: '#investigations-preview' },
    { label: 'Technology', href: '#technology' },
    { label: 'Use Cases', href: '#cases-preview' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--surface)]/90 dark:bg-[#07111F]/90 backdrop-blur-md border-b border-[var(--border)] dark:border-white/10 shadow-xs dark:shadow-lg dark:shadow-black/30 py-3'
          : 'bg-transparent border-b border-transparent py-4'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* LEFT: FinGuard AI logo */}
          <a
            href="#"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3157D5] to-[#7C5CFC] text-white shadow-md shadow-[#3157D5]/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#22D3EE] ring-1 ring-[var(--surface)] dark:ring-[#07111F]" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[var(--text-primary)] dark:text-white flex items-center gap-1.5">
                FinGuard <span className="text-[#3157D5] dark:text-[#22D3EE] font-extrabold">AI</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[var(--surface-muted)] dark:bg-white/10 text-[var(--text-secondary)] dark:text-slate-300 font-semibold tracking-wider border border-[var(--border)] dark:border-transparent">
                  v3.2
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] dark:text-slate-400 font-mono tracking-wide leading-none">
                Fraud Intelligence Platform
              </div>
            </div>
          </a>

          {/* CENTER: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/70 dark:bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm shadow-xs">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-300 dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/10 rounded-full transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* RIGHT: CTAs & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Live Demo Quick Action: Guided Product Walkthrough */}
            <button
              type="button"
              onClick={() => onEnterDemo('product-tour')}
              disabled={isAuthenticating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3157D5] dark:text-[#22D3EE] hover:text-white bg-[#3157D5]/10 hover:bg-[#3157D5] dark:bg-[#22D3EE]/10 dark:hover:bg-[#22D3EE]/20 border border-[#3157D5]/30 dark:border-[#22D3EE]/30 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Guided Product Walkthrough & Capabilities"
            >
              {isAuthenticating ? (
                <Loader2 className="h-3 w-3 animate-spin text-current" />
              ) : (
                <Compass className="h-3.5 w-3.5" />
              )}
              <span>{isAuthenticating ? 'Launching…' : 'Live Demo'}</span>
            </button>

            {/* Theme Toggle (Light, Dark, System) */}
            <div className="flex items-center rounded-lg border border-[var(--border)] dark:border-white/10 bg-[var(--surface-muted)] dark:bg-white/5 p-0.5">
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
                  className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    theme === id
                      ? 'bg-[var(--surface)] dark:bg-white/20 text-[var(--primary)] dark:text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Enter Platform CTA */}
            <button
              onClick={() => onOpenAuth('signin')}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-[#3157D5] via-[#4F46E5] to-[#7C5CFC] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#3157D5]/25 hover:shadow-lg hover:shadow-[#3157D5]/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span className="relative z-10">Enter Platform</span>
              <ArrowRight className="h-3.5 w-3.5 relative z-10 transition-transform group-hover:translate-x-0.5" />
              <div className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => onOpenAuth('signin')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#3157D5] to-[#7C5CFC] text-white text-xs font-medium"
            >
              Enter
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--text-primary)] dark:text-slate-300 hover:text-[var(--primary)] dark:hover:text-white rounded-lg bg-[var(--surface-muted)] dark:bg-white/5 border border-[var(--border)] dark:border-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[var(--border)] dark:border-white/10 bg-[var(--surface)]/95 dark:bg-[#07111F]/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="block px-3 py-2 text-sm text-[var(--text-secondary)] dark:text-slate-300 hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/5 rounded-lg"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-[var(--border)] dark:border-white/10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onEnterDemo('product-tour');
              }}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#3157D5]/40 dark:border-[#22D3EE]/40 text-[#3157D5] dark:text-[#22D3EE] font-medium text-xs bg-[#3157D5]/10 dark:bg-[#22D3EE]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
              ) : (
                <Compass className="h-3.5 w-3.5" />
              )}
              <span>{isAuthenticating ? 'Launching Demo…' : 'Launch Product Tour'}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('signin');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#3157D5] to-[#7C5CFC] text-white font-medium text-xs shadow-md"
            >
              <span>Sign In / Enter Platform</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
