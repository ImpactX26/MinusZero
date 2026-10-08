import React from 'react';
import { DeviceProvider } from './context/DeviceContext';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { Shield, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, signInAnonymously } = useAuth();

  // Seamless authentication entry for direct device and SOC routes
  React.useEffect(() => {
    const rawHash = window.location.hash.toLowerCase();
    if (!loading && !user && (rawHash.includes('device') || rawHash.includes('soc'))) {
      signInAnonymously().catch((err) => {
        console.warn('[FinGuard App] Auto anonymous auth error:', err);
      });
    }
  }, [loading, user, signInAnonymously]);

  // Loading state while Firebase auth initializes
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-root)] text-[var(--text-primary)] relative overflow-hidden transition-colors">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md">
            <Shield className="h-7 w-7 animate-pulse" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">
              FinGuard <span className="text-[var(--accent)]">AI</span>
            </div>
            <div className="terminal-text text-[var(--text-muted)] text-xs">Fraud Intelligence Platform</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
            <span>Verifying investigator session…</span>
          </div>
        </div>
      </div>
    );
  }

  // Gate: Unauthenticated users are shown LandingPage unless accessing #/device mobile banking route
  const isDeviceRoute = window.location.hash.toLowerCase().includes('device');
  return (!user && !isDeviceRoute) ? <LandingPage /> : <AppShell />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DeviceProvider>
        <AppContent />
      </DeviceProvider>
    </ThemeProvider>
  );
};

export default App;
