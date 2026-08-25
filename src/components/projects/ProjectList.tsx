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
import { CapturePaymentModal } from './CapturePaymentModal';
import { Purchase } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { 
  Plus, Search, Building, Camera, CreditCard, Film,
  X, Filter, SlidersHorizontal, Lock, CheckCircle2,
  FileSpreadsheet, Loader2, Sparkles, Layers
} from 'lucide-react';

export const ProjectList: React.FC = () => {
  const {
    projects,
    allProjectMetrics,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    resetToDemoData,
    exportCompanyCpaExcel,
  } = useProjects();

  const { isDemoMode, isOwnerOrAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCapturePaymentModalOpen, setIsCapturePaymentModalOpen] = useState(false);
  const [isProgressMediaModalOpen, setIsProgressMediaModalOpen] = useState(false);
  const [reviewPurchase, setReviewPurchase] = useState<Purchase | null>(null);

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

  // If a project is selected, render the deep-dive detail view
  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      
      {/* Top Controls: Search Bar & New Project Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-projects-input"
            type="text"
            placeholder="Search projects by name, client, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#054AC6] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* New Project Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isOwnerOrAdmin ? (
            <button
              id="new-project-top-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto text-xs bg-[#054AC6] hover:bg-[#03225F] text-white font-bold px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border border-blue-400/30 hover:scale-[1.02] active:scale-[0.98] min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Field User (View Only)
            </span>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 select-none">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'ON_HOLD', label: 'On Hold' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[36px] ${
                statusFilter === st.id
                  ? 'bg-[#03225F] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Risk Filter Select */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            id="filter-risk-select"
            aria-label="Filter projects by financial risk"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#054AC6] cursor-pointer min-h-[36px]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">🚨 Critical Risk Only</option>
            <option value="WARNING">⚠️ Warnings & Critical</option>
            <option value="HEALTHY">✅ Healthy Only</option>
          </select>
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>
          Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> contractor projects
        </span>
        {(searchQuery || statusFilter !== 'ALL' || riskFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setRiskFilter('ALL');
            }}
            className="text-xs text-[#054AC6] font-bold hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Projects Grid / Mobile Cards Feed */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#054AC6] flex items-center justify-center mx-auto">
            <Building className="w-7 h-7" />
          </div>
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
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Clear all filters
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

      {/* Capture Payment & Collection OCR Modal */}
      {isCapturePaymentModalOpen && (
        <CapturePaymentModal
          isOpen={isCapturePaymentModalOpen}
          onClose={() => setIsCapturePaymentModalOpen(false)}
          defaultProjectId={null}
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
