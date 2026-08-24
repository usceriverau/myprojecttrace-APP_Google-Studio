import React, { useState, useMemo } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetailView } from './ProjectDetailView';
import { AuthModal } from '../auth/AuthModal';
import { CapturePurchaseModal } from '../purchases/CapturePurchaseModal';
import { AIReceiptReviewModal } from '../purchases/AIReceiptReviewModal';
import { CaptureProgressMediaModal } from './CaptureProgressMediaModal';
import { Purchase } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { 
  Plus, Search, Building, Camera, Video, Image, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, Cloud, Lock,
  FileSpreadsheet, Loader2, Wallet, Receipt, TrendingUp, DollarSign,
  CheckCircle2, Smile, Meh, Frown, Activity, Gauge, BarChart3, PieChart,
  ShieldCheck, AlertTriangle, AlertCircle, Zap, LayoutDashboard
} from 'lucide-react';

export const ProjectList: React.FC = () => {
  const {
    projects,
    allProjectMetrics,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    getProjectPurchases,
    getProjectPayments,
    getProjectAlerts,
    resetToDemoData,
    exportCompanyCpaExcel,
  } = useProjects();

  const { isDemoMode, isOwnerOrAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportingCpaExcel, setIsExportingCpaExcel] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isProgressMediaModalOpen, setIsProgressMediaModalOpen] = useState(false);
  const [showFinancialDashboard, setShowFinancialDashboard] = useState(false);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);

  const handleExportCpa = () => {
    try {
      setIsExportingCpaExcel(true);
      exportCompanyCpaExcel();
    } catch (err) {
      console.error('Error generating Accountant Excel report:', err);
      alert('Could not generate the Accountant Excel Export. Please try again.');
    } finally {
      setIsExportingCpaExcel(false);
    }
  };

  // Filtered & Risk-Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch =
          p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.projectAddress.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

        const metrics = allProjectMetrics[p.projectId];
        let matchesRisk = true;
        if (riskFilter === 'CRITICAL') {
          matchesRisk = metrics?.highestAlertSeverity === 'CRITICAL';
        } else if (riskFilter === 'WARNING') {
          matchesRisk = metrics?.highestAlertSeverity === 'WARNING' || metrics?.highestAlertSeverity === 'CRITICAL';
        } else if (riskFilter === 'HEALTHY') {
          matchesRisk = !metrics?.highestAlertSeverity;
        }

        return matchesSearch && matchesStatus && matchesRisk;
      })
      .sort((a, b) => {
        // Sort highest risk first
        const metricsA = allProjectMetrics[a.projectId];
        const metricsB = allProjectMetrics[b.projectId];
        const severityRank = { CRITICAL: 3, WARNING: 2, INFO: 1, null: 0, undefined: 0 };
        const rankA = severityRank[metricsA?.highestAlertSeverity || 'null'] || 0;
        const rankB = severityRank[metricsB?.highestAlertSeverity || 'null'] || 0;
        if (rankB !== rankA) return rankB - rankA;
        return (metricsA?.cashPosition || 0) - (metricsB?.cashPosition || 0);
      });
  }, [projects, searchQuery, statusFilter, riskFilter, allProjectMetrics]);

  // Overall Company Financial Summary
  const companySummary = useMemo(() => {
    let totalContractVal = 0;
    let totalCollectedVal = 0;
    let totalPurchasesVal = 0;
    let totalArVal = 0;
    let criticalAlertsCount = 0;

    Object.values(allProjectMetrics).forEach((m) => {
      totalContractVal += m.totalContractValue;
      totalCollectedVal += m.totalCollected;
      totalPurchasesVal += m.totalPurchases;
      totalArVal += m.accountsReceivable;
      if (m.highestAlertSeverity === 'CRITICAL') criticalAlertsCount++;
    });

    const netCashPosition = totalCollectedVal - totalPurchasesVal;

    return {
      totalContractVal,
      totalCollectedVal,
      totalPurchasesVal,
      totalArVal,
      netCashPosition,
      criticalAlertsCount,
      activeCount: projects.filter((p) => p.status === 'ACTIVE').length,
    };
  }, [allProjectMetrics, projects]);

  if (selectedProject) {
    const metrics = allProjectMetrics[selectedProject.projectId];
    return (
      <ProjectDetailView
        project={selectedProject}
        metrics={metrics}
        purchases={getProjectPurchases(selectedProject.projectId)}
        payments={getProjectPayments(selectedProject.projectId)}
        alerts={getProjectAlerts(selectedProject.projectId)}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Notification Bar */}
      {isDemoMode && (
        <div className="bg-[#03225F]/5 border border-[#054AC6]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#054AC6] text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#03225F] block">
                Interactive Demo Mode Active
              </span>
              <span className="text-slate-600 text-[11px]">
                Showing 5 realistic trade scenarios (kitchen, bath, deck, HVAC, painting) with live early-warning risk calculations.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={resetToDemoData}
              title="Reset the 5 demo projects to initial seed values"
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 text-[11px] transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              Reset Demo
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#054AC6] hover:bg-[#03225F] text-white font-bold flex items-center gap-1.5 text-[11px] shadow-xs transition-colors"
            >
              <Cloud className="w-3.5 h-3.5" />
              Connect Live Workspace
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Hub: 2 Big Prominent Fast Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Big Button 1: Capture Receipt / Fast Expense Logging */}
        <button
          id="hero-capture-receipt-btn"
          type="button"
          onClick={() => setIsCaptureModalOpen(true)}
          className="group relative overflow-hidden bg-gradient-to-br from-[#0B3B95] via-[#1554C8] to-[#1D60DC] text-white p-5 sm:p-6 rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-left border border-blue-400/30 cursor-pointer"
        >
          {/* Decorative background glow */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full backdrop-blur-xs">
              <Zap className="w-3 h-3 text-emerald-300 animate-bounce" /> Fast Camera & AI
            </span>
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/25 transition-all shadow-inner">
              <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300" />
            </div>

            <div className="flex-1 min-w-0 pr-12">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-emerald-200 transition-colors">
                  Capture Receipt
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-blue-50/90 font-normal mt-1 leading-snug">
                Scan receipts & invoices with camera. Instant AI parsing of vendor, total, and line-item breakdowns.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-300">
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md">
                  <Receipt className="w-3 h-3" /> Fast Expense Logging →
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Big Button 2: Upload Photos / Videos of Jobsite Progress */}
        <button
          id="hero-capture-progress-media-btn"
          type="button"
          onClick={() => setIsProgressMediaModalOpen(true)}
          className="group relative overflow-hidden bg-gradient-to-br from-[#1A3660] via-[#244578] to-[#1E3252] text-white p-5 sm:p-6 rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-left border border-blue-300/25 cursor-pointer"
        >
          {/* Decorative background glow */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-400/25 text-blue-200 border border-blue-300/30 px-2.5 py-1 rounded-full backdrop-blur-xs">
              <Video className="w-3 h-3 text-blue-200" /> Photo & Video
            </span>
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/25 transition-all shadow-inner">
              <div className="relative">
                <Video className="w-7 h-7 sm:w-8 sm:h-8 text-blue-200" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-12">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-blue-100 transition-colors">
                  Jobsite Progress
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-blue-50/90 font-normal mt-1 leading-snug">
                Record walkthrough videos or snap jobsite photos with phase tags (Before, In Progress, After, Inspection).
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-blue-200">
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md">
                  <Image className="w-3 h-3" /> Upload Progress & Media →
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Top Utility Bar & Financial Slide Dashboard Toggle Option */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-[23px] leading-[29px]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Button to Toggle Financial Slide Dashboard */}
          <button
            id="toggle-financial-slide-dashboard-btn"
            type="button"
            onClick={() => setShowFinancialDashboard(!showFinancialDashboard)}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border ${
              showFinancialDashboard 
                ? 'bg-[#054AC6] text-white border-[#054AC6] shadow-sm' 
                : 'bg-blue-50/70 hover:bg-blue-100 text-[#054AC6] border-blue-200/70'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Financial Slide Dashboard</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
              showFinancialDashboard ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-[#054AC6]'
            }`}>
              {showFinancialDashboard ? 'Visible' : 'Optional'}
            </span>
            {showFinancialDashboard ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Master CPA Excel Report Button */}
          <button
            id="export-company-cpa-excel-btn"
            onClick={handleExportCpa}
            disabled={isExportingCpaExcel}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-slate-200 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            title="Download consolidated master accountant Excel report across all projects"
          >
            {isExportingCpaExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#054AC6]" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Accountant Excel Export</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOwnerOrAdmin ? (
            <button
              id="new-project-top-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs bg-[#054AC6] hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-blue-400/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Field User (View Only)
            </span>
          )}
        </div>
      </div>

      {/* Company Financial Overview Bar (MyProjectTrace Soft Minimalist Slide Dashboard) */}
      {showFinancialDashboard && (
      <div className="bg-white text-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4 animate-in fade-in duration-200">
        {/* Top Header Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#054AC6] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                Financial Slide Dashboard
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Portfolio Sync
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-1">
              <Building className="w-5 h-5 text-[#054AC6]" />
              Executive Financials & Health Sentinel
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time cash positions, active collection pace, and project risk indicators across {companySummary.activeCount} active jobs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Add Receipt Button */}
            <button
              id="quick-add-receipt-btn"
              onClick={() => setIsCaptureModalOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
              title="Quick Add: Capture receipt images with device camera for fast expense logging"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Quick Add</span>
            </button>

            {/* Master CPA Excel Report Button */}
            <button
              id="export-company-cpa-excel-btn"
              onClick={handleExportCpa}
              disabled={isExportingCpaExcel}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-slate-200 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              title="Download consolidated master accountant Excel report across all projects"
            >
              {isExportingCpaExcel ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#054AC6]" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Accountant Excel Export</span>
            </button>

            {isOwnerOrAdmin ? (
              <button
                id="new-project-top-btn"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs bg-[#054AC6] hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-blue-400/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Field User (View Only)
              </span>
            )}
          </div>
        </div>

        {(() => {
          const totalContract = companySummary.totalContractVal;
          const totalCollected = companySummary.totalCollectedVal;
          const totalPurchases = companySummary.totalPurchasesVal;
          const netCash = companySummary.netCashPosition;
          const isPositive = netCash >= 0;

          const collectedPct = totalContract > 0 ? Math.min(100, Math.round((totalCollected / totalContract) * 100)) : 0;
          const purchasesPct = totalContract > 0 ? Math.min(100, Math.round((totalPurchases / totalContract) * 100)) : 0;
          const arPct = Math.max(0, 100 - collectedPct);

          // Project risk metrics
          const totalProjectsCount = projects.length || 1;
          const healthyCount = projects.filter(p => !allProjectMetrics[p.projectId]?.highestAlertSeverity).length;
          const warningCount = projects.filter(p => allProjectMetrics[p.projectId]?.highestAlertSeverity === 'WARNING').length;
          const criticalCount = projects.filter(p => allProjectMetrics[p.projectId]?.highestAlertSeverity === 'CRITICAL').length;

          const healthyPct = ((healthyCount / totalProjectsCount) * 100).toFixed(1);
          const warningPct = ((warningCount / totalProjectsCount) * 100).toFixed(1);
          const criticalPct = ((criticalCount / totalProjectsCount) * 100).toFixed(1);

          // Speedometer Needle Angles (-90 to +90 deg)
          const cashBufferRatio = totalCollected > 0 ? Math.min(100, Math.max(0, Math.round(((totalCollected - totalPurchases) / totalCollected) * 100))) : 0;
          const gaugeAngle1 = (collectedPct / 100) * 180 - 90;
          const gaugeAngle2 = (cashBufferRatio / 100) * 180 - 90;

          const rad1 = (gaugeAngle1 * Math.PI) / 180;
          const needleX1 = 50 + 32 * Math.sin(rad1);
          const needleY1 = 50 - 32 * Math.cos(rad1);

          const rad2 = (gaugeAngle2 * Math.PI) / 180;
          const needleX2 = 50 + 32 * Math.sin(rad2);
          const needleY2 = 50 - 32 * Math.cos(rad2);

          // Donut circumference (radius 36) -> 2 * PI * 36 = ~226
          const donutCircumference = 226;
          const strokeDashoffset = donutCircumference - (donutCircumference * collectedPct) / 100;

          return (
            <div className="space-y-3">
              {/* ROW 1: Slide Header Cards (Key Metrics + Sentiment Breakdown) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* 1.1 Product/Company ID Card */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Portfolio Scope
                    </span>
                    <span className="text-[10px] bg-blue-50 text-[#054AC6] font-bold px-2 py-0.5 rounded-md border border-blue-200/60">
                      Active
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xs font-semibold text-slate-500 block truncate">
                      Contractor Pipeline
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {formatCurrency(totalContract)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Active Contracts</span>
                    <span className="font-bold text-slate-800">{companySummary.activeCount} Projects</span>
                  </div>
                </div>

                {/* 1.2 Total Collected with Framed Highlight Badge */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider block truncate">
                      Total Collected
                    </span>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      <span>Contract: </span>
                      <span className="text-slate-800 font-bold">{formatCurrency(totalContract)}</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                      {formatCurrency(totalCollected)}
                    </div>
                    <span className="text-[10px] text-slate-400">Total payments cleared</span>
                  </div>

                  {/* Framed Highlight Box */}
                  <div className="border-2 border-emerald-500/40 bg-emerald-50 rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[76px] shrink-0 shadow-xs">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 mb-0.5" />
                    <span className="text-base font-black text-emerald-700 tracking-tight">
                      {collectedPct}%
                    </span>
                    <span className="text-[9px] uppercase font-bold text-emerald-700/80 text-center leading-none mt-0.5">
                      Collected
                    </span>
                  </div>
                </div>

                {/* 1.3 Total Purchases Recorded with Framed Highlight Badge */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider block truncate">
                      Purchases Recorded
                    </span>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      <span>Cash buffer: </span>
                      <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(netCash)}
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                      {formatCurrency(totalPurchases)}
                    </div>
                    <span className="text-[10px] text-slate-400">Materials, subs, receipts</span>
                  </div>

                  {/* Framed Highlight Box */}
                  <div className={`border-2 rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[76px] shrink-0 shadow-xs ${
                    purchasesPct > 80 
                      ? 'border-rose-300 bg-rose-50' 
                      : 'border-blue-200 bg-blue-50'
                  }`}>
                    {purchasesPct > 80 ? (
                      <ArrowDownRight className="w-4 h-4 text-rose-600 mb-0.5" />
                    ) : (
                      <Receipt className="w-4 h-4 text-[#054AC6] mb-0.5" />
                    )}
                    <span className={`text-base font-black tracking-tight ${purchasesPct > 80 ? 'text-rose-700' : 'text-[#054AC6]'}`}>
                      {purchasesPct}%
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-500 text-center leading-none mt-0.5">
                      Spent Ratio
                    </span>
                  </div>
                </div>

                {/* 1.4 Project Health Sentinel (Promoters / Passives / Detractors style breakdown) */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Risk Sentinel
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {projects.length} Total
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Healthy (Green) */}
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-emerald-200/60 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Smile className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">On Track / Healthy</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-emerald-600">{healthyPct}%</span>
                        <span className="text-[10px] text-slate-400">({healthyCount})</span>
                      </div>
                    </div>

                    {/* Warning (Yellow/Amber) */}
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-amber-200/60 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Meh className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">Near Margin / Watch</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-600">{warningPct}%</span>
                        <span className="text-[10px] text-slate-400">({warningCount})</span>
                      </div>
                    </div>

                    {/* Critical (Red) */}
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-rose-200/60 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                          <Frown className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700">Critical Action</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-rose-600">{criticalPct}%</span>
                        <span className="text-[10px] text-slate-400">({criticalCount})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 2: Graphic Visual Meters (Donut Ring & Speedometer Tachometer Dials) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 2.1 Donut Ring Gauge (CSAT equivalent -> Collection vs Pending AR) */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Contract Fulfillment Rate
                    </span>
                    <PieChart className="w-3.5 h-3.5 text-[#054AC6]" />
                  </div>

                  <div className="flex items-center justify-around py-1">
                    {/* Left Stat */}
                    <div className="text-center">
                      <span className="text-lg font-black text-emerald-600 block leading-tight">
                        {collectedPct}%
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold">Collected</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {formatCurrency(totalCollected)}
                      </span>
                    </div>

                    {/* Center SVG Donut */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                        {/* Background track */}
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-slate-200"
                          fill="transparent"
                        />
                        {/* Progress arc */}
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#10B981"
                          strokeWidth="8"
                          strokeDasharray={donutCircumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>

                    {/* Right Stat */}
                    <div className="text-center">
                      <span className="text-lg font-black text-[#054AC6] block leading-tight">
                        {arPct}%
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold">Pending AR</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {formatCurrency(companySummary.totalArVal)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-200/60">
                    Real-time payment progress vs open receivables
                  </div>
                </div>

                {/* 2.2 Speedometer Gauge 1 (Collection Velocity Index) */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Collection Velocity Index (CVI)
                    </span>
                    <Gauge className="w-3.5 h-3.5 text-[#054AC6]" />
                  </div>

                  {/* Speedometer SVG */}
                  <div className="flex flex-col items-center justify-center my-1">
                    <div className="relative w-36 h-20">
                      <svg className="w-36 h-20 overflow-visible" viewBox="0 0 100 55">
                        {/* Gauge Arc Track */}
                        <path
                          d="M 12 50 A 38 38 0 0 1 88 50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        {/* Gauge Colored Gradient/Arc */}
                        <path
                          d="M 12 50 A 38 38 0 0 1 88 50"
                          fill="none"
                          stroke="#054AC6"
                          strokeWidth="10"
                          strokeDasharray="120"
                          strokeDashoffset={120 - (120 * collectedPct) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                        {/* Dynamic Needle */}
                        <line
                          x1="50"
                          y1="50"
                          x2={needleX1}
                          y2={needleY1}
                          stroke="#0f172a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                        {/* Center Pivot */}
                        <circle cx="50" cy="50" r="4" fill="#054AC6" stroke="#ffffff" strokeWidth="2" />
                        
                        {/* Min / Max Labels */}
                        <text x="8" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">0%</text>
                        <text x="86" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">100%</text>
                      </svg>
                    </div>

                    <div className="text-center mt-1">
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        {collectedPct}.00%
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        Optimal Collection Pace
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center pt-1.5 border-t border-slate-200/60">
                    Percentage of contract amounts converted to cash
                  </div>
                </div>

                {/* 2.3 Speedometer Gauge 2 (Cash Buffer Margin Health) */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Cash Buffer Margin Index
                    </span>
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  </div>

                  {/* Speedometer SVG */}
                  <div className="flex flex-col items-center justify-center my-1">
                    <div className="relative w-36 h-20">
                      <svg className="w-36 h-20 overflow-visible" viewBox="0 0 100 55">
                        {/* Gauge Arc Track */}
                        <path
                          d="M 12 50 A 38 38 0 0 1 88 50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        {/* Gauge Colored Gradient/Arc */}
                        <path
                          d="M 12 50 A 38 38 0 0 1 88 50"
                          fill="none"
                          stroke={isPositive ? '#10B981' : '#EF4444'}
                          strokeWidth="10"
                          strokeDasharray="120"
                          strokeDashoffset={120 - (120 * cashBufferRatio) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                        {/* Dynamic Needle */}
                        <line
                          x1="50"
                          y1="50"
                          x2={needleX2}
                          y2={needleY2}
                          stroke="#0f172a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                        {/* Center Pivot */}
                        <circle cx="50" cy="50" r="4" fill={isPositive ? '#10B981' : '#EF4444'} stroke="#ffffff" strokeWidth="2" />
                        
                        {/* Min / Max Labels */}
                        <text x="8" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">0%</text>
                        <text x="86" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">100%</text>
                      </svg>
                    </div>

                    <div className="text-center mt-1">
                      <span className={`text-xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {cashBufferRatio}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {isPositive ? 'Healthy Cash Retention' : 'Deficit Risk Alert'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center pt-1.5 border-t border-slate-200/60">
                    Net cash liquidity retained after recorded material expenses
                  </div>
                </div>
              </div>

              {/* ROW 3: Visual Analytics (Stacked Breakdown Bar, Trend Wave Curve & Cumulative Area Chart) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 3.1 Project Financial Breakdown with Stacked Bars */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Project Capital Distribution
                    </span>
                    <BarChart3 className="w-3.5 h-3.5 text-[#054AC6]" />
                  </div>

                  {/* Mini Stacked Bars */}
                  <div className="flex items-end justify-between gap-2 h-24 pt-2 px-1">
                    {projects.slice(0, 4).map((p) => {
                      const m = allProjectMetrics[p.projectId] || { totalContractValue: 1, totalCollected: 0, totalPurchases: 0 };
                      const colH = m.totalContractValue > 0 ? Math.min(100, Math.round((m.totalCollected / m.totalContractValue) * 100)) : 20;
                      const purH = m.totalContractValue > 0 ? Math.min(100, Math.round((m.totalPurchases / m.totalContractValue) * 100)) : 10;
                      const remainingH = Math.max(0, 100 - colH);

                      return (
                        <div key={p.projectId} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" title={`${p.projectName}: Collected ${colH}% | Spent ${purH}%`}>
                          <div className="w-full max-w-[28px] h-full flex flex-col justify-end rounded-md overflow-hidden bg-slate-200">
                            {/* Remaining AR Segment */}
                            <div style={{ height: `${remainingH}%` }} className="bg-slate-300 w-full" />
                            {/* Purchases Segment */}
                            <div style={{ height: `${purH}%` }} className="bg-amber-400 w-full" />
                            {/* Collected Segment */}
                            <div style={{ height: `${colH}%` }} className="bg-emerald-500 w-full" />
                          </div>
                          <span className="text-[9px] text-slate-600 font-bold mt-1.5 truncate max-w-[48px]">
                            {p.projectName.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-around text-[9px] text-slate-600 pt-2 border-t border-slate-200/60 font-semibold mt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Collected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Purchases
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Remaining
                    </span>
                  </div>
                </div>

                {/* 3.2 Monthly Cashflow Velocity Wave Curve */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Trailing Cashflow Momentum
                    </span>
                    <span className="text-[9px] bg-blue-50 text-[#054AC6] font-bold px-1.5 py-0.5 rounded border border-blue-200/60">
                      — Cash Buffer Trajectory
                    </span>
                  </div>

                  {/* SVG Wave Line Chart */}
                  <div className="h-24 flex items-center justify-center px-1">
                    <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="200" y2="20" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="0" y1="45" x2="200" y2="45" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="0" y1="70" x2="200" y2="70" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 3" />

                      {/* Smooth Wave Path */}
                      <path
                        d="M 10 30 C 40 60, 70 70, 100 65 C 130 60, 160 30, 190 18"
                        fill="none"
                        stroke="#054AC6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Data Dots */}
                      <circle cx="10" cy="30" r="3" fill="#054AC6" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="65" cy="58" r="3" fill="#054AC6" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="100" cy="65" r="3" fill="#054AC6" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="145" cy="45" r="3" fill="#054AC6" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="190" cy="18" r="3.5" fill="#10B981" stroke="#ffffff" strokeWidth="1.5" />
                    </svg>
                  </div>

                  {/* Months Axis */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1 pt-1.5 border-t border-slate-200/60">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span className="text-emerald-600 font-bold">Jun (Live)</span>
                  </div>
                </div>

                {/* 3.3 Cumulative Financial Position Area Graph */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                      Gross Margin Trajectory
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200/60">
                      ■ Cumulative Gross
                    </span>
                  </div>

                  {/* SVG Area Chart with Gradient */}
                  <div className="h-24 flex items-center justify-center px-1">
                    <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#054AC6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#054AC6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Grid line */}
                      <line x1="0" y1="40" x2="200" y2="40" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3 3" />

                      {/* Area Fill */}
                      <polygon
                        points="0,60 30,55 70,25 110,48 150,20 200,28 200,80 0,80"
                        fill="url(#areaGradientLight)"
                      />

                      {/* Top Line */}
                      <polyline
                        points="0,60 30,55 70,25 110,48 150,20 200,28"
                        fill="none"
                        stroke="#054AC6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <circle cx="70" cy="25" r="2.5" fill="#054AC6" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="150" cy="20" r="2.5" fill="#054AC6" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="200" cy="28" r="3" fill="#10B981" stroke="#ffffff" strokeWidth="1" />
                    </svg>
                  </div>

                  {/* Months Axis */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1 pt-1.5 border-t border-slate-200/60">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span className="text-emerald-600 font-bold">Jun</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-projects-input"
            type="text"
            placeholder="Search projects by name, client, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            id="filter-status-select"
            aria-label="Filter projects by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-2.5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#054AC6] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Risk Filter */}
          <select
            id="filter-risk-select"
            aria-label="Filter projects by financial risk"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-2.5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#054AC6] cursor-pointer"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk Only</option>
            <option value="WARNING">Warnings & Critical</option>
            <option value="HEALTHY">Healthy Only</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Building className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">No projects match your filter</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new contractor project.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setRiskFilter('ALL');
            }}
            className="text-xs text-[#054AC6] font-semibold hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const metrics = allProjectMetrics[project.projectId];
            return (
              <ProjectCard
                key={project.projectId}
                project={project}
                metrics={metrics}
                onSelect={(id) => setSelectedProjectId(id)}
              />
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Quick Add Receipt Capture Modal */}
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

      {/* Progress Media (Fotos y Videos de Avances de Obra) Modal */}
      {isProgressMediaModalOpen && (
        <CaptureProgressMediaModal
          isOpen={isProgressMediaModalOpen}
          onClose={() => setIsProgressMediaModalOpen(false)}
          defaultProjectId={null}
        />
      )}

      {/* AI Receipt Review Modal after Capture */}
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
};
