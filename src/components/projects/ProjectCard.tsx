import React from 'react';
import { Project, ProjectFinancialMetrics } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StatusBadge, SeverityBadge } from '../common/Badge';
import { useProjects } from '../../context/ProjectContext';
import { 
  MapPin, 
  User, 
  ChevronRight, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Camera, 
  Palette,
  CheckCircle2,
  Briefcase,
  ArrowDownToLine,
  ShoppingCart,
  Hourglass,
  Sparkles,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  metrics: ProjectFinancialMetrics;
  onSelect: (projectId: string) => void;
  onOpenSlide?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  metrics,
  onSelect,
  onOpenSlide,
}) => {
  const { getProjectPhotos, getProjectNotes } = useProjects();
  const photos = getProjectPhotos(project.projectId);
  const notes = getProjectNotes(project.projectId);
  const isCashNegative = metrics.cashPosition < 0;

  // Segmented proportions
  const contractVal = metrics.totalContractValue || 1;
  const collectedPct = Math.min(100, Math.max(0, (metrics.totalCollected / contractVal) * 100));
  const purchasesPct = Math.min(100, Math.max(0, (metrics.totalPurchases / contractVal) * 100));
  const arPct = Math.min(100, Math.max(0, (metrics.accountsReceivable / contractVal) * 100));

  return (
    <div
      id={`project-card-${project.projectId}`}
      onClick={() => onSelect(project.projectId)}
      className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#054AC6]/50 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.99]"
    >
      {/* Top Status Border Line */}
      <div className={`h-1.5 w-full ${
        isCashNegative 
          ? 'bg-rose-500' 
          : metrics.highestAlertSeverity === 'WARNING'
          ? 'bg-amber-500'
          : 'bg-emerald-500'
      }`} />

      {/* Card Header: Title, Client, Status & Media */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={project.status} />
              {metrics.highestAlertSeverity && (
                <SeverityBadge severity={metrics.highestAlertSeverity} />
              )}
            </div>

            {/* Project Title */}
            <h3 className="font-black text-lg sm:text-xl text-slate-900 group-hover:text-[#054AC6] transition-colors leading-snug tracking-tight">
              {project.projectName}
            </h3>

            {/* Client & Address */}
            <div className="flex items-center text-xs sm:text-sm text-slate-500 gap-x-3 gap-y-1.5 flex-wrap font-medium">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate max-w-[150px] font-semibold">{project.clientName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate max-w-[200px]">{project.projectAddress}</span>
              </span>
              {photos.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#054AC6] font-bold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                  <Camera className="w-3.5 h-3.5" />
                  {photos.length}
                </span>
              )}
              {notes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-700 font-bold bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md">
                  <Palette className="w-3.5 h-3.5" />
                  {notes.length}
                </span>
              )}
            </div>
          </div>

          {/* Deep link button */}
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#03225F] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0 self-center">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* 1. Dynamic "Cash Cushion" Badge */}
        <div className="mt-3.5">
          {!isCashNegative ? (
            <div 
              onClick={(e) => {
                if (onOpenSlide) {
                  e.stopPropagation();
                  onOpenSlide(project.projectId);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs shadow-2xs hover:bg-emerald-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>+{formatCurrency(metrics.cashPosition)} Cash Cushion (Safe - Client Funded)</span>
            </div>
          ) : (
            <div 
              onClick={(e) => {
                if (onOpenSlide) {
                  e.stopPropagation();
                  onOpenSlide(project.projectId);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-900 font-extrabold text-xs shadow-xs hover:bg-rose-100 transition-colors ring-1 ring-rose-500/20"
            >
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span>-{formatCurrency(Math.abs(metrics.cashPosition))} Out of Pocket (Action Needed)</span>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Mini Progress Bar */}
      <div className="px-4 sm:px-5 pt-3 bg-slate-50/60">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 pb-1.5">
          <span>Collected: {Math.round(collectedPct)}%</span>
          <span>Purchases: {Math.round(purchasesPct)}%</span>
          <span>Remaining A/R: {Math.round(arPct)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
          <div style={{ width: `${collectedPct}%` }} className="h-full bg-emerald-500" />
          <div style={{ width: `${purchasesPct}%` }} className="h-full bg-[#054AC6]" />
          <div 
            style={{ width: `${arPct}%` }} 
            className="h-full bg-slate-400 opacity-60" 
          />
        </div>
      </div>

      {/* 2x2 Metric Tiles with Icons */}
      <div className="p-4 sm:p-5 bg-slate-50/60 space-y-3">
        <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm">
          
          {/* Tile 1: 💼 Total Contract */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Total Contract</span>
              <Briefcase className="w-3.5 h-3.5 text-[#054AC6]" />
            </div>
            <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight block mt-1">
              {formatCurrency(metrics.totalContractValue)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
              {metrics.approvedChangeOrders > 0 ? `+${formatCurrency(metrics.approvedChangeOrders)} COs` : 'Base contract'}
            </span>
          </div>

          {/* Tile 2: 📥 Collected */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Collected</span>
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="font-black text-emerald-700 text-base sm:text-lg tracking-tight block mt-1">
              {formatCurrency(metrics.totalCollected)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5 truncate">
              {Math.round(collectedPct)}% collected ({metrics.paymentsCount} payments)
            </span>
          </div>

          {/* Tile 3: 🛒 Purchases */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Purchases</span>
              <ShoppingCart className="w-3.5 h-3.5 text-[#054AC6]" />
            </div>
            <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight block mt-1">
              {formatCurrency(metrics.totalPurchases)}
            </span>
            <span className="text-[11px] text-slate-500 font-bold block mt-0.5 truncate">
              {metrics.confirmedPurchasesCount} receipts ({Math.round(purchasesPct)}% spent)
            </span>
          </div>

          {/* Tile 4: ⏳ Uncollected (A/R) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider">Uncollected (A/R)</span>
              <Hourglass className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="font-black text-amber-700 text-base sm:text-lg tracking-tight block mt-1">
              {formatCurrency(metrics.accountsReceivable)}
            </span>
            <span className="text-[11px] text-amber-700 font-bold block mt-0.5 truncate">
              {Math.round(arPct)}% balance left
            </span>
          </div>

        </div>

        {/* Footer: Gross Position & Margin Gauge Indicator */}
        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Gross Position:</span>
            <span className="font-black text-slate-900">
              {formatCurrency(metrics.grossProjectPosition)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Est. Gross Margin:</span>
            <span className={`font-black px-2 py-0.5 rounded-lg border ${
              metrics.grossMarginEstimate >= 0.30
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : metrics.grossMarginEstimate >= 0.15
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {formatPercentage(metrics.grossMarginEstimate)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
