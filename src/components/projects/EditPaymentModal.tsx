import React, { useState, useEffect, useRef } from 'react';
import { Payment, PaymentType, PaymentStatus } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/firebase/storageService';
import { 
  X, DollarSign, Calendar, User, CreditCard, Hash, FileText, 
  Trash2, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, 
  Upload, Plus, ExternalLink, RefreshCw
} from 'lucide-react';

interface EditPaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedPayment: Payment) => void;
  onDeleted?: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const { projects, updatePayment, deletePayment } = useProjects();
  const { currentCompany } = useAuth();

  const [projectId, setProjectId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Check');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('PROGRESS_PAYMENT');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('RECEIVED');
  const [notes, setNotes] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when payment changes or modal opens
  useEffect(() => {
    if (payment && isOpen) {
      setProjectId(payment.projectId || (projects[0]?.projectId || ''));
      setAmount(String(payment.amount || ''));
      setPaymentDate(payment.paymentDate || new Date().toISOString().split('T')[0]);
      setPayerName(payment.payerName || '');
      setPaymentMethod(payment.paymentMethod || 'Check');
      setReferenceNumber(payment.referenceNumber || '');
      setPaymentType(payment.paymentType || 'PROGRESS_PAYMENT');
      setPaymentStatus(payment.status || 'RECEIVED');
      setNotes(payment.notes || '');
      setEvidenceUrls(payment.evidenceUrls || (payment.evidenceUrl ? [payment.evidenceUrl] : []));
      setNewFiles([]);
      setNewFilePreviews([]);
      setIsSaving(false);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [payment, isOpen, projects]);

  if (!isOpen || !payment) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files);
    setNewFiles(prev => [...prev, ...selected]);
    const previews = selected.map(f => URL.createObjectURL(f));
    setNewFilePreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveExistingEvidence = (indexToRemove: number) => {
    setEvidenceUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setNewFilePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAutofillClientName = () => {
    const proj = projects.find(p => p.projectId === projectId);
    if (proj?.clientName) {
      setPayerName(proj.clientName);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than $0.');
      return;
    }
    if (!paymentDate) {
      setErrorMessage('Please enter a valid payment date.');
      return;
    }
    if (!projectId) {
      setErrorMessage('Please select a project.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Upload any newly added evidence files
      let finalEvidenceUrls = [...evidenceUrls];
      if (newFiles.length > 0) {
        const companyId = currentCompany?.companyId || payment.companyId || 'company_default';
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          const uploadRes = await storageService.uploadReceiptPageImage(
            companyId,
            payment.paymentId,
            finalEvidenceUrls.length + 1,
            file
          );
          if (uploadRes.imageUrl) {
            finalEvidenceUrls.push(uploadRes.imageUrl);
          }
        }
      }

      // 2. Perform payment update in context and database
      const updatedData: Partial<Payment> = {
        projectId,
        amount: parsedAmount,
        paymentDate,
        payerName: payerName.trim() || null,
        paymentMethod: paymentMethod.trim() || 'Check',
        referenceNumber: referenceNumber.trim() || null,
        paymentType,
        status: paymentStatus,
        notes: notes.trim() || undefined,
        evidenceUrls: finalEvidenceUrls,
        evidenceUrl: finalEvidenceUrls[0] || null,
      };

      const result = await updatePayment(payment.paymentId, updatedData);

      setSuccessMessage('Payment record updated successfully.');
      setTimeout(() => {
        onClose();
        if (onUpdated) onUpdated(result);
      }, 500);
    } catch (err: any) {
      console.error('[MyProjectTrace] Error updating payment:', err);
      setErrorMessage(err.message || 'Failed to update payment record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deletePayment(payment.paymentId);
      setSuccessMessage('Payment record deleted.');
      setTimeout(() => {
        onClose();
        if (onDeleted) onDeleted();
      }, 400);
    } catch (err: any) {
      console.error('[MyProjectTrace] Error deleting payment:', err);
      setErrorMessage(err.message || 'Failed to delete payment record. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="edit-payment-modal-overlay" 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="edit-payment-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Edit Customer Payment</h2>
              <p className="text-xs text-slate-500 font-medium">Update amounts, dates, payer details, or replace proof records</p>
            </div>
          </div>
          <button
            id="close-edit-payment-modal-btn"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Alerts & Feedback */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Project Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Project <span className="text-rose-500">*</span>
            </label>
            <select
              id="edit-payment-project-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName} {p.clientName ? `• ${p.clientName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Core Payment Fields: Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Amount (USD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  id="edit-payment-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-payment-date-input"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payer / Customer Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payer / Client Name
              </label>
              <button
                type="button"
                onClick={handleAutofillClientName}
                className="text-[11px] font-bold text-[#054AC6] hover:underline cursor-pointer flex items-center gap-1"
              >
                <User className="w-3 h-3" />
                Use Project Client Name
              </button>
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-payment-payer-input"
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. John & Sarah Smith / Acme Enterprises"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Payment Method & Reference / Check # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                id="edit-payment-method-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
              >
                <option value="Check">Check</option>
                <option value="Zelle">Zelle</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="ACH">ACH Direct Deposit</option>
                <option value="Cash">Cash</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Venmo">Venmo</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference # / Check #
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-payment-reference-input"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. Check #1042 / Trx #88412"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Type
              </label>
              <select
                id="edit-payment-type-select"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
              >
                <option value="DEPOSIT">Initial Deposit</option>
                <option value="PROGRESS_PAYMENT">Progress Milestone Payment</option>
                <option value="FINAL_PAYMENT">Final Contract Payment</option>
                <option value="CHANGE_ORDER_PAYMENT">Change Order Payment</option>
                <option value="RETAINAGE_RELEASE">Retainage Release</option>
                <option value="OTHER">Other / Misc Collection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clearance Status
              </label>
              <select
                id="edit-payment-status-select"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all"
              >
                <option value="RECEIVED">Received (In Hand / Pending Clearance)</option>
                <option value="CLEARED">Cleared / Deposited in Bank</option>
                <option value="PENDING">Pending Client Execution</option>
                <option value="FAILED">Failed / Bounced / Returned</option>
              </select>
            </div>
          </div>

          {/* Memo & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes & Memo
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                id="edit-payment-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Deposit for framing and rough plumbing phase"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Evidence Photos Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                Proof Images & Documents ({evidenceUrls.length + newFiles.length})
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#054AC6] hover:text-[#03225F] flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Image
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Existing and New Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Existing uploaded URLs */}
              {evidenceUrls.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-24">
                  <img
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-white/90 text-slate-700 rounded-lg hover:bg-white transition-colors"
                      title="View Full Image"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingEvidence(idx)}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Newly selected files */}
              {newFilePreviews.map((previewUrl, idx) => (
                <div key={`new-${idx}`} className="relative group rounded-xl border-2 border-emerald-400 overflow-hidden bg-slate-100 h-24">
                  <img
                    src={previewUrl}
                    alt={`New Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    NEW
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Upload trigger card */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 border-2 border-dashed border-slate-300 hover:border-[#054AC6] rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-[#054AC6] hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-bold">Upload File</span>
              </button>
            </div>
          </div>

          {/* Delete Danger Section */}
          <div className="pt-4 border-t border-slate-100">
            {!isConfirmingDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700">Delete Payment Record</p>
                  <p className="text-[11px] text-slate-400">Permanently delete this payment if created by mistake.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Payment
                </button>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                <p className="text-xs font-bold text-rose-900">Are you sure you want to delete this payment record?</p>
                <p className="text-[11px] text-rose-700">This action will remove the ${payment.amount.toLocaleString()} collection from project metrics permanently.</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Confirm Permanent Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="save-edited-payment-btn"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
