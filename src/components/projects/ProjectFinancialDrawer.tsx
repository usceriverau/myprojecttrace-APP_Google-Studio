import React from 'react';
import { Project, ProjectFinancialMetrics } from '../../types';
import { ProjectFinancialSlide } from './ProjectFinancialSlide';
import { X, DollarSign, ArrowUpRight, ExternalLink } from 'lucide-react';

interface ProjectFinancialDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  metrics: ProjectFinancialMetrics;
  onRecordPayment?: () => void;
  onCaptureReceipt?: () => void;
  onViewProjectDetails?: () => void;
}

export const ProjectFinancialDrawer: React.FC<ProjectFinancialDrawerProps> = ({
  isOpen,
  onClose,
  project,
  metrics,
  onRecordPayment,
  onCaptureReceipt,
  onViewProjectDetails,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-[#F4F7FB] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Top Header */}
          <div className="bg-[#03225F] text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-[#054AC6]/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white truncate">
                    {project.projectName}
                  </h2>
                  <span className="text-[11px] font-bold bg-[#054AC6] text-white px-2 py-0.5 rounded-md shrink-0">
                    Financial Slide
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  {project.clientName} • {project.projectAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onViewProjectDetails && (
                <button
                  onClick={() => {
                    onClose();
                    onViewProjectDetails();
                  }}
                  className="text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Full View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="close-financial-drawer-btn"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <ProjectFinancialSlide
              project={project}
              metrics={metrics}
              onRecordPayment={onRecordPayment}
              onCaptureReceipt={onCaptureReceipt}
              isDrawer={true}
              onClose={onClose}
            />
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>Live Sync Engine • Real-time OCR & Payments</span>
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-3.5 py-2 rounded-xl"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
