import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Zap,
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
  | 'simulation'
  | 'investigations'
  | 'cases'
  | 'customers'
  | 'entity-graph'
  | 'analytics'
  | 'settings'
  | 'investigation-workspace'
  | 'device'
  | 'soc';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
}

export const navItems: NavItem[] = [
  { id: 'command-center', label: 'SOC Command Center', icon: LayoutDashboard },
  { id: 'live-events', label: 'Live Events', icon: Activity },
  { id: 'simulation', label: 'Simulation', icon: Zap },
  { id: 'investigations', label: 'Investigations', icon: Search },
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
        const isActive =
          activeTab === item.id ||
          (item.id === 'command-center' && activeTab === 'soc') ||
          (item.id === 'investigations' && activeTab === 'investigation-workspace');
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#EEF2FF] dark:bg-[#5B6FEA]/15 text-[#3157D5] dark:text-[#7485F2] font-semibold border border-[#3157D5]/20'
                : 'text-[#64748B] dark:text-[#8496B3] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-[#F8FAFC] dark:hover:bg-[#182238] border border-transparent'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#3157D5] dark:text-[#7485F2]' : 'text-[#94A3B8]'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
