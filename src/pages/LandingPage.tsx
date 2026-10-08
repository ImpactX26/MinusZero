import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  Play,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroNetworkVisual } from '../components/landing/HeroNetworkVisual';
import { AuthModal } from '../components/landing/AuthModal';
import { ProductCapabilities } from '../components/landing/ProductCapabilities';
import { HowItWorksPipeline } from '../components/landing/HowItWorksPipeline';
import { MultiBankSimulationPreview } from '../components/landing/MultiBankSimulationPreview';
import { InvestigationPreview } from '../components/landing/InvestigationPreview';
import { EntityGraphPreview } from '../components/landing/EntityGraphPreview';
import { CaseManagementPreview } from '../components/landing/CaseManagementPreview';
import { TechnologyStack } from '../components/landing/TechnologyStack';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  const { signInAnonymously } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'signin' | 'signup'>('signin');
  const [targetTab, setTargetTab] = useState<string>('command-center');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleOpenAuth = (initialTab: 'signin' | 'signup' = 'signin', target: string = 'command-center') => {
    setAuthInitialTab(initialTab);
    setTargetTab(target);
    setIsAuthModalOpen(true);
  };

  const handleEnterDemo = async (target: string = 'command-center') => {
    setIsAuthenticating(true);
    try {
      window.location.hash = target;
      await signInAnonymously();
    } catch (err) {
      console.error('[FinGuard Landing] Demo sign in failed:', err);
      // Fallback: Open auth modal with error displayed
      setIsAuthModalOpen(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col font-sans selection:bg-[var(--primary)] selection:text-white transition-colors duration-200">
      {/* ─── 1. FLOATING NAVBAR ─── */}
      <LandingNavbar
        onOpenAuth={(tab) => handleOpenAuth(tab || 'signin', 'command-center')}
        onEnterDemo={() => handleEnterDemo('command-center')}
        isAuthenticating={isAuthenticating}
      />

      {/* ─── 2. CINEMATIC HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden hero-grid-bg">
        {/* Ambient Top Glow Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#3157D5]/15 via-[#7C5CFC]/10 to-transparent blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-[#22D3EE]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left 6-7 Columns: Hero Narrative & CTAs */}
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left">
              {/* Badge above headline */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border)] dark:border-white/15 bg-[var(--surface-muted)] dark:bg-white/[0.05] shadow-inner backdrop-blur-md mb-6">
                <span className="flex h-2 w-2 rounded-full bg-[#3157D5] dark:bg-[#22D3EE] animate-pulse" />
                <span className="text-[11px] font-mono font-bold tracking-wider text-[var(--text-secondary)] dark:text-slate-300 uppercase">
                  AI-POWERED • REAL-TIME • MULTI-BANK INTELLIGENCE
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] dark:text-white leading-[1.1] mb-6">
                Stop Financial Fraud{' '}
                <span className="bg-gradient-to-r from-[#3157D5] via-[#22D3EE] to-[#7C5CFC] bg-clip-text text-transparent">
                  Before It Happens.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[var(--text-secondary)] dark:text-slate-300 leading-relaxed max-w-2xl mb-8">
                Autonomous fraud intelligence that detects, correlates, investigates,
                and responds to suspicious financial activity in real time.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-5">
                {/* Primary CTA: Enter Demo Environment */}
                <button
                  onClick={() => handleEnterDemo('command-center')}
                  disabled={isAuthenticating}
                  className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#3157D5] via-[#4F46E5] to-[#7C5CFC] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#3157D5]/30 hover:shadow-2xl hover:shadow-[#3157D5]/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>
                    {isAuthenticating ? 'Launching Environment…' : 'Enter Demo Environment'}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                {/* Secondary CTA: Watch Live Simulation */}
                <button
                  onClick={() => handleScrollToSection('simulation-preview')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] dark:border-white/20 bg-[var(--surface)] dark:bg-white/[0.05] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] dark:text-slate-200 hover:bg-[var(--surface-muted)] dark:hover:bg-white/10 hover:border-[var(--border-strong)] dark:hover:border-white/30 backdrop-blur-sm transition-all cursor-pointer shadow-xs"
                >
                  <Play className="h-4 w-4 fill-current text-[#3157D5] dark:text-[#22D3EE]" />
                  <span>Watch Live Simulation</span>
                </button>
              </div>

              {/* Small Trust Disclaimer */}
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] dark:text-slate-400 mb-10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span>Synthetic Data • Hackathon Demonstration • No Real Payments</span>
              </div>

              {/* ─── 4 PERFORMANCE METRICS ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full pt-6 border-t border-[var(--border)] dark:border-white/10">
                <div className="rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0B1730]/60 p-3 shadow-xs">
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-[#6C63D9] dark:text-[#7C5CFC]">
                    11
                  </div>
                  <div className="text-xs font-medium text-[var(--text-primary)] dark:text-slate-300 mt-0.5">AI Agents</div>
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Parallel audit</div>
                </div>

                <div className="rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0B1730]/60 p-3 shadow-xs">
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-[#3157D5] dark:text-[#22D3EE]">
                    7+
                  </div>
                  <div className="text-xs font-medium text-[var(--text-primary)] dark:text-slate-300 mt-0.5">Correlated Signals</div>
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Multi-vector telemetry</div>
                </div>

                <div className="rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0B1730]/60 p-3 shadow-xs">
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-[#D95C62] dark:text-[#FF6577]">
                    100
                  </div>
                  <div className="text-xs font-medium text-[var(--text-primary)] dark:text-slate-300 mt-0.5">Risk Score</div>
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Deterministic scale</div>
                </div>

                <div className="rounded-xl border border-[var(--border)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0B1730]/60 p-3 shadow-xs">
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-[#159A75] dark:text-[#19C37D]">
                    Real-Time
                  </div>
                  <div className="text-xs font-medium text-[var(--text-primary)] dark:text-slate-300 mt-0.5">Investigation</div>
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-slate-400 font-mono">Sub-second triage</div>
                </div>
              </div>
            </div>

            {/* Right 5-6 Columns: Hero 3D / Motion System */}
            <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
              <HeroNetworkVisual />
            </div>
          </div>
        </div>

        {/* Subtle scroll indicator */}
        <div className="flex justify-center mt-12">
          <button
            onClick={() => handleScrollToSection('product')}
            className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Scroll to product features"
          >
            <span className="text-[10px] uppercase font-mono tracking-wider">Explore Capabilities</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ─── 3. PRODUCT CAPABILITIES SECTION ─── */}
      <ProductCapabilities
        onSelectFeature={(route) => handleEnterDemo(route)}
      />

      {/* ─── 4. HOW FIN GUARD OPERATES (PIPELINE) ─── */}
      <HowItWorksPipeline />

      {/* ─── 5. MULTI-BANK FRAUD SIMULATION PREVIEW ─── */}
      <MultiBankSimulationPreview
        onLaunchSimulation={() => handleEnterDemo('simulation')}
      />

      {/* ─── 6. INVESTIGATION COCKPIT PREVIEW ─── */}
      <InvestigationPreview
        onExploreCockpit={() => handleEnterDemo('investigation-workspace')}
      />

      {/* ─── 7. ENTITY GRAPH PREVIEW ─── */}
      <EntityGraphPreview
        onExploreGraph={() => handleEnterDemo('entity-graph')}
      />

      {/* ─── 8. CASE MANAGEMENT PREVIEW ─── */}
      <CaseManagementPreview
        onViewCases={() => handleEnterDemo('cases')}
      />

      {/* ─── 9. TECHNOLOGY SECTION ─── */}
      <TechnologyStack />

      {/* ─── 10. PREMIUM FOOTER ─── */}
      <LandingFooter
        onOpenAuth={() => handleOpenAuth('signin', 'command-center')}
        onEnterDemo={() => handleEnterDemo('command-center')}
        onNavigateSection={handleScrollToSection}
      />

      {/* ─── 11. AUTHENTICATION MODAL ─── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authInitialTab}
        targetTab={targetTab}
      />
    </div>
  );
};
export default LandingPage;
