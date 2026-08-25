import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { BrandLogo } from './BrandLogo';
import { AuthModal } from '../auth/AuthModal';
import { ProfileDrawer } from './ProfileDrawer';
import { 
  Building2, UserCircle2, Sparkles, Cloud, 
  ChevronDown, User, Shield
} from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  openAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = () => {
  const { 
    currentCompany, 
    currentUser, 
    isDemoMode,
  } = useAuth();

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header 
        id="main-compact-header" 
        className="bg-[#03225F] text-white sticky top-0 z-30 shadow-md border-b border-[#054AC6] select-none"
      >
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* Left: Brand Logo & Company Info */}
            <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
              <BrandLogo size="sm" variant="light" />
              
              <div className="border-l border-white/20 pl-2.5 sm:pl-3 flex flex-col justify-center min-w-0">
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[240px] lg:max-w-[320px] leading-tight tracking-tight">
                  {currentCompany.companyName}
                </span>
                <span className="text-[10px] text-[#7FA0D4] font-medium hidden xs:block truncate">
                  Financial Sentinel & Project Trace
                </span>
              </div>
            </div>

            {/* Right: Mode Badge & Quick User Profile Trigger */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Mode Indicator Badge */}
              <div 
                onClick={() => setIsProfileDrawerOpen(true)}
                className="cursor-pointer"
                title="Tap to switch mode or reset demo"
              >
                {isDemoMode ? (
                  <span className="text-[10px] sm:text-xs bg-[#7FA0D4]/20 text-[#7FA0D4] font-bold px-2 py-1 rounded-full border border-[#7FA0D4]/30 flex items-center gap-1 hover:bg-[#7FA0D4]/30 transition-colors">
                    <Sparkles className="w-3 h-3 text-[#7FA0D4]" />
                    <span className="hidden sm:inline">Demo Mode</span>
                    <span className="sm:hidden">Demo</span>
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/30 transition-colors">
                    <Cloud className="w-3 h-3" />
                    <span className="hidden sm:inline">Live Workspace</span>
                    <span className="sm:hidden">Live</span>
                  </span>
                )}
              </div>

              {/* User Avatar & Role Button (Opens Quick Profile Drawer) */}
              <button
                id="header-user-profile-btn"
                onClick={() => setIsProfileDrawerOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 bg-[#021845] hover:bg-blue-950/80 px-2 sm:px-3 py-1.5 rounded-xl border border-[#054AC6]/50 shadow-2xs transition-all cursor-pointer group active:scale-95"
                title="Open user profile & role switcher"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#054AC6] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-inner group-hover:bg-blue-500 transition-colors">
                  {currentUser.name.charAt(0)}
                </div>

                <div className="flex items-center gap-1 text-left">
                  <span className="text-xs font-bold text-white truncate max-w-[70px] sm:max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] bg-white/10 text-[#7FA0D4] px-1 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline">
                    {currentUser.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7FA0D4] shrink-0" />
                </div>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Quick Profile & Workspace Drawer */}
      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        onOpenSignIn={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal for cloud login */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
