import React from 'react';
import { DeviceProvider } from './context/DeviceContext';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { Shield, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, signInAnonymously } = useAuth();

  // Seamless authentication entry for direct device, SOC, and tour routes
  React.useEffect(() => {
    const rawHash = window.location.hash.toLowerCase();
    if (!loading && !user && (rawHash.includes('device') || rawHash.includes('soc') || rawHash.includes('tour') || rawHash.includes('product-tour'))) {
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

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FinGuard ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#0B0F19] text-white">
          <div className="max-w-md w-full bg-[#131B2E] border border-red-500/30 rounded-2xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">FinGuard AI — Runtime Recovery</h2>
            <p className="text-xs text-gray-400 mb-4 break-words font-mono bg-black/40 p-3 rounded-lg text-left">
              {this.state.error?.message || 'An unexpected error occurred during rendering.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DeviceProvider>
          <AppContent />
        </DeviceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
