import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { BrandLogo, BrandMarkIcon } from './BrandLogo';
import { 
  X, User, Shield, Building2, Sparkles, Cloud, LogIn, LogOut, 
  RefreshCw, Check, CheckCircle2, ChevronRight, Laptop, Smartphone
} from 'lucide-react';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSignIn,
}) => {
  const {
    currentCompany,
    currentUser,
    allUsers,
    switchDemoUser,
    isDemoMode,
    logOut,
    isOwnerOrAdmin,
  } = useAuth();

  const { resetToDemoData, projects } = useProjects();

  if (!isOpen) return null;

  return (
    <div 
      id="profile-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="profile-drawer-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200"
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#03225F] text-white flex items-center justify-center font-black text-base shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {currentUser.name}
                </h2>
                <span className="text-[10px] font-extrabold bg-blue-100 text-[#054AC6] px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">
                {currentUser.email}
              </p>
            </div>
          </div>

          <button
            id="close-profile-drawer-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Company & Environment Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Workspace & Company
              </span>
              {isDemoMode ? (
                <span className="text-[10px] bg-blue-100 text-[#054AC6] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  Interactive Demo
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <Cloud className="w-2.5 h-2.5" />
                  Cloud Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#054AC6] flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {currentCompany.companyName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {projects.length} Active Contractor Projects
                </p>
              </div>
            </div>
          </div>

          {/* Quick User Role Switcher (Especially helpful in Demo Mode) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Switch Team Profile
              </label>
              <span className="text-[11px] text-slate-400">
                Role Testing
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {allUsers.map((user) => {
                const isSelected = user.userId === currentUser.userId;
                return (
                  <button
                    key={user.userId}
                    onClick={() => {
                      switchDemoUser(user.userId);
                      onClose();
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#054AC6] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-[#054AC6] text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? 'text-[#03225F]' : 'text-slate-800'}`}>
                          {user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {user.role} • {user.email}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#054AC6] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Demo Reset & Data Tools */}
          {isDemoMode && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  resetToDemoData();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Reset Demo Data (Initial 5 Projects)
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          {isDemoMode ? (
            <button
              id="drawer-signin-cloud-btn"
              onClick={() => {
                onClose();
                onOpenSignIn();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#054AC6] hover:bg-[#03225F] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              Sign In to Cloud Workspace
            </button>
          ) : (
            <button
              id="drawer-logout-btn"
              onClick={() => {
                logOut();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
