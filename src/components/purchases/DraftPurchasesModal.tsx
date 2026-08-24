import React from 'react';
import { useProjects } from '../../context/ProjectContext';
import { Purchase } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  Receipt, X, Clock, AlertTriangle, CheckCircle2, 
  Trash2, Eye, Plus, Camera, Sparkles, Layers 
} from 'lucide-react';

interface DraftPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCapture: (purchaseId?: string) => void;
  onOpenReview?: (purchase: Purchase) => void;
}

export const DraftPurchasesModal: React.FC<DraftPurchasesModalProps> = ({
  isOpen,
  onClose,
  onOpenCapture,
  onOpenReview,
}) => {
  const { draftPurchases, deleteDraftPurchase, projects } = useProjects();

  if (!isOpen) return null;

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Unassigned (Draft)';
    const p = projects.find(proj => proj.projectId === projectId);
    return p ? p.projectName : 'Unknown Project';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-[#03225F] text-white px-6 py-4 flex items-center justify-between border-b border-[#054AC6]/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#054AC6] text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Captured Receipt Drafts ({draftPurchases.length})
              </h2>
              <p className="text-xs text-[#7FA0D4]">
                Receipts in review, uploading, or awaiting final Phase 3 confirmation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {draftPurchases.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No active receipt drafts</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Capture new single or multi-photo receipts using Gemini AI to record contractor purchases.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCapture();
                }}
                className="mt-2 text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-4 py-2 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capture New Receipt
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {draftPurchases.map((purchase) => (
                <div
                  key={purchase.purchaseId}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {purchase.providerName || 'Unidentified Merchant'}
                      </span>
                      
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        purchase.captureStatus === 'NEEDS_REVIEW'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : purchase.captureStatus === 'PROCESSING'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {purchase.captureStatus}
                      </span>

                      {purchase.receiptPageCount > 1 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {purchase.receiptPageCount} photos
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatDate(purchase.purchaseDate)}</span>
                      <span>•</span>
                      <span>Project: <strong>{getProjectName(purchase.projectId)}</strong></span>
                      {purchase.receiptNumber && (
                        <>
                          <span>•</span>
                          <span>Receipt #{purchase.receiptNumber}</span>
                        </>
                      )}
                    </div>

                    {purchase.aiExtractedTextSummary && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {purchase.aiExtractedTextSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Extracted Total</span>
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(purchase.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenReview) {
                            onOpenReview(purchase);
                          } else {
                            onOpenCapture(purchase.purchaseId);
                          }
                        }}
                        className="text-xs bg-[#054AC6] hover:bg-[#03225F] text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review & Confirm
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm('Delete this receipt draft?')) {
                            await deleteDraftPurchase(purchase.purchaseId);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Drafts are saved securely and isolated to your company.</span>
          <button
            onClick={() => {
              onClose();
              onOpenCapture();
            }}
            className="text-xs font-bold text-[#054AC6] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Capture
          </button>
        </div>

      </div>
    </div>
  );
};
