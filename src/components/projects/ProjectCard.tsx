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
  CheckCircle2
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  metrics: ProjectFinancialMetrics;
  onSelect: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  metrics,
  onSelect,
}) => {
  const { getProjectPhotos, getProjectNotes } = useProjects();
  const photos = getProjectPhotos(project.projectId);
  const notes = getProjectNotes(project.projectId);
  const isCashNegative = metrics.cashPosition < 0;

  return (
    <div
      id={`project-card-${project.projectId}`}
      onClick={() => onSelect(project.projectId)}
      className="group relative bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#054AC6]/50 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.99]"
    >
      {/* Top status line */}
      <div className={`h-1.5 w-full ${
        isCashNegative 
          ? 'bg-rose-500' 
          : metrics.highestAlertSeverity === 'WARNING'
          ? 'bg-amber-500'
          : 'bg-emerald-500'
      }`} />

      {/* Card Top: Title, Client, Badges */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Title & Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#054AC6] transition-colors leading-snug tracking-tight">
                {project.projectName}
              </h3>
              <StatusBadge status={project.status} />
              {metrics.highestAlertSeverity && (
                <SeverityBadge severity={metrics.highestAlertSeverity} />
              )}
            </div>

            {/* Client, Location & Media Badges */}
            <div className="flex items-center text-xs text-slate-500 gap-x-3 gap-y-1.5 flex-wrap font-medium">
              <span className="inline-flex items-center gap-1 text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{project.clientName}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[180px]">{project.projectAddress}</span>
              </span>
              {photos.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#054AC6] font-bold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                  <Camera className="w-3 h-3" />
                  {photos.length}
                </span>
              )}
              {notes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-bold bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md">
                  <Palette className="w-3 h-3" />
                  {notes.length}
                </span>
              )}
            </div>
          </div>

          {/* Deep link tap button */}
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#03225F] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0 self-center">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2x2 Financial Metric Matrix */}
      <div className="p-4 sm:p-5 bg-slate-50/50 space-y-3">
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* Cell 1: Total Contract Value */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-semibold">Total Contract</span>
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block mt-0.5">
              {formatCurrency(metrics.totalContractValue)}
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1 truncate">
              Base: {formatCurrency(metrics.contractValue)} {metrics.approvedChangeOrders > 0 ? `+ ${formatCurrency(metrics.approvedChangeOrders)} changes` : ''}
            </span>
          </div>

          {/* Cell 2: Accounts Receivable & Collected */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-semibold">Accounts Receivable</span>
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block mt-0.5">
              {formatCurrency(metrics.accountsReceivable)}
            </span>
            <span className="text-[10.5px] text-emerald-600 font-bold block mt-1 truncate">
              Collected: {formatCurrency(metrics.totalCollected)}
            </span>
          </div>

          {/* Cell 3: Confirmed Purchases Recorded */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-semibold">Purchases Recorded</span>
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block mt-0.5">
              {formatCurrency(metrics.totalPurchases)}
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1 truncate">
              {metrics.confirmedPurchasesCount} confirmed transactions
            </span>
          </div>

          {/* Cell 4: Cash Position (Dynamic Red/Green Alert) */}
          <div className={`p-3 rounded-xl border shadow-2xs ${
            isCashNegative 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="block text-[11px] font-bold opacity-80">Cash Position</span>
            <div className="flex items-center gap-1 mt-0.5">
              {isCashNegative ? (
                <ArrowDownRight className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={`font-black text-sm sm:text-base tracking-tight ${isCashNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(metrics.cashPosition)}
              </span>
            </div>
            <span className="text-[10.5px] font-bold block mt-1 truncate">
              {isCashNegative ? 'Negative cash flow!' : 'Healthy cash cushion'}
            </span>
          </div>
        </div>

        {/* Secondary Financial Indicators Footer */}
        <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-medium">Gross Position:</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(metrics.grossProjectPosition)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-medium">Gross Margin:</span>
            <span className={`font-black text-xs px-2 py-0.5 rounded-md border ${
              metrics.grossMarginEstimate < 0.25
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}>
              {formatPercentage(metrics.grossMarginEstimate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
