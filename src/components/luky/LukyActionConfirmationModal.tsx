import React, { useState } from 'react';
import { LukyProposedAction, Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, AlertCircle, Check, X, DollarSign, 
  FileText, Calendar, Tag, Building 
} from 'lucide-react';

interface LukyActionConfirmationModalProps {
  action: LukyProposedAction;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const LukyActionConfirmationModal: React.FC<LukyActionConfirmationModalProps> = ({
  action,
  projects,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addPayment, addProjectNote, updateProject } = useProjects();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states initialized with Luky's proposed values
  const payload = action.payload || {};
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    payload.projectId || (projects[0]?.projectId ?? '')
  );
  const [amount, setAmount] = useState<string>(
    payload.amount ? String(payload.amount) : ''
  );
  const [paymentType, setPaymentType] = useState<string>(
    payload.paymentType || 'PROGRESS'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    payload.paymentMethod || 'ACH'
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    payload.paymentDate || new Date().toISOString().split('T')[0]
  );
  const [noteTitle, setNoteTitle] = useState<string>(
    payload.noteTitle || 'Financial Note'
  );
  const [noteContent, setNoteContent] = useState<string>(
    payload.noteContent || ''
  );
  const [noteCategory, setNoteCategory] = useState<any>(
    payload.noteCategory || 'GENERAL'
  );
  const [projectStatus, setProjectStatus] = useState<any>(
    payload.projectStatus || 'ACTIVE'
  );

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.projectId === selectedProjectId);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (action.type === 'RECORD_PAYMENT') {
        if (!selectedProjectId) {
          throw new Error('Please select a project for this payment.');
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error('Please specify a valid payment amount.');
        }

        await addPayment({
          projectId: selectedProjectId,
          amount: numAmount,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentType: paymentType as any,
          paymentMethod: paymentMethod as any,
          status: 'RECEIVED',
          notes: `Recorded via Luky Assistant. ${payload.explanation || ''}`.trim(),
          createdBy: currentUser.name,
        });

        onSuccess(`Recorded $${numAmount.toLocaleString()} payment for ${targetProject?.projectName || 'project'}.`);
        onClose();
      } else if (action.type === 'ADD_PROJECT_NOTE') {
        if (!selectedProjectId) {
          throw new Error('Please select a project for this note.');
        }
        if (!noteTitle.trim()) {
          throw new Error('Note title is required.');
        }

        await addProjectNote(selectedProjectId, {
          projectId: selectedProjectId,
          title: noteTitle.trim(),
          content: noteContent.trim(),
          category: noteCategory,
          isPinned: false,
          createdBy: currentUser.name,
        });

        onSuccess(`Added note "${noteTitle}" to ${targetProject?.projectName || 'project'}.`);
        onClose();
      } else if (action.type === 'SET_PROJECT_STATUS') {
        if (!selectedProjectId) {
          throw new Error('Please select a project.');
        }

        await updateProject(selectedProjectId, {
          status: projectStatus,
        });

        onSuccess(`Updated status of ${targetProject?.projectName} to ${projectStatus}.`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute proposed operation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#03225F] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#054AC6] flex items-center justify-center border border-[#7FA0D4]/30">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {action.title || 'Luky Action Confirmation'}
              </h3>
              <p className="text-[11px] text-[#7FA0D4]">
                Review and approve financial modification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {action.explanation && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#054AC6] shrink-0 mt-0.5" />
              <span>{action.explanation}</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName} ({p.clientName})
                </option>
              ))}
            </select>
          </div>

          {/* Action-Specific Form Fields */}
          {action.type === 'RECORD_PAYMENT' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-bold pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                  >
                    <option value="DEPOSIT">Initial Deposit</option>
                    <option value="PROGRESS">Progress Draw</option>
                    <option value="CHANGE_ORDER">Change Order</option>
                    <option value="FINAL">Final Balance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                  >
                    <option value="CHECK">Check</option>
                    <option value="ACH">ACH Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="WIRE">Wire Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="ZELLE">Zelle / Venmo</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {action.type === 'ADD_PROJECT_NOTE' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Paint Color Spec, Scope Revision"
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note Category
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                >
                  <option value="GENERAL">General Log</option>
                  <option value="SPECIFICATION">Spec / Color Codes</option>
                  <option value="CHANGE_ORDER">Change Order Record</option>
                  <option value="MATERIAL">Material & Supply</option>
                  <option value="INSPECTION">Inspection / Punchlist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note Content
                </label>
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter details..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                />
              </div>
            </>
          )}

          {action.type === 'SET_PROJECT_STATUS' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Project Status
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold bg-[#054AC6] hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
