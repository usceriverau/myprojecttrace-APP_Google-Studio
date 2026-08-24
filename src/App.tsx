import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { Header } from './components/common/Header';
import { BrandLogo, BrandMarkIcon } from './components/common/BrandLogo';
import { ProjectList } from './components/projects/ProjectList';
import { ArchitectureViewer } from './components/architecture/ArchitectureViewer';
import { AuthPage } from './components/auth/AuthPage';
import { WorkspaceSetupPage } from './components/auth/WorkspaceSetupPage';
import { Sparkles, Shield, AlertTriangle, RefreshCw } from 'lucide-react';

function AppContent() {
  const { authState, isDemoMode, exitDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'architecture'>('projects');
  const { alerts, resetToDemoData } = useProjects();

  const openAlertsCount = alerts.filter(a => a.status === 'OPEN').length;

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

  // 4. Authenticated or Demo Mode -> Full App Layout
  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col font-sans">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-[#021845] text-white border-b border-[#054AC6]/50 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 max-w-2xl">
            <span className="bg-[#054AC6] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#7FA0D4]" />
              Interactive Demo
            </span>
            <span className="text-slate-300 text-[11px] sm:text-xs">
              Viewing simulated multi-trade contractor data. Data changes remain local to your session.
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDemoData}
              className="text-[11px] text-[#7FA0D4] hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo
            </button>
            <button
              onClick={exitDemoMode}
              className="text-[11px] font-bold text-white bg-[#054AC6] hover:bg-blue-600 px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Sign In to Cloud
            </button>
          </div>
        </div>
      )}

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAlertsCount={openAlertsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'projects' ? (
          <ProjectList />
        ) : (
          <ArchitectureViewer />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" variant="original" />
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-500 text-[11px]">
              Project Financial Capture & Early Warning System
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">© 2026</span>
            <a
              href="https://myprojecttrace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0055D4] hover:underline font-semibold"
            >
              myprojecttrace.com
            </a>
          </div>
        </div>
      </footer>
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
