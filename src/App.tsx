import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { Header } from './components/common/Header';
import { BottomNav, MainNavTab } from './components/common/BottomNav';
import { FloatingSpeedDial } from './components/common/FloatingSpeedDial';
import { BrandLogo, BrandMarkIcon } from './components/common/BrandLogo';
import { ProjectList } from './components/projects/ProjectList';
import { ArchitectureViewer } from './components/architecture/ArchitectureViewer';
import { FinancialsReportsView } from './components/reports/FinancialsReportsView';
import { LukyDrawer } from './components/luky/LukyDrawer';
import { AuthPage } from './components/auth/AuthPage';
import { WorkspaceSetupPage } from './components/auth/WorkspaceSetupPage';
import { CapturePurchaseModal } from './components/purchases/CapturePurchaseModal';
import { CapturePaymentModal } from './components/projects/CapturePaymentModal';
import { CaptureProgressMediaModal } from './components/projects/CaptureProgressMediaModal';
import { AIReceiptReviewModal } from './components/purchases/AIReceiptReviewModal';
import { Purchase } from './types';
import { Sparkles, RefreshCw } from 'lucide-react';

function AppContent() {
  const { authState, isDemoMode, exitDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<MainNavTab>('projects');
  const [isLukyOpen, setIsLukyOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCapturePaymentModalOpen, setIsCapturePaymentModalOpen] = useState(false);
  const [isProgressMediaModalOpen, setIsProgressMediaModalOpen] = useState(false);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);

  const { alerts, resetToDemoData, setSelectedProjectId } = useProjects();
  const openAlertsCount = alerts.filter(a => a.status === 'OPEN').length;

  const handleSelectTab = (tab: MainNavTab) => {
    if (tab === 'luky') {
      setIsLukyOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // 1. Loading state
  if (authState === 'LOADING_AUTH') {
    return (
      <div className="min-h-screen bg-[#03225F] flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <BrandMarkIcon sizeClass="w-16 h-16" className="animate-pulse" />
          <div className="font-bold text-2xl tracking-tight">
            <span>My</span>
            <span className="text-[#38BDF8]">Project</span>
            <span>Trace</span>
          </div>
          <p className="text-xs text-[#7FA0D4] font-medium">
            Initializing secure multi-tenant workspace...
          </p>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#054AC6] rounded-full animate-indeterminate"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State -> Dedicated Auth & Login Gate
  if (authState === 'UNAUTHENTICATED') {
    return <AuthPage />;
  }

  // 3. User authenticated with Firebase, but needs to complete workspace profile
  if (authState === 'NEEDS_ONBOARDING') {
    return <WorkspaceSetupPage />;
  }

  // 4. Authenticated or Demo Mode -> Full Mobile-First Responsive App Layout
  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-[#03225F]">
      
      {/* Top Compact Sticky App Bar */}
      <Header />

      {/* Main Responsive Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-28">
        {activeTab === 'projects' && <ProjectList />}
        {activeTab === 'architecture' && <ArchitectureViewer />}
        {activeTab === 'financials' && (
          <FinancialsReportsView
            onCaptureReceipt={() => setIsCaptureModalOpen(true)}
            onCapturePayment={() => setIsCapturePaymentModalOpen(true)}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setActiveTab('projects');
            }}
          />
        )}
      </main>

      {/* Floating Action Button (Speed Dial) for instant field capture */}
      <FloatingSpeedDial
        onCaptureReceipt={() => setIsCaptureModalOpen(true)}
        onCapturePayment={() => setIsCapturePaymentModalOpen(true)}
        onCaptureProgressMedia={() => setIsProgressMediaModalOpen(true)}
      />

      {/* Persistent Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        unreadAlertsCount={openAlertsCount}
      />

      {/* Luky AI Drawer */}
      <LukyDrawer
        isOpen={isLukyOpen}
        onClose={() => setIsLukyOpen(false)}
      />

      {/* Global Quick Add Receipt Modal */}
      {isCaptureModalOpen && (
        <CapturePurchaseModal
          isOpen={isCaptureModalOpen}
          onClose={() => setIsCaptureModalOpen(false)}
          defaultProjectId={null}
          onOpenReview={(p) => {
            setIsCaptureModalOpen(false);
            setReviewPurchase(p);
          }}
        />
      )}

      {/* Global Quick Capture Payment Modal */}
      {isCapturePaymentModalOpen && (
        <CapturePaymentModal
          isOpen={isCapturePaymentModalOpen}
          onClose={() => setIsCapturePaymentModalOpen(false)}
          defaultProjectId={null}
        />
      )}

      {/* Global Jobsite Progress Media Modal */}
      {isProgressMediaModalOpen && (
        <CaptureProgressMediaModal
          isOpen={isProgressMediaModalOpen}
          onClose={() => setIsProgressMediaModalOpen(false)}
          defaultProjectId={null}
        />
      )}

      {/* Global AI Receipt Review Modal after OCR */}
      {reviewPurchase && (
        <AIReceiptReviewModal
          isOpen={Boolean(reviewPurchase)}
          purchase={reviewPurchase}
          initialProjectId={reviewPurchase.projectId || null}
          onClose={() => setReviewPurchase(null)}
          onSuccessCaptureAnother={() => {
            setReviewPurchase(null);
            setIsCaptureModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}
