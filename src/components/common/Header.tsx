import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { BrandLogo } from './BrandLogo';
import { AuthModal } from '../auth/AuthModal';
import { CapturePurchaseModal } from '../purchases/CapturePurchaseModal';
import { DraftPurchasesModal } from '../purchases/DraftPurchasesModal';
import { AIReceiptReviewModal } from '../purchases/AIReceiptReviewModal';
import { Purchase } from '../../types';
import { 
  Building2, UserCircle2, FileCode2, LayoutGrid, 
  Sparkles, LogIn, LogOut, Cloud, Shield, ChevronDown,
  Camera, Receipt, Plus, Bot, Video
} from 'lucide-react';
import { LukyDrawer } from '../luky/LukyDrawer';
import { CaptureProgressMediaModal } from '../projects/CaptureProgressMediaModal';

interface HeaderProps {
  activeTab: 'projects' | 'architecture';
  setActiveTab: (tab: 'projects' | 'architecture') => void;
  openAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openAlertsCount,
}) => {
  const { 
    currentCompany, 
    currentUser, 
    allUsers, 
    switchDemoUser, 
    isDemoMode, 
    firebaseAuthUser,
    logOut, 
    enterDemoMode,
    isOwnerOrAdmin
  } = useAuth();

  const { draftPurchases } = useProjects();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isLukyOpen, setIsLukyOpen] = useState(false);
  const [isProgressMediaModalOpen, setIsProgressMediaModalOpen] = useState(false);
  const [selectedDraftPurchaseId, setSelectedDraftPurchaseId] = useState<string | null>(null);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);

  const needsReviewDraftsCount = draftPurchases.filter(d => d.captureStatus === 'NEEDS_REVIEW').length;

  return (
    <header className="bg-[#03225F] text-white sticky top-0 z-30 shadow-md border-b border-[#054AC6]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Company Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
            <div className="sm:hidden">
              <BrandLogo size="sm" variant="light" />
            </div>
            <div className="hidden sm:block">
              <BrandLogo size="md" variant="light" />
            </div>

            <div className="hidden md:block border-l border-slate-700 pl-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white truncate max-w-[160px] lg:max-w-[200px]">
                  {currentCompany.companyName}
                </span>
                {isDemoMode ? (
                  <span className="text-[10px] bg-[#7FA0D4]/20 text-[#7FA0D4] font-semibold px-2 py-0.5 rounded-full border border-[#7FA0D4]/30 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />
                    Demo Mode
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <Cloud className="w-2.5 h-2.5" />
                    Cloud Live
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Center / Action Buttons (Hidden on screens < lg) */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            {/* Quick Capture Button */}
            <button
              id="header-capture-receipt-btn"
              onClick={() => {
                setSelectedDraftPurchaseId(null);
                setIsCaptureModalOpen(true);
              }}
              className="text-xs bg-[#054AC6] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#7FA0D4]" />
              <span>Capture Receipt</span>
            </button>

            {/* Progress Media (Photo / Video) Button */}
            <button
              id="header-capture-progress-btn"
              onClick={() => setIsProgressMediaModalOpen(true)}
              className="text-xs bg-[#054AC6] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Capture Progress Photos & Videos"
            >
              <Video className="w-3.5 h-3.5 text-emerald-300" />
              <span>Progress Media</span>
            </button>

            {/* Drafts in Review Badge Button if any */}
            {draftPurchases.length > 0 && (
              <button
                id="header-draft-receipts-btn"
                onClick={() => setIsDraftsModalOpen(true)}
                className="text-xs bg-[#021845] hover:bg-blue-950/80 text-white font-semibold px-2.5 py-1.5 rounded-xl border border-[#054AC6]/50 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`${draftPurchases.length} receipt draft(s)`}
              >
                <Receipt className="w-3.5 h-3.5 text-[#7FA0D4]" />
                <span>Drafts</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                  {draftPurchases.length}
                </span>
              </button>
            )}
          </div>

          {/* Navigation and User Role Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* View Switcher Tabs */}
            <div className="flex bg-[#021845] p-0.5 sm:p-1 rounded-xl border border-[#054AC6]/40 text-xs">
              <button
                id="tab-projects"
                onClick={() => setActiveTab('projects')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-[#054AC6] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Projects & Financials</span>
                <span className="sm:hidden text-[11px]">Projects</span>
              </button>

              <button
                id="tab-architecture"
                onClick={() => setActiveTab('architecture')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'architecture'
                    ? 'bg-[#054AC6] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Architecture & Specs</span>
                <span className="sm:hidden text-[11px]">Specs</span>
              </button>
            </div>

            {/* Auth / User Control */}
            {isDemoMode ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Demo User Switcher */}
                <div className="flex items-center bg-[#021845] px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-[#054AC6]/40 max-w-[110px] sm:max-w-none">
                  <UserCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7FA0D4] mr-1 shrink-0" />
                  <select
                    id="demo-user-role-select"
                    aria-label="Demo active user role switcher"
                    value={currentUser.userId}
                    onChange={(e) => switchDemoUser(e.target.value)}
                    className="bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer truncate pr-0.5"
                  >
                    {allUsers.map((u) => (
                      <option key={u.userId} value={u.userId} className="bg-[#03225F] text-white">
                        {u.name.split(' ')[0]} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  id="header-signin-btn"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-[#054AC6] hover:bg-blue-600 text-white text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="bg-[#021845] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-[#054AC6]/40 flex items-center gap-1.5">
                  <UserCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold text-white truncate max-w-[80px] sm:max-w-none">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="hidden sm:inline text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                    {currentUser.role}
                  </span>
                </div>

                <button
                  id="header-logout-btn"
                  onClick={logOut}
                  title="Sign out of workspace"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Sub-Bar (Visible on mobile and tablet < lg) */}
        <div className="lg:hidden py-2 border-t border-[#054AC6]/35 flex items-center justify-between gap-2">
          {/* Quick Capture Receipt Button Mobile */}
          <button
            onClick={() => {
              setSelectedDraftPurchaseId(null);
              setIsCaptureModalOpen(true);
            }}
            className="flex-1 min-w-0 py-1.5 px-3 bg-[#054AC6] hover:bg-blue-600 text-white font-bold rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Capture Receipt"
          >
            <Camera className="w-3.5 h-3.5 text-[#7FA0D4] shrink-0" />
            <span className="text-xs font-bold truncate">Capture Receipt</span>
          </button>

          {/* Progress Media (Photo / Video) Button Mobile */}
          <button
            onClick={() => setIsProgressMediaModalOpen(true)}
            className="flex-1 min-w-0 py-1.5 px-3 bg-[#054AC6] hover:bg-blue-600 text-white font-bold rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Capture Progress Media (Photo & Video)"
          >
            <Video className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-xs font-bold truncate">Progress Media</span>
          </button>

          {/* Drafts in Review Badge Button Mobile */}
          {draftPurchases.length > 0 && (
            <button
              onClick={() => setIsDraftsModalOpen(true)}
              className="py-1.5 px-2.5 bg-[#021845] hover:bg-blue-950/80 text-white font-semibold rounded-xl border border-[#054AC6]/50 shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={`${draftPurchases.length} receipt draft(s)`}
            >
              <Receipt className="w-3.5 h-3.5 text-[#7FA0D4] shrink-0" />
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                {draftPurchases.length}
              </span>
            </button>
          )}
        </div>

      </div>

      {/* Floating Ask Luky AI Assistant Button (Bottom Right) */}
      <button
        id="floating-ask-luky-btn"
        onClick={() => setIsLukyOpen(true)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-3 sm:px-5 sm:py-3.5 rounded-full border border-blue-300/40 shadow-xl flex items-center gap-2.5 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
        title="Open Luky Financial & Project Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-300" />
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping absolute -top-1 -right-1" />
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute -top-1 -right-1" />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight">Ask Luky</span>
      </button>

      {/* Capture Purchase Modal */}
      <CapturePurchaseModal
        isOpen={isCaptureModalOpen}
        onClose={() => {
          setIsCaptureModalOpen(false);
          setSelectedDraftPurchaseId(null);
        }}
        existingPurchaseId={selectedDraftPurchaseId}
        onOpenReview={(p) => {
          setReviewPurchase(p);
        }}
      />

      {/* Drafts List Modal */}
      <DraftPurchasesModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        onOpenCapture={(purchaseId) => {
          setSelectedDraftPurchaseId(purchaseId || null);
          setIsCaptureModalOpen(true);
        }}
        onOpenReview={(p) => {
          setReviewPurchase(p);
        }}
      />

      {/* Phase 3 AI Receipt Review & Confirmation Modal */}
      <AIReceiptReviewModal
        isOpen={Boolean(reviewPurchase)}
        purchase={reviewPurchase}
        onClose={() => setReviewPurchase(null)}
        onSuccessCaptureAnother={() => {
          setReviewPurchase(null);
          setSelectedDraftPurchaseId(null);
          setIsCaptureModalOpen(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Progress Media (Photo & Video) Capture Modal */}
      <CaptureProgressMediaModal
        isOpen={isProgressMediaModalOpen}
        onClose={() => setIsProgressMediaModalOpen(false)}
      />

      {/* Luky AI Assistant Drawer */}
      <LukyDrawer
        isOpen={isLukyOpen}
        onClose={() => setIsLukyOpen(false)}
      />
    </header>
  );
};
