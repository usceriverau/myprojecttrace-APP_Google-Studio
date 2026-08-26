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
import { ProjectDocumentsTab } from './ProjectDocumentsTab';
import { ProjectFinancialSlide } from './ProjectFinancialSlide';
import { ProjectFinancialDrawer } from './ProjectFinancialDrawer';
import { 
  ArrowLeft, Edit3, Camera, AlertTriangle, FileText, CheckCircle2, 
  Receipt, Plus, MapPin, User, FileSpreadsheet, FileDown, 
  Loader2, Eye, ShieldAlert, Sparkles, Layers, DollarSign,
  Palette, CreditCard, Film, MoreVertical, X, ArrowUpRight,
  ArrowDownRight, ChevronRight, Phone, Mail
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
}

type DetailTab = 'overview' | 'purchases' | 'payments' | 'media_specs' | 'alerts';

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
    projectDocuments,
    clients,
    exportProjectPdf,
    exportProjectExcel,
  } = useProjects();

  const { isOwnerOrAdmin } = useAuth();

  const projectClient = clients.find(
    c => (project.clientId && c.clientId === project.clientId) ||
         c.clientName.trim().toLowerCase() === project.clientName.trim().toLowerCase()
  );

  const metrics = allProjectMetrics[project.projectId] || {
    projectId: project.projectId,
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
    openAlertsCount: 0,
  };

  const purchases = getProjectPurchases(project.projectId);
  const payments = getProjectPayments(project.projectId);
  const alerts = getProjectAlerts(project.projectId);
  const projectPhotos = getProjectPhotos(project.projectId);
  const projectNotes = getProjectNotes(project.projectId);
  const projectDocs = projectDocuments.filter(d => d.projectId === project.projectId);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [mediaSpecsSubTab, setMediaSpecsSubTab] = useState<'photos' | 'specs' | 'docs'>('photos');
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
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#054AC6] bg-slate-100 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition-all cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Projects</span>
        </button>

        <div className="flex-1 min-w-0 px-2 text-center sm:text-left">
          <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
            {project.projectName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 truncate hidden sm:block">
            {project.clientName} • {project.projectAddress}
          </p>
        </div>

        {/* Action Menu (Kebab '⋮' on mobile / buttons on desktop) */}
        <div className="relative">
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download Project Audit PDF"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-rose-600" />}
              <span>PDF</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download Project Excel Workbook"
            >
              {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              <span>Excel</span>
            </button>

            {isOwnerOrAdmin && (
              <button
                id="edit-project-header-btn"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-[#054AC6]" />
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
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <span>Download Project PDF</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleDownloadExcel();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
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

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {project.projectName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:text-base text-[#7FA0D4] font-medium">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#7FA0D4]" />
                  Client: <strong className="text-white">{project.clientName}</strong>
                </span>
                {projectClient?.phone && (
                  <a
                    id="hero-call-client-btn"
                    href={`tel:${projectClient.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#021845] hover:bg-[#054AC6] text-white px-2.5 py-1 rounded-lg border border-[#054AC6]/60 transition-colors shadow-2xs"
                    title={`Call ${project.clientName}: ${projectClient.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{projectClient.phone}</span>
                  </a>
                )}
                {projectClient?.email && (
                  <a
                    id="hero-email-client-btn"
                    href={`mailto:${projectClient.email}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#021845] hover:bg-[#054AC6] text-white px-2.5 py-1 rounded-lg border border-[#054AC6]/60 transition-colors shadow-2xs"
                    title={`Email ${project.clientName}: ${projectClient.email}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>{projectClient.email}</span>
                  </a>
                )}
              </div>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#7FA0D4]" />
                {project.projectAddress}
              </span>
              <span className="text-slate-300 text-xs sm:text-sm">
                Started {formatDate(project.startDate)}
              </span>
            </div>

            {project.notes && (
              <p className="text-sm text-slate-200 bg-[#021845] p-3.5 rounded-2xl border border-[#054AC6]/40 max-w-2xl leading-relaxed">
                {project.notes}
              </p>
            )}
          </div>

          {/* Contract Value Highlight Banner */}
          <div className="bg-[#021845] border border-[#054AC6]/40 p-4 sm:p-5 rounded-2xl shrink-0 sm:min-w-[240px]">
            <span className="text-xs sm:text-sm text-[#7FA0D4] block font-bold">Total Contract Value</span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
              {formatCurrency(metrics.totalContractValue)}
            </div>
            <div className="text-xs text-[#7FA0D4] mt-1">
              Base: {formatCurrency(metrics.contractValue)} {metrics.approvedChangeOrders > 0 ? `+ ${formatCurrency(metrics.approvedChangeOrders)} changes` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Horizontal Scrollable Tabs */}
      <div className="sticky top-14 sm:top-16 z-20 bg-slate-50/95 backdrop-blur-md py-1.5 border-b border-slate-200 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 min-w-max px-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'purchases', label: 'Purchases', count: purchases.length },
            { id: 'payments', label: 'Collections & Payments', count: payments.length },
            { id: 'media_specs', label: 'Progress Media & Docs', count: projectPhotos.length + projectNotes.length + projectDocs.length },
            { id: 'alerts', label: 'Risk Alerts', count: alerts.length, isAlert: alerts.length > 0 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-detail-${tab.id}`}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer min-h-[40px] ${
                  isActive
                    ? 'bg-[#054AC6] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-black ${
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
                    <div className="text-sm space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">{alert.title}</span>
                        <SeverityBadge severity={alert.severity} />
                      </div>
                      <p className="font-medium text-slate-800 text-sm sm:text-base">{alert.message}</p>
                      {alert.whyItMatters && (
                        <p className="text-slate-600 text-xs sm:text-sm">
                          <strong>Why it matters:</strong> {alert.whyItMatters}
                        </p>
                      )}
                      {alert.recommendedAction && (
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm bg-white/60 p-2.5 rounded-lg border border-black/5">
                          <strong>Recommended action:</strong> {alert.recommendedAction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Primary CTA for fast field remediation */}
                  <div className="shrink-0 flex items-center sm:self-center">
                    <button
                      onClick={() => setIsCapturePaymentModalOpen(true)}
                      className="w-full sm:w-auto text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer min-h-[42px]"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>+ Record / Collect Payment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Project Financial Slide Dashboard (Hero Metric, Speedometer, Segmented Flow, 2x2 Matrix) */}
          <ProjectFinancialSlide
            project={project}
            metrics={metrics}
            onRecordPayment={() => setIsCapturePaymentModalOpen(true)}
            onCaptureReceipt={() => setIsCaptureModalOpen(true)}
          />

          {/* Quick Action Triggers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setIsCaptureModalOpen(true)}
              className="p-3.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[68px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#054AC6] flex items-center justify-center shrink-0 group-hover:bg-[#054AC6] group-hover:text-white transition-colors">
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">Scan Receipt</span>
                  <span className="text-xs text-slate-400">OCR parsing</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsCapturePaymentModalOpen(true)}
              className="p-3.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[68px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">Log Payment</span>
                  <span className="text-xs text-slate-400">Checks & wire</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('media_specs');
                setMediaSpecsSubTab('photos');
              }}
              className="p-3.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[68px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Film className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">Jobsite Media</span>
                  <span className="text-xs text-slate-400">{projectPhotos.length} files</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('media_specs');
                setMediaSpecsSubTab('specs');
              }}
              className="p-3.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group min-h-[68px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Palette className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">Color & Specs</span>
                  <span className="text-xs text-slate-400">{projectNotes.length} notes</span>
                </div>
              </div>
            </button>
          </div>

          {/* Client & Communication Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#054AC6]" />
                  <span>Client & Jobsite Contact</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Direct communication channels and notes for {project.clientName}.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {projectClient?.phone && (
                  <a
                    id="overview-call-client-btn"
                    href={`tel:${projectClient.phone}`}
                    className="text-xs sm:text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 border border-emerald-200 transition-colors shadow-2xs"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Call ({projectClient.phone})</span>
                  </a>
                )}
                {projectClient?.email && (
                  <a
                    id="overview-email-client-btn"
                    href={`mailto:${projectClient.email}`}
                    className="text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 border border-blue-200 transition-colors shadow-2xs"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email ({projectClient.email})</span>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Client Name</span>
                <span className="font-extrabold text-slate-900 mt-1 block">{project.clientName}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jobsite Address</span>
                <span className="font-extrabold text-slate-900 mt-1 block truncate">{project.projectAddress}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Client Notes & Preferences</span>
                <span className="text-slate-700 mt-1 block font-medium">
                  {projectClient?.notes || 'No specific preferences recorded'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Purchases */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Recorded Purchases & Receipts</h3>
            <button
              id="project-capture-receipt-btn"
              onClick={() => setIsCaptureModalOpen(true)}
              className="text-xs sm:text-sm bg-[#054AC6] hover:bg-[#03225F] text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Capture Receipt</span>
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">No purchases recorded yet</p>
              <p className="text-sm text-slate-400">Capture a receipt to log the first project expense.</p>
              <button
                onClick={() => setIsCaptureModalOpen(true)}
                className="mt-2 text-xs sm:text-sm font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-4 py-2.5 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs"
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
                        <span className="font-extrabold text-slate-900 text-lg sm:text-xl">
                          {purchase.providerName || 'Provider'}
                        </span>
                        <Badge variant="success">Confirmed</Badge>
                        {purchase.receiptPageCount > 1 && (
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium flex items-center gap-1 border border-slate-200">
                            <Layers className="w-3.5 h-3.5" />
                            {purchase.receiptPageCount} photos
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1 font-medium flex-wrap">
                        <span>{formatDate(purchase.purchaseDate)}</span>
                        {purchase.receiptNumber && <span>Receipt #{purchase.receiptNumber}</span>}
                        {purchase.paymentMethod && <span>via {purchase.paymentMethod}</span>}
                      </div>
                      {purchase.aiExtractedTextSummary && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          {purchase.aiExtractedTextSummary}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Transaction Total</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900">
                          {formatCurrency(purchase.totalAmount)}
                        </span>
                      </div>
                      <button
                        onClick={() => setReviewPurchase(purchase)}
                        className="text-xs sm:text-sm text-[#054AC6] hover:text-[#03225F] font-bold flex items-center gap-1.5 hover:underline cursor-pointer min-h-[36px]"
                      >
                        <Eye className="w-4 h-4" />
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
            <h3 className="text-lg font-black text-slate-900">Recorded Customer Payments & Collections</h3>
            <button
              id="project-capture-payment-btn"
              onClick={() => setIsCapturePaymentModalOpen(true)}
              className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Capture Payment</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">No customer payments recorded yet</p>
              <p className="text-sm text-slate-400">Capture a check, bank deposit slip, or Zelle receipt to log collections.</p>
              <button
                onClick={() => setIsCapturePaymentModalOpen(true)}
                className="mt-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs"
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
                        <span className="font-extrabold text-slate-900 text-lg sm:text-xl">
                          {payment.payerName || project.clientName}
                        </span>
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          {payment.paymentMethod || 'PAYMENT'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {formatDate(payment.paymentDate)} {payment.referenceNumber ? `• Ref: ${payment.referenceNumber}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Payment Amount</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => setEditingPayment(payment)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit payment details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {payment.notes && (
                    <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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

      {/* TAB CONTENT: Progress Media & Specs & Documents */}
      {activeTab === 'media_specs' && (
        <div className="space-y-4">
          {/* Sub-selector */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit flex-wrap">
            <button
              onClick={() => setMediaSpecsSubTab('photos')}
              className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                mediaSpecsSubTab === 'photos'
                  ? 'bg-[#054AC6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Jobsite Media ({projectPhotos.length})</span>
            </button>

            <button
              onClick={() => setMediaSpecsSubTab('specs')}
              className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                mediaSpecsSubTab === 'specs'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Color Specs & Notes ({projectNotes.length})</span>
            </button>

            <button
              onClick={() => setMediaSpecsSubTab('docs')}
              className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                mediaSpecsSubTab === 'docs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Contracts & Docs ({projectDocs.length})</span>
            </button>
          </div>

          {mediaSpecsSubTab === 'photos' && <ProjectPhotosTab project={project} />}
          {mediaSpecsSubTab === 'specs' && <ProjectNotesTab project={project} />}
          {mediaSpecsSubTab === 'docs' && <ProjectDocumentsTab project={project} />}
        </div>
      )}

      {/* TAB CONTENT: Risk Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">Project Financial Risk Alerts</h3>

          {alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-base font-bold text-slate-800">Financial position is healthy</p>
              <p className="text-sm text-slate-500">No risk thresholds or margin warnings triggered.</p>
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
                      <AlertTriangle className={`w-4.5 h-4.5 ${
                        alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                      }`} />
                      <span className="font-bold text-slate-900 text-base">{alert.title}</span>
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{alert.message}</p>
                  {alert.whyItMatters && (
                    <div className="text-xs sm:text-sm bg-slate-50 p-3 rounded-xl text-slate-600 border border-slate-100">
                      <strong>Why this matters:</strong> {alert.whyItMatters}
                    </div>
                  )}
                  {alert.recommendedAction && (
                    <div className="text-xs sm:text-sm bg-amber-50/60 p-3 rounded-xl text-amber-900 border border-amber-200/60 font-semibold">
                      <strong>Recommended contractor action:</strong> {alert.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
