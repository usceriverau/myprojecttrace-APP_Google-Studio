import React from 'react';
import { Project, ProjectFinancialMetrics } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StatusBadge, SeverityBadge } from '../common/Badge';
import { useProjects } from '../../context/ProjectContext';
import { MapPin, User, ChevronRight, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet, Camera, Palette } from 'lucide-react';

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
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-6px_rgba(3,34,95,0.08)] hover:border-[#054AC6]/40 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      {/* Dynamic top subtle accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#03225F] via-[#054AC6] to-[#03225F]/30 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Title & Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[15px] sm:text-base text-slate-900 group-hover:text-[#054AC6] transition-colors leading-snug tracking-tight">
                {project.projectName}
              </h3>
              <StatusBadge status={project.status} />
              {metrics.highestAlertSeverity && (
                <SeverityBadge severity={metrics.highestAlertSeverity} />
              )}
            </div>

            {/* Client, Location & Media Badges */}
            <div className="flex items-center text-xs text-slate-500 gap-x-3 gap-y-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{project.clientName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[170px]">{project.projectAddress}</span>
              </span>
              {photos.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#054AC6] font-semibold bg-blue-50/90 border border-blue-100/80 px-2 py-0.5 rounded-md">
                  <Camera className="w-3 h-3" />
                  {photos.length} photos
                </span>
              )}
              {notes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-semibold bg-purple-50/90 border border-purple-100/80 px-2 py-0.5 rounded-md">
                  <Palette className="w-3 h-3" />
                  {notes.length} notes
                </span>
              )}
            </div>
          </div>

          {/* Action indicator button */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-400 group-hover:bg-[#03225F] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0 self-center">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Financial Core Numbers Grid */}
      <div className="p-4 sm:p-5 bg-slate-50/40 space-y-3">
        {/* Row 1: Contract & Changes / Accounts Receivable */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
            <span className="text-slate-500 block text-[11px] font-medium">Total Contract Value</span>
            <span className="font-bold text-slate-900 text-sm tracking-tight block mt-0.5">
              {formatCurrency(metrics.totalContractValue)}
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1 truncate">
              Base: {formatCurrency(metrics.contractValue)} {metrics.approvedChangeOrders > 0 ? `+ ${formatCurrency(metrics.approvedChangeOrders)} changes` : ''}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
            <span className="text-slate-500 block text-[11px] font-medium">Accounts Receivable</span>
            <span className="font-bold text-slate-900 text-sm tracking-tight block mt-0.5">
              {formatCurrency(metrics.accountsReceivable)}
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1 truncate">
              Collected: {formatCurrency(metrics.totalCollected)}
            </span>
          </div>
        </div>

        {/* Row 2: Purchases Recorded vs Cash Position */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
            <span className="text-slate-500 block text-[11px] font-medium">Purchases Recorded</span>
            <span className="font-bold text-slate-900 text-sm tracking-tight block mt-0.5">
              {formatCurrency(metrics.totalPurchases)}
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1 truncate">
              {metrics.confirmedPurchasesCount} confirmed purchases
            </span>
          </div>

          <div className={`p-3 rounded-xl border transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
            isCashNegative 
              ? 'bg-rose-50/70 border-rose-200/80 text-rose-900' 
              : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
          }`}>
            <span className="block text-[11px] font-medium opacity-80">Current Cash Position</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isCashNegative ? (
                <ArrowDownRight className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className={`font-bold text-sm tracking-tight ${isCashNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(metrics.cashPosition)}
              </span>
            </div>
            <span className="text-[10.5px] opacity-80 block mt-1 font-medium truncate">
              {isCashNegative ? 'Negative cash flow!' : 'Healthy cash cushion'}
            </span>
          </div>
        </div>

        {/* Gross Project Position & Margin Estimate */}
        <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 text-[11px] font-medium">Gross Project Position</span>
            <span className="font-bold text-slate-900 ml-1.5 tracking-tight">
              {formatCurrency(metrics.grossProjectPosition)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-medium">Gross Margin Est.</span>
            <span className={`font-bold text-xs px-2.5 py-0.5 rounded-md border ${
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
