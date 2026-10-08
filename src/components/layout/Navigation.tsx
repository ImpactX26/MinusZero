import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Search,
  FolderKanban,
  Users,
  Network,
  BarChart3,
  Settings,
} from 'lucide-react';

export type NavigationTab =
  | 'command-center'
  | 'live-events'
  | 'investigations'
  | 'cases'
  | 'customers'
  | 'entity-graph'
  | 'analytics'
  | 'settings'
  | 'investigation-workspace';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const navItems: NavItem[] = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
  { id: 'live-events', label: 'Live Events', icon: Activity },
  { id: 'investigations', label: 'Investigations', icon: Search, badge: 'V3' },
  { id: 'cases', label: 'Cases', icon: FolderKanban },
  { id: 'customers', label: 'Customer Intelligence', icon: Users },
  { id: 'entity-graph', label: 'Entity Graph', icon: Network },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold border border-[var(--accent)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] border border-transparent'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--accent)] text-white">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
