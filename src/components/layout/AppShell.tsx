import React, { useState, useEffect } from 'react';
import { Topbar } from './Topbar';
import { Navigation, NavigationTab } from './Navigation';
import { Footer } from '../Footer';

// Pages
import { CommandCenter } from '../../pages/CommandCenter';
import { LiveEvents } from '../../pages/LiveEvents';
import { Investigations } from '../../pages/Investigations';
import { Cases } from '../../pages/Cases';
import { Customers } from '../../pages/Customers';
import { EntityGraph } from '../../pages/EntityGraph';
import { Analytics } from '../../pages/Analytics';
import { Settings } from '../../pages/Settings';
import { InvestigationWorkspace } from '../../pages/InvestigationWorkspace';
import { MultiBankSimulation } from '../../pages/MultiBankSimulation';
import { DeviceFoundationView } from '../../pages/DeviceFoundationView';
import { ProductTour } from '../../pages/ProductTour';

function parseHashTab(rawHash: string): NavigationTab {
  const cleaned = rawHash.replace(/^#\/?/, '').split('?')[0].toLowerCase() as NavigationTab;
  if (cleaned === 'tour' as any) return 'product-tour';
  const validTabs: NavigationTab[] = [
    'command-center',
    'live-events',
    'simulation',
    'investigations',
    'cases',
    'customers',
    'entity-graph',
    'analytics',
    'settings',
    'investigation-workspace',
    'device',
    'soc',
    'product-tour',
  ];
  return validTabs.includes(cleaned) ? cleaned : 'command-center';
}

export const AppShell: React.FC = () => {
  // Sync tab with URL hash if available (normalizing #/device and #/soc)
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    return parseHashTab(window.location.hash);
  });

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(parseHashTab(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'command-center':
      case 'soc':
        return <CommandCenter />;
      case 'device':
        return <DeviceFoundationView />;
      case 'live-events':
        return <LiveEvents />;
      case 'simulation':
        return <MultiBankSimulation />;
      case 'investigations':
        return <Investigations />;
      case 'cases':
        return <Cases />;
      case 'customers':
        return <Customers />;
      case 'entity-graph':
        return <EntityGraph />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'investigation-workspace':
        return <InvestigationWorkspace />;
      case 'product-tour':
        return <ProductTour onNavigateTab={handleSelectTab} />;
      default:
        return <CommandCenter />;
    }
  };

  const isDeviceMode = activeTab === 'device';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
      {!isDeviceMode && <Topbar />}

      {/* Sub-header navigation strip */}
      {!isDeviceMode && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6 py-1.5 shadow-xs">
          <div className="mx-auto max-w-7xl">
            <Navigation activeTab={activeTab} onSelectTab={handleSelectTab} />
          </div>
        </div>
      )}

      {/* Main page content area */}
      <main className={`flex-1 mx-auto w-full ${isDeviceMode ? 'max-w-md p-3 sm:py-6' : 'max-w-7xl px-4 sm:px-6 py-6 sm:py-8'}`}>
        {renderActivePage()}
      </main>

      {!isDeviceMode && <Footer />}
    </div>
  );
};
