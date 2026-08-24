import React, { useState } from 'react';
import { Project, ProjectFinancialMetrics, Purchase, Payment, FinancialAlert } from '../../types';
import { formatCurrency, formatPercentage, formatDate } from '../../lib/utils';
import { StatusBadge, SeverityBadge, Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { EditProjectModal } from './EditProjectModal';
import { CapturePurchaseModal } from '../purchases/CapturePurchaseModal';
import { AIReceiptReviewModal } from '../purchases/AIReceiptReviewModal';
import { ProjectPhotosTab } from './ProjectPhotosTab';
import { ProjectNotesTab } from './ProjectNotesTab';
import { 
  ArrowLeft, MapPin, User, Receipt, CreditCard, AlertTriangle, CheckCircle2, 
  Layers, Edit3, Camera, Eye, FileDown, FileSpreadsheet, FileText, Palette, 
  Download, Loader2, Sparkles 
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  metrics: ProjectFinancialMetrics;
  purchases: Purchase[];
  payments: Payment[];
  alerts: FinancialAlert[];
  onBack: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  metrics,
  purchases,
  payments,
  alerts,
  onBack,
}) => {
  const { isOwnerOrAdmin } = useAuth();
  const { 
    getProjectPhotos, 
    getProjectNotes, 
    exportProjectPdf, 
    exportCompanyCpaExcel 
  } = useProjects();
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'payments' | 'photos' | 'notes' | 'alerts'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const projectPhotos = getProjectPhotos(project.projectId);
  const projectNotes = getProjectNotes(project.projectId);
  const isCashNegative = metrics.cashPosition < 0;

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportProjectPdf(project.projectId);
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      alert('Could not generate PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      setIsExportingExcel(true);
      exportCompanyCpaExcel();
    } catch (err) {
      console.error('Failed to export Accountant Excel report:', err);
      alert('Could not generate the Accountant Excel Export. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button & Report Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          id="back-to-projects-btn"
          onClick={onBack}
          className="flex items-center text-xs font-bold text-slate-700 hover:text-[#03225F] bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 text-[#054AC6]" />
          All Projects
        </button>

        {/* Action Buttons: Status, PDF & Excel Exports, Edit */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          {metrics.highestAlertSeverity && (
            <SeverityBadge severity={metrics.highestAlertSeverity} />
          )}

          {/* Export PDF Button (Project-specific) */}
          <button
            id="download-pdf-report-btn"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download project-specific PDF audit & status report"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#054AC6]" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Project PDF</span>
          </button>

          {/* Export Excel / Tax File Button (General Accountant Excel for all projects) */}
          <button
            id="download-excel-tax-btn"
            onClick={handleDownloadExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download consolidated master accountant Excel report across all projects"
          >
            {isExportingExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Accountant Excel Export</span>
          </button>

          {isOwnerOrAdmin && (
            <button
              id="edit-project-btn"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#054AC6]" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Project Header Banner (MyProjectTrace Navy Palette) */}
      <div className="bg-[#03225F] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#054AC6]/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {project.projectName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7FA0D4] mt-2 font-medium">
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
              <p className="text-xs text-slate-200 mt-2 bg-[#021845] p-2.5 rounded-xl border border-[#054AC6]/40 max-w-2xl">
                {project.notes}
              </p>
            )}
          </div>

          <div className="bg-[#021845] border border-[#054AC6]/40 p-4 rounded-xl shrink-0 min-w-[200px]">
            <span className="text-xs text-[#7FA0D4] block font-medium">Total Contract Value</span>
            <div className="text-2xl font-black text-white mt-0.5">
              {formatCurrency(metrics.totalContractValue)}
            </div>
            <div className="text-[11px] text-[#7FA0D4] mt-1">
              Base: {formatCurrency(metrics.contractValue)} {metrics.approvedChangeOrders > 0 ? `+ ${formatCurrency(metrics.approvedChangeOrders)} changes` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          id="tab-detail-overview"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Financial Overview
        </button>
        <button
          id="tab-detail-purchases"
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Purchases Recorded</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {purchases.length}
          </span>
        </button>
        <button
          id="tab-detail-payments"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'payments'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Collections & Payments</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {payments.length}
          </span>
        </button>
        <button
          id="tab-detail-photos"
          onClick={() => setActiveTab('photos')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'photos'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-[#054AC6]" />
          <span>Progress Photos</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#054AC6] font-bold">
            {projectPhotos.length}
          </span>
        </button>
        <button
          id="tab-detail-notes"
          onClick={() => setActiveTab('notes')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'notes'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-purple-600" />
          <span>Notes & Colors</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">
            {projectNotes.length}
          </span>
        </button>
        <button
          id="tab-detail-alerts"
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-[#054AC6] text-[#03225F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Risk Alerts</span>
          {alerts.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Active Risk Alerts Banner if present */}
          {alerts.length > 0 && (
            <div className="space-y-2.5">
              {alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-sky-50 border-sky-200 text-sky-950'
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                    alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                  }`} />
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{alert.title}</span>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="font-medium">{alert.message}</p>
                    {alert.whyItMatters && (
                      <p className="opacity-80"><strong>Why it matters:</strong> {alert.whyItMatters}</p>
                    )}
                    {alert.recommendedAction && (
                      <p className="font-semibold text-slate-900">
                        <strong>Recommended action:</strong> {alert.recommendedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions Card: Photo, Note, PDF, Excel */}
          <div className="bg-linear-to-r from-[#03225F]/5 via-blue-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#03225F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#054AC6]" />
                  Project Quick Tools & Reports
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manage jobsite visuals, specifications, and download tax-ready documentation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setActiveTab('photos')}
                className="flex items-center gap-2 p-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-[#054AC6] shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 group-hover:text-[#054AC6] truncate">
                    Progress Photos
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {projectPhotos.length} records
                  </span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className="flex items-center gap-2 p-3 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate">
                    Notes & Colors
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {projectNotes.length} specs
                  </span>
                </div>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-2 p-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 group-hover:text-rose-700 truncate">
                    PDF Report
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Financial audit
                  </span>
                </div>
              </button>

              <button
                onClick={handleDownloadExcel}
                disabled={isExportingExcel}
                className="flex items-center gap-2 p-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  {isExportingExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                    Accountant Excel Export
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Consolidated workbook
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Core Contractor Financial Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Collected */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Collected
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(metrics.totalCollected)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.paymentsCount} received payments
              </p>
            </div>

            {/* Card 2: Purchases Recorded */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Purchases Recorded
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(metrics.totalPurchases)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.confirmedPurchasesCount} confirmed transactions
              </p>
            </div>

            {/* Card 3: Cash Position */}
            <div className={`p-5 rounded-xl border shadow-xs ${
              isCashNegative 
                ? 'bg-rose-50 border-rose-200' 
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider block opacity-80">
                Current Cash Position
              </span>
              <div className={`text-2xl font-extrabold mt-1 ${
                isCashNegative ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {formatCurrency(metrics.cashPosition)}
              </div>
              <p className="text-xs opacity-75 mt-1">
                {isCashNegative ? 'Expenses exceed collections' : 'Positive project cash buffer'}
              </p>
            </div>

            {/* Card 4: Accounts Receivable */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Accounts Receivable
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(metrics.accountsReceivable)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Remaining client contract balance
              </p>
            </div>
          </div>

          {/* Contractor Gross Project Position Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Gross Project Position</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Contract Value minus Confirmed Purchases (Labor, payroll, and overhead not yet deducted).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Estimated Gross Margin</span>
                  <span className={`text-lg font-black ${
                    metrics.grossMarginEstimate < 0.25 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {formatPercentage(metrics.grossMarginEstimate)}
                  </span>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block font-medium">Gross Position</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(metrics.grossProjectPosition)}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Total Spent: {formatCurrency(metrics.totalPurchases)}</span>
                <span>Contract Value: {formatCurrency(metrics.totalContractValue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(100, (metrics.totalPurchases / metrics.totalContractValue) * 100)}%`,
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
        </div>
      )}

      {/* TAB CONTENT: Purchases */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recorded Purchases & Receipts</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold">{purchases.length} confirmed entries</span>
              <button
                id="project-capture-receipt-btn"
                onClick={() => setIsCaptureModalOpen(true)}
                className="text-xs bg-[#054AC6] hover:bg-[#03225F] text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#7FA0D4]" />
                Capture Receipt
              </button>
            </div>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No purchases recorded for this project yet.</p>
              <p className="text-xs text-slate-400 mt-1">Capture a receipt to record the first project expense.</p>
              <button
                onClick={() => setIsCaptureModalOpen(true)}
                className="mt-3 text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {purchase.providerName || 'Provider'}
                        </span>
                        <Badge variant="success">Confirmed</Badge>
                        {purchase.receiptPageCount > 1 && (
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium flex items-center gap-1 border border-slate-200">
                            <Layers className="w-3 h-3" />
                            {purchase.receiptPageCount} photos (1 receipt)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{formatDate(purchase.purchaseDate)}</span>
                        {purchase.receiptNumber && <span>Receipt #{purchase.receiptNumber}</span>}
                        {purchase.paymentMethod && <span>via {purchase.paymentMethod}</span>}
                      </div>
                      {purchase.aiExtractedTextSummary && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {purchase.aiExtractedTextSummary}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Transaction Total</span>
                        <span className="text-lg font-black text-slate-900">
                          {formatCurrency(purchase.totalAmount)}
                        </span>
                      </div>
                      <button
                        onClick={() => setReviewPurchase(purchase)}
                        className="text-xs text-[#054AC6] hover:text-[#03225F] font-bold flex items-center gap-1 hover:underline cursor-pointer"
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
            <h2 className="text-base font-bold text-slate-900">Recorded Customer Payments</h2>
            <span className="text-xs text-slate-500 font-semibold">{payments.length} total payments</span>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No payments recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Record a deposit or progress payment to update collections.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.paymentId}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm capitalize">
                          {payment.paymentType.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <Badge variant={payment.status === 'CLEARED' || payment.status === 'RECEIVED' ? 'success' : 'warning'}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{formatDate(payment.paymentDate)}</span>
                        <span>{payment.paymentMethod}</span>
                        {payment.referenceNumber && <span>Ref: {payment.referenceNumber}</span>}
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-slate-600 mt-1 italic">{payment.notes}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Collected</span>
                      <span className="text-lg font-black text-emerald-700">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Progress Photos */}
      {activeTab === 'photos' && (
        <ProjectPhotosTab project={project} />
      )}

      {/* TAB CONTENT: Notes & Specs */}
      {activeTab === 'notes' && (
        <ProjectNotesTab project={project} />
      )}

      {/* TAB CONTENT: Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Project Financial Risk Alerts</h2>

          {alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">Financial position is healthy.</p>
              <p className="text-xs text-slate-500 mt-1">No risk thresholds or margin warnings triggered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2"
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
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg text-slate-600 border border-slate-100">
                      <strong>Why this matters:</strong> {alert.whyItMatters}
                    </div>
                  )}
                  {alert.recommendedAction && (
                    <div className="text-xs bg-amber-50/50 p-2.5 rounded-lg text-amber-900 border border-amber-200/60">
                      <strong>Recommended contractor action:</strong> {alert.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onDeleted={onBack}
        />
      )}

      {/* Capture Purchase Modal for this Project */}
      {isCaptureModalOpen && (
        <CapturePurchaseModal
          isOpen={isCaptureModalOpen}
          onClose={() => setIsCaptureModalOpen(false)}
          defaultProjectId={project.projectId}
          onOpenReview={(p) => {
            setReviewPurchase(p);
          }}
        />
      )}

      {/* Phase 3 AI Receipt Review & Confirmation Modal */}
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
