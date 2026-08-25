import React, { useState } from 'react';
import { 
  Project, 
  Purchase, 
  Payment, 
  FinancialAlert 
} from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { StatusBadge, SeverityBadge, Badge } from '../common/Badge';
import { EditProjectModal } from './EditProjectModal';
import { CapturePurchaseModal } from '../purchases/CapturePurchaseModal';
import { CapturePaymentModal } from './CapturePaymentModal';
import { EditPaymentModal } from './EditPaymentModal';
import { AIReceiptReviewModal } from '../purchases/AIReceiptReviewModal';
import { ProjectPhotosTab } from './ProjectPhotosTab';
import { ProjectNotesTab } from './ProjectNotesTab';
import { 
  ArrowLeft, Edit3, Camera, AlertTriangle, FileText, CheckCircle2, 
  Receipt, Plus, MapPin, User, FileSpreadsheet, FileDown, 
  Loader2, Eye, ShieldAlert, Sparkles, Layers, DollarSign,
  Palette, CreditCard, Film, MoreVertical, X, Bot, ArrowUpRight,
  ArrowDownRight, ChevronRight
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
}

type DetailTab = 'overview' | 'purchases' | 'payments' | 'media_specs' | 'alerts' | 'luky';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
}) => {
  const {
    allProjectMetrics,
    getProjectPurchases,
    getProjectPayments,
    getProjectAlerts,
    getProjectPhotos,
    getProjectNotes,
    exportProjectPdf,
    exportProjectExcel,
  } = useProjects();

  const { isOwnerOrAdmin } = useAuth();

  const metrics = allProjectMetrics[project.projectId] || {
    totalContractValue: project.contractValue,
    contractValue: project.contractValue,
    approvedChangeOrders: 0,
    totalCollected: 0,
    totalPurchases: 0,
    cashPosition: 0,
    accountsReceivable: project.contractValue,
    grossProjectPosition: project.contractValue,
    grossMarginEstimate: 1.0,
    highestAlertSeverity: null,
    paymentsCount: 0,
    confirmedPurchasesCount: 0,
  };

  const purchases = getProjectPurchases(project.projectId);
  const payments = getProjectPayments(project.projectId);
  const alerts = getProjectAlerts(project.projectId);
  const projectPhotos = getProjectPhotos(project.projectId);
  const projectNotes = getProjectNotes(project.projectId);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [mediaSpecsSubTab, setMediaSpecsSubTab] = useState<'photos' | 'specs'>('photos');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCapturePaymentModalOpen, setIsCapturePaymentModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const isCashNegative = metrics.cashPosition < 0;

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportProjectPdf(project.projectId);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportProjectExcel(project.projectId);
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Top Mobile-First App Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          id="project-back-btn"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#054AC6] bg-slate-100 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Projects</span>
        </button>

        <div className="flex-1 min-w-0 px-2 text-center sm:text-left">
          <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
            {project.projectName}
          </h2>
          <p className="text-[11px] text-slate-500 truncate hidden sm:block">
            {project.clientName} • {project.projectAddress}
          </p>
        </div>

        {/* Action Menu (Kebab '⋮' on mobile / buttons on desktop) */}
        <div className="relative">
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download Project Audit PDF"
            >
              {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-rose-600" />}
              <span>PDF</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download Project Excel Workbook"
            >
              {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Excel</span>
            </button>

            {isOwnerOrAdmin && (
              <button
                id="edit-project-header-btn"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#054AC6]" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <button
            id="project-context-menu-btn"
            onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
            className="sm:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Context Action Bottom Sheet / Dropdown */}
          {isActionMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-2xs"
                onClick={() => setIsActionMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleDownloadPdf();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <span>Download Project PDF</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleDownloadExcel();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Project Excel</span>
                </button>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                  >
                    <Edit3 className="w-4 h-4 text-[#054AC6]" />
                    <span>Edit Project Details</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-[#03225F] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#054AC6]/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={project.status} />
              {metrics.highestAlertSeverity && (
                <SeverityBadge severity={metrics.highestAlertSeverity} />
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {project.projectName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#7FA0D4] font-medium">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#7FA0D4]" />
                Client: <strong className="text-white">{project.clientName}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#7FA0D4]" />
                {project.projectAddress}
              </span>
              <span className="text-slate-300">
                Started {formatDate(project.startDate)}
              </span>
            </div>

            {project.notes && (
              <p className="text-xs text-slate-200 bg-[#021845] p-3 rounded-2xl border border-[#054AC6]/40 max-w-2xl">
                {project.notes}
              </p>
            )}
          </div>

          {/* Contract Value Highlight Banner */}
          <div className="bg-[#021845] border border-[#054AC6]/40 p-4 rounded-2xl shrink-0 sm:min-w-[220px]">
            <span className="text-xs text-[#7FA0D4] block font-semibold">Total Contract Value</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
              {formatCurrency(metrics.totalContractValue)}
            </div>
            <div className="text-[11px] text-[#7FA0D4] mt-1">
              Base: {formatCurrency(metrics.contractValue)} {metrics.approvedChangeOrders > 0 ? `+ ${formatCurrency(metrics.approvedChangeOrders)} changes` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Horizontal Scrollable Tabs */}
      <div className="sticky top-14 sm:top-16 z-20 bg-slate-50/95 backdrop-blur-md py-1 border-b border-slate-200 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 min-w-max px-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'purchases', label: 'Purchases', count: purchases.length },
            { id: 'payments', label: 'Collections & Payments', count: payments.length },
            { id: 'media_specs', label: 'Progress Media & Specs', count: projectPhotos.length + projectNotes.length },
            { id: 'alerts', label: 'Risk Alerts', count: alerts.length, isAlert: alerts.length > 0 },
            { id: 'luky', label: 'Luky AI', icon: Bot },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-detail-${tab.id}`}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-[#054AC6] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : tab.isAlert 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          
          {/* Dynamic Early-Warning Risk Banners */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-xs ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-sky-50 border-sky-200 text-sky-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                    }`} />
                    <div className="text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">{alert.title}</span>
                        <SeverityBadge severity={alert.severity} />
                      </div>
                      <p className="font-medium text-slate-800">{alert.message}</p>
                      {alert.whyItMatters && (
                        <p className="text-slate-600">
                          <strong>Why it matters:</strong> {alert.whyItMatters}
                        </p>
                      )}
                      {alert.recommendedAction && (
                        <p className="font-semibold text-slate-900 bg-white/60 p-2 rounded-lg border border-black/5">
                          <strong>Recommended action:</strong> {alert.recommendedAction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Primary CTA for fast field remediation */}
                  <div className="shrink-0 flex items-center sm:self-center">
                    <button
                      onClick={() => setIsCapturePaymentModalOpen(true)}
                      className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>+ Record / Collect Payment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key Financial Matrix (2x2 Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Collected */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Collected
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(metrics.totalCollected)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.paymentsCount} received payments
              </p>
            </div>

            {/* 2. Purchases Spent */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Purchases Spent
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(metrics.totalPurchases)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.confirmedPurchasesCount} confirmed transactions
              </p>
            </div>

            {/* 3. Current Cash Position */}
            <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${
              isCashNegative 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                Cash Position
              </span>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${
                isCashNegative ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {formatCurrency(metrics.cashPosition)}
              </div>
              <p className="text-[11px] font-bold mt-1 truncate">
                {isCashNegative ? 'Expenses exceed collections' : 'Positive cash cushion'}
              </p>
            </div>

            {/* 4. Accounts Receivable */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Accounts Receivable
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(metrics.accountsReceivable)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Remaining client contract balance
              </p>
            </div>
          </div>

          {/* Gross Position & Margin Widget with Dual-tone Progress Bar */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Gross Project Position & Margin</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Contract Value minus Confirmed Purchases (Gross margin before overhead).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Estimated Gross Margin</span>
                  <span className={`text-xl font-black ${
                    metrics.grossMarginEstimate < 0.25 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {formatPercentage(metrics.grossMarginEstimate)}
                  </span>
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl">
                  <span className="text-xs text-slate-500 block font-medium">Gross Position</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    {formatCurrency(metrics.grossProjectPosition)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dual-Tone Proportional Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 font-bold">
                <span>Total Spent: {formatCurrency(metrics.totalPurchases)}</span>
                <span>Contract Value: {formatCurrency(metrics.totalContractValue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{
                    width: `${Math.min(100, (metrics.totalPurchases / (metrics.totalContractValue || 1)) * 100)}%`,
                  }}
                  className={`h-full ${
                    metrics.totalPurchases > metrics.totalContractValue
                      ? 'bg-rose-500'
                      : metrics.totalPurchases > metrics.totalCollected
                      ? 'bg-amber-500'
                      : 'bg-[#054AC6]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setIsCaptureModalOpen(true)}
              className="p-3.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[64px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#054AC6] flex items-center justify-center shrink-0 group-hover:bg-[#054AC6] group-hover:text-white transition-colors">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 truncate">Scan Receipt</span>
                  <span className="text-[10px] text-slate-400">OCR parsing</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsCapturePaymentModalOpen(true)}
              className="p-3.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[64px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 truncate">Log Payment</span>
                  <span className="text-[10px] text-slate-400">Checks & wire</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('media_specs');
                setMediaSpecsSubTab('photos');
              }}
              className="p-3.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[64px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Film className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 truncate">Jobsite Media</span>
                  <span className="text-[10px] text-slate-400">{projectPhotos.length} files</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('media_specs');
                setMediaSpecsSubTab('specs');
              }}
              className="p-3.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[64px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Palette className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 truncate">Color & Specs</span>
                  <span className="text-[10px] text-slate-400">{projectNotes.length} notes</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Purchases */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recorded Purchases & Receipts</h3>
            <button
              id="project-capture-receipt-btn"
              onClick={() => setIsCaptureModalOpen(true)}
              className="text-xs bg-[#054AC6] hover:bg-[#03225F] text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Capture Receipt</span>
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No purchases recorded yet</p>
              <p className="text-xs text-slate-400">Capture a receipt to log the first project expense.</p>
              <button
                onClick={() => setIsCaptureModalOpen(true)}
                className="mt-2 text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4" />
                Capture First Receipt
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.purchaseId}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-base">
                          {purchase.providerName || 'Provider'}
                        </span>
                        <Badge variant="success">Confirmed</Badge>
                        {purchase.receiptPageCount > 1 && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium flex items-center gap-1 border border-slate-200">
                            <Layers className="w-3 h-3" />
                            {purchase.receiptPageCount} photos
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium flex-wrap">
                        <span>{formatDate(purchase.purchaseDate)}</span>
                        {purchase.receiptNumber && <span>Receipt #{purchase.receiptNumber}</span>}
                        {purchase.paymentMethod && <span>via {purchase.paymentMethod}</span>}
                      </div>
                      {purchase.aiExtractedTextSummary && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {purchase.aiExtractedTextSummary}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Transaction Total</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900">
                          {formatCurrency(purchase.totalAmount)}
                        </span>
                      </div>
                      <button
                        onClick={() => setReviewPurchase(purchase)}
                        className="text-xs text-[#054AC6] hover:text-[#03225F] font-bold flex items-center gap-1 hover:underline cursor-pointer min-h-[36px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Evidence
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recorded Customer Payments & Collections</h3>
            <button
              id="project-capture-payment-btn"
              onClick={() => setIsCapturePaymentModalOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Capture Payment</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No customer payments recorded yet</p>
              <p className="text-xs text-slate-400">Capture a check, bank deposit slip, or Zelle receipt to log collections.</p>
              <button
                onClick={() => setIsCapturePaymentModalOpen(true)}
                className="mt-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                Capture First Payment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.paymentId}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">
                          {payment.payerName || project.clientName}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                          {payment.paymentMethod || 'PAYMENT'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(payment.paymentDate)} {payment.referenceNumber ? `• Ref: ${payment.referenceNumber}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-medium">Payment Amount</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => setEditingPayment(payment)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit payment details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {payment.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {payment.notes}
                    </p>
                  )}

                  {((payment.evidenceUrls && payment.evidenceUrls.length > 0) || payment.evidenceUrl) && (
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      {(payment.evidenceUrls || (payment.evidenceUrl ? [payment.evidenceUrl] : [])).map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden shrink-0 hover:opacity-80 transition-opacity bg-slate-100"
                          title={`Payment Proof Image ${idx + 1}`}
                        >
                          <img
                            src={url}
                            alt={`Payment proof ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Progress Media & Specs */}
      {activeTab === 'media_specs' && (
        <div className="space-y-4">
          {/* Sub-selector */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button
              onClick={() => setMediaSpecsSubTab('photos')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                mediaSpecsSubTab === 'photos'
                  ? 'bg-[#054AC6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Jobsite Media ({projectPhotos.length})</span>
            </button>

            <button
              onClick={() => setMediaSpecsSubTab('specs')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                mediaSpecsSubTab === 'specs'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color Specs & Notes ({projectNotes.length})</span>
            </button>
          </div>

          {mediaSpecsSubTab === 'photos' ? (
            <ProjectPhotosTab project={project} />
          ) : (
            <ProjectNotesTab project={project} />
          )}
        </div>
      )}

      {/* TAB CONTENT: Risk Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Project Financial Risk Alerts</h3>

          {alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Financial position is healthy</p>
              <p className="text-xs text-slate-500">No risk thresholds or margin warnings triggered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                      }`} />
                      <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-xs text-slate-700 font-medium">{alert.message}</p>
                  {alert.whyItMatters && (
                    <div className="text-xs bg-slate-50 p-3 rounded-xl text-slate-600 border border-slate-100">
                      <strong>Why this matters:</strong> {alert.whyItMatters}
                    </div>
                  )}
                  {alert.recommendedAction && (
                    <div className="text-xs bg-amber-50/60 p-3 rounded-xl text-amber-900 border border-amber-200/60 font-semibold">
                      <strong>Recommended contractor action:</strong> {alert.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Luky AI scoped to this project */}
      {activeTab === 'luky' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#054AC6] flex items-center justify-center mx-auto shadow-2xs">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            Ask Luky about {project.projectName}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Get instant financial calculations, unpaid client invoices, supplier receipt audits, or material expense breakdowns for this project.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="font-bold text-slate-800 block">💡 Profitability & Cash Flow</span>
              <span className="text-[11px] text-slate-500">Current cash position vs total spent</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="font-bold text-slate-800 block">🧾 Receipts & Vendors</span>
              <span className="text-[11px] text-slate-500">Itemized line items from OCR</span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onDeleted={onBack}
        />
      )}

      {isCaptureModalOpen && (
        <CapturePurchaseModal
          isOpen={isCaptureModalOpen}
          onClose={() => setIsCaptureModalOpen(false)}
          defaultProjectId={project.projectId}
          onOpenReview={(p) => setReviewPurchase(p)}
        />
      )}

      {isCapturePaymentModalOpen && (
        <CapturePaymentModal
          isOpen={isCapturePaymentModalOpen}
          onClose={() => setIsCapturePaymentModalOpen(false)}
          defaultProjectId={project.projectId}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          isOpen={Boolean(editingPayment)}
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onUpdated={() => setEditingPayment(null)}
          onDeleted={() => setEditingPayment(null)}
        />
      )}

      {reviewPurchase && (
        <AIReceiptReviewModal
          isOpen={Boolean(reviewPurchase)}
          purchase={reviewPurchase}
          initialProjectId={project.projectId}
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
