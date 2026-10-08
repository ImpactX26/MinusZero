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

export const AppShell: React.FC = () => {
  // Sync tab with URL hash if available
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const hash = window.location.hash.replace('#', '') as NavigationTab;
    const validTabs: NavigationTab[] = [
      'command-center',
      'live-events',
      'investigations',
      'cases',
      'customers',
      'entity-graph',
      'analytics',
      'settings',
    ];
    return validTabs.includes(hash) ? hash : 'command-center';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavigationTab;
      const validTabs: NavigationTab[] = [
        'command-center',
        'live-events',
        'investigations',
        'cases',
        'customers',
        'entity-graph',
        'analytics',
        'settings',
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
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
        return <CommandCenter />;
      case 'live-events':
        return <LiveEvents />;
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
      default:
        return <CommandCenter />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
      <Topbar />

      {/* Sub-header navigation strip */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6 py-1.5 shadow-xs">
        <div className="mx-auto max-w-7xl">
          <Navigation activeTab={activeTab} onSelectTab={handleSelectTab} />
        </div>
      </div>

      {/* Main page content area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {renderActivePage()}
      </main>

      <Footer />
    </div>
  );
};
