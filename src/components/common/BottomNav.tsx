import React from 'react';
import { 
  FolderKanban, 
  Compass, 
  BarChart3, 
  Bot, 
  Sparkles,
  Layers
} from 'lucide-react';

export type MainNavTab = 'projects' | 'architecture' | 'financials' | 'luky';

interface BottomNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  unreadAlertsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadAlertsCount = 0,
}) => {
  const navItems: {
    id: MainNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }[] = [
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
    },
    {
      id: 'architecture',
      label: 'Specs & Arch',
      icon: Compass,
    },
    {
      id: 'financials',
      label: 'Financials',
      icon: BarChart3,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
    },
    {
      id: 'luky',
      label: 'Ask Luky',
      icon: Bot,
    },
  ];

  return (
    <nav
      id="persistent-bottom-nav"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg safe-area-bottom select-none"
    >
      <div className="max-w-md sm:max-w-xl md:max-w-3xl mx-auto px-3 sm:px-6">
        <div className="grid grid-cols-4 items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}`}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`group flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-all cursor-pointer relative ${
                  isActive ? 'text-[#054AC6]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute top-0 inset-x-4 h-0.5 bg-[#054AC6] rounded-full shadow-xs" />
                )}

                <div className="relative">
                  <div
                    className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-blue-50 text-[#054AC6] scale-105'
                        : 'group-hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  </div>

                  {/* Badge */}
                  {Boolean(item.badge) && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-4.5 bg-rose-500 text-white text-xs font-black rounded-full px-1 flex items-center justify-center shadow-xs animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {item.id === 'luky' && !isActive && (
                    <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </div>

                <span
                  className={`text-xs font-extrabold tracking-tight mt-0.5 whitespace-nowrap ${
                    isActive ? 'text-[#054AC6]' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
