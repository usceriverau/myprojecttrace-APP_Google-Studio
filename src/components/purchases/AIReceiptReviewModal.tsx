/**
 * MyProjectTrace - AI Receipt Review & Confirmation Modal (Phase 3)
 * 
 * Mobile-first, high-velocity review screen that turns AI-analyzed purchase drafts
 * into confirmed company purchases with deterministic duplicate detection,
 * provider normalization, project assignment, and receipt evidence preservation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, AlertTriangle, AlertCircle, ArrowLeft, 
  Sparkles, FileText, Image as ImageIcon, Plus, 
  Building2, Calendar, DollarSign, Tag, 
  Layers, CheckCircle2, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { Purchase, PurchaseItem, ReceiptPage, Project, Provider, DuplicatePurchaseCandidate } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { findSuggestedProvider } from '../../services/providerService';
import { ConfirmPurchasePayload } from '../../services/purchaseConfirmationService';
import { formatCurrency, formatDate } from '../../lib/utils';

interface AIReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSuccessCaptureAnother?: () => void;
  initialProjectId?: string | null;
}

export const AIReceiptReviewModal: React.FC<AIReceiptReviewModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSuccessCaptureAnother,
  initialProjectId,
}) => {
  const { currentCompany, currentUser } = useAuth();
  const { 
    projects, 
    providers, 
    addCompanyProvider,
    confirmPurchaseDraft, 
    getPurchaseReceiptPages, 
    getPurchaseItems,
    checkPurchaseDuplicates,
    retryReceiptAnalysis,
  } = useProjects();

  // Form editable states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isCustomProvider, setIsCustomProvider] = useState<boolean>(false);
  const [customProviderName, setCustomProviderName] = useState<string>('');
  
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [subtotal, setSubtotal] = useState<string>('');
  const [tax, setTax] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // Mode and view toggles
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState<boolean>(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());

  // Workflow states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRetryingOcr, setIsRetryingOcr] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Duplicate detection modal state
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicatePurchaseCandidate[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [viewingExistingPurchase, setViewingExistingPurchase] = useState<Purchase | null>(null);
  
  // Success state
  const [confirmedPurchase, setConfirmedPurchase] = useState<Purchase | null>(null);
  const [isSuccessView, setIsSuccessView] = useState<boolean>(false);

  // Associated receipt pages and line items
  const pages: ReceiptPage[] = useMemo(() => {
    if (!purchase) return [];
    return getPurchaseReceiptPages(purchase.purchaseId);
  }, [purchase, getPurchaseReceiptPages]);

  const items: PurchaseItem[] = useMemo(() => {
    if (!purchase) return [];
    return getPurchaseItems(purchase.purchaseId);
  }, [purchase, getPurchaseItems]);

  // Active company projects only
  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status === 'ACTIVE' || p.projectId === purchase?.projectId);
  }, [projects, purchase]);

  // Sync state whenever target purchase changes
  useEffect(() => {
    if (purchase) {
      const initProjId = purchase.projectId || initialProjectId || (projects.length === 1 ? projects[0].projectId : '');
      setSelectedProjectId(initProjId || '');
      
      const rawMerchant = purchase.providerName || '';
      setProviderName(rawMerchant);
      
      // Auto-match provider
      const match = findSuggestedProvider(rawMerchant, providers);
      if (match.matchedProvider) {
        setSelectedProviderId(match.matchedProvider.providerId);
        setIsCustomProvider(false);
      } else {
        setSelectedProviderId('');
        setIsCustomProvider(false);
      }
      
      setPurchaseDate(purchase.purchaseDate || new Date().toISOString().split('T')[0]);
      setSubtotal(purchase.subtotal !== null && purchase.subtotal !== undefined ? purchase.subtotal.toString() : '');
      setTax(purchase.tax !== null && purchase.tax !== undefined ? purchase.tax.toString() : '');
      setTotalAmount(purchase.totalAmount !== null && purchase.totalAmount !== undefined ? purchase.totalAmount.toString() : '');
      setReceiptNumber(purchase.receiptNumber || '');
      setPaymentMethod(purchase.paymentMethod || '');
      
      setIsEditMode(false);
      setShowReceiptDetails(false);
      setUserEditedFields(new Set());
      setErrorMessage(null);
      setValidationErrors([]);
      setDuplicateCandidates([]);
      setShowDuplicateModal(false);
      setIsSuccessView(false);
      setConfirmedPurchase(null);
      setActivePhotoIndex(0);
    }
  }, [purchase, initialProjectId, projects, providers]);

  if (!isOpen || !purchase) return null;

  const aiConfidence = purchase.aiConfidence ?? 0.85;
  const isHighConfidence = aiConfidence >= 0.88;
  const isLowConfidence = aiConfidence < 0.70;

  // Mark field as edited by user
  const trackEdit = (fieldName: string) => {
    setUserEditedFields(prev => new Set(prev).add(fieldName));
  };

  // Provider Selection Handler
  const handleProviderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    trackEdit('providerName');
    if (val === 'CUSTOM_NEW') {
      setIsCustomProvider(true);
      setSelectedProviderId('');
      setCustomProviderName('');
    } else if (val === '') {
      setIsCustomProvider(false);
      setSelectedProviderId('');
      setProviderName('');
    } else {
      setIsCustomProvider(false);
      setSelectedProviderId(val);
      const prov = providers.find(p => p.providerId === val);
      if (prov) {
        setProviderName(prov.providerName);
      }
    }
  };

  // Execute Confirmation logic
  const handleConfirmPurchase = async (ignoreDuplicateWarning: boolean = false) => {
    setValidationErrors([]);
    setErrorMessage(null);

    const effectiveTotal = parseFloat(totalAmount);
    const effectiveSubtotal = subtotal ? parseFloat(subtotal) : null;
    const effectiveTax = tax ? parseFloat(tax) : null;
    const effectiveProviderName = isCustomProvider 
      ? customProviderName.trim() 
      : providerName.trim();

    // Client-side quick validation
    const errors: string[] = [];
    if (!selectedProjectId) {
      errors.push('Please select an active project.');
    }
    if (!effectiveProviderName) {
      errors.push('Merchant / Provider name is required.');
    }
    if (!purchaseDate) {
      errors.push('Transaction date is required.');
    }
    if (isNaN(effectiveTotal) || effectiveTotal <= 0) {
      errors.push('Total amount must be greater than $0.00.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Deterministic Duplicate Check
    if (!ignoreDuplicateWarning) {
      const candidates = checkPurchaseDuplicates({
        purchaseId: purchase.purchaseId,
        companyId: currentCompany.companyId,
        providerName: effectiveProviderName,
        purchaseDate,
        totalAmount: effectiveTotal,
        receiptNumber: receiptNumber || null,
      });

      if (candidates.length > 0) {
        setDuplicateCandidates(candidates);
        setShowDuplicateModal(true);
        return;
      }
    }

    setIsSaving(true);

    try {
      // If user created a new custom provider, register it
      let finalProviderId = selectedProviderId || null;
      if (isCustomProvider && effectiveProviderName) {
        const createdProv = await addCompanyProvider(effectiveProviderName);
        finalProviderId = createdProv.providerId;
      }

      const payload: ConfirmPurchasePayload = {
        purchaseId: purchase.purchaseId,
        companyId: currentCompany.companyId,
        projectId: selectedProjectId,
        providerId: finalProviderId,
        providerName: effectiveProviderName,
        purchaseDate,
        subtotal: effectiveSubtotal,
        tax: effectiveTax,
        totalAmount: effectiveTotal,
        receiptNumber: receiptNumber || null,
        paymentMethod: paymentMethod || null,
        duplicateWarningAcknowledged: ignoreDuplicateWarning,
        userEditedFields: Array.from(userEditedFields),
      };

      const result = await confirmPurchaseDraft(payload);
      setConfirmedPurchase(result);
      setIsSuccessView(true);
      setShowDuplicateModal(false);
    } catch (err: any) {
      console.error('[AI Receipt Review] Confirmation error:', err);
      setErrorMessage(
        err.message || "We couldn't confirm this purchase. Your receipt is still saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Retry Gemini OCR
  const handleRetryAnalysis = async () => {
    setIsRetryingOcr(true);
    setErrorMessage(null);
    try {
      await retryReceiptAnalysis(purchase.purchaseId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-analyze receipt.');
    } finally {
      setIsRetryingOcr(false);
    }
  };

  const assignedProject = projects.find(p => p.projectId === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-[#03225F] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#054AC6]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#054AC6] text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {isSuccessView ? 'Purchase Confirmed' : 'AI Receipt Review'}
                </h2>
                <span className="text-[10px] bg-[#054AC6] text-[#7FA0D4] font-bold px-2 py-0.5 rounded-full border border-[#7FA0D4]/30">
                  Phase 3
                </span>
              </div>
              <p className="text-xs text-[#7FA0D4] font-medium">
                {isSuccessView
                  ? 'Purchase has been confirmed and ledgered to the project.'
                  : 'Review AI extraction, assign project, and confirm transaction total.'}
              </p>
            </div>
          </div>

          <button
            id="close-review-modal-btn"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* ========================================================================= */}
          {/* SUCCESS SCREEN */}
          {/* ========================================================================= */}
          {isSuccessView && confirmedPurchase && (
            <div className="py-8 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  PURCHASE SAVED
                </h3>
                <p className="text-xs text-slate-500">
                  Receipt evidence and line items have been confirmed.
                </p>
              </div>

              {/* Confirmation Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Merchant</span>
                  <span className="text-sm font-bold text-slate-900">{confirmedPurchase.providerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Project</span>
                  <span className="text-sm font-bold text-[#054AC6]">
                    {projects.find(p => p.projectId === confirmedPurchase.projectId)?.projectName || 'Assigned Project'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Transaction Date</span>
                  <span className="text-xs font-bold text-slate-800">{formatDate(confirmedPurchase.purchaseDate)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Receipt Evidence</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {pages.length} Page{pages.length === 1 ? '' : 's'} Saved
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-slate-900">Total Charged</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatCurrency(confirmedPurchase.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Success Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  id="review-success-done-btn"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#03225F] hover:bg-[#054AC6] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
                {onSuccessCaptureAnother && (
                  <button
                    id="capture-another-btn"
                    onClick={() => {
                      onClose();
                      onSuccessCaptureAnother();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white border border-[#054AC6] text-[#054AC6] hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Capture Another Purchase
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MAIN REVIEW INTERFACE (When not success view) */}
          {/* ========================================================================= */}
          {!isSuccessView && (
            <>
              {/* ERROR NOTICES */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-sm">Purchase Notice</span>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Please complete required fields:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1 font-medium">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CONFIDENCE & AI STATUS BAR */}
              <div className="bg-[#03225F] text-white rounded-2xl p-4 sm:p-5 border border-[#054AC6]/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl text-white font-bold text-xs ${
                    isHighConfidence ? 'bg-emerald-500' : isLowConfidence ? 'bg-rose-500' : 'bg-amber-500'
                  }`}>
                    {Math.round(aiConfidence * 100)}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {isHighConfidence ? 'High-Confidence OCR Extraction' : 'Review Recommended'}
                      </span>
                      <span className="text-[10px] bg-white/10 text-white font-medium px-2 py-0.5 rounded-full">
                        {pages.length} Photo{pages.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-xs text-[#7FA0D4]">
                      {isHighConfidence 
                        ? 'Data extracted with high certainty. Verify project assignment.'
                        : 'Some fields require contractor verification.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="retry-ocr-btn"
                    onClick={handleRetryAnalysis}
                    disabled={isRetryingOcr || isSaving}
                    className="text-xs bg-[#054AC6] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetryingOcr ? 'animate-spin' : ''}`} />
                    Re-Analyze OCR
                  </button>

                  <button
                    id="toggle-edit-mode-btn"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                      isEditMode
                        ? 'bg-amber-400 text-slate-900 border-amber-300'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    {isEditMode ? 'Done Editing' : 'Edit Fields'}
                  </button>
                </div>
              </div>

              {/* OVERLAP / AI OBSERVATIONS */}
              {purchase.aiWarnings && purchase.aiWarnings.length > 0 && (
                <div className="space-y-1.5">
                  {purchase.aiWarnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">AI Observation / Overlap Check: </span>
                        <span>{w}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===================================================================== */}
              {/* PRIMARY REVIEW FORM & HIGH-VELOCITY CARDS */}
              {/* ===================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT/TOP: CORE PURCHASE FIELDS */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* 1. PROJECT ASSIGNMENT (MANDATORY) */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    !selectedProjectId
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300/30'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="review-project-select" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#054AC6]" />
                        Assign to Project <span className="text-rose-500">*</span>
                      </label>
                      {!selectedProjectId && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>

                    <select
                      id="review-project-select"
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        trackEdit('projectId');
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent cursor-pointer shadow-xs"
                    >
                      <option value="">-- Select Active Project --</option>
                      {activeProjects.map(proj => (
                        <option key={proj.projectId} value={proj.projectId}>
                          {proj.projectName} ({proj.clientName})
                        </option>
                      ))}
                    </select>

                    {assignedProject && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200">
                        <span className="truncate">Client: <strong className="text-slate-800">{assignedProject.clientName}</strong></span>
                        <span className="shrink-0 text-[#054AC6] font-semibold">Contract: {formatCurrency(assignedProject.contractValue)}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. MERCHANT / PROVIDER MATCHING */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-[#054AC6]" />
                        Merchant / Provider <span className="text-rose-500">*</span>
                      </label>
                      {selectedProviderId && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Matched Company Provider
                        </span>
                      )}
                    </div>

                    {!isCustomProvider ? (
                      <div className="space-y-2">
                        <select
                          id="review-provider-select"
                          value={selectedProviderId || ''}
                          onChange={handleProviderSelect}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent cursor-pointer shadow-xs"
                        >
                          <option value="">{providerName ? `Use Extracted: "${providerName}"` : '-- Choose Provider --'}</option>
                          {providers.map(p => (
                            <option key={p.providerId} value={p.providerId}>
                              {p.providerName} ({p.category || 'Supplier'})
                            </option>
                          ))}
                          <option value="CUSTOM_NEW">+ Add New Provider...</option>
                        </select>

                        {/* If extracted name is shown and differing from matched provider */}
                        {providerName && (
                          <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                            <span>Extracted from receipt: <strong className="text-slate-700">{providerName}</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomProvider(true);
                                setCustomProviderName(providerName);
                              }}
                              className="text-[#054AC6] hover:underline font-bold text-[10px] cursor-pointer"
                            >
                              Edit Name
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            id="custom-provider-input"
                            type="text"
                            value={customProviderName}
                            onChange={(e) => {
                              setCustomProviderName(e.target.value);
                              trackEdit('providerName');
                            }}
                            placeholder="Enter merchant or supplier name..."
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6]"
                          />
                          <button
                            type="button"
                            onClick={() => setIsCustomProvider(false)}
                            className="text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-2 rounded-xl font-bold cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          This provider will be saved to your company directory for future receipt auto-matching.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 3. TRANSACTION DATE & TOTAL AMOUNT (HIGH CONTRAST) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Date Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <label htmlFor="review-date-input" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#054AC6]" />
                        Transaction Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="review-date-input"
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => {
                          setPurchaseDate(e.target.value);
                          trackEdit('purchaseDate');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] shadow-xs"
                      />
                    </div>

                    {/* Total Amount Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-1 shadow-md">
                      <div className="flex justify-between items-center">
                        <label htmlFor="review-total-input" className="text-xs font-bold text-[#7FA0D4] flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          Authority Total <span className="text-rose-400">*</span>
                        </label>
                        {userEditedFields.has('totalAmount') && (
                          <span className="text-[9px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-sm">
                            Edited
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center">
                        <span className="text-lg font-bold text-slate-400 absolute left-3">$</span>
                        <input
                          id="review-total-input"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={totalAmount}
                          onChange={(e) => {
                            setTotalAmount(e.target.value);
                            trackEdit('totalAmount');
                          }}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-base font-black text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>

                  </div>

                  {/* 4. OPTIONAL FINANCIAL BREAKDOWN / EDITABLE FIELDS */}
                  {isEditMode && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3 animate-in fade-in duration-150">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-600" />
                        Detailed Financial Breakdown & Metadata
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Subtotal ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={subtotal}
                            onChange={(e) => {
                              setSubtotal(e.target.value);
                              trackEdit('subtotal');
                            }}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Tax ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tax}
                            onChange={(e) => {
                              setTax(e.target.value);
                              trackEdit('tax');
                            }}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Receipt #</label>
                          <input
                            type="text"
                            value={receiptNumber}
                            onChange={(e) => {
                              setReceiptNumber(e.target.value);
                              trackEdit('receiptNumber');
                            }}
                            placeholder="REC-1234"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Payment Method</label>
                          <input
                            type="text"
                            value={paymentMethod}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value);
                              trackEdit('paymentMethod');
                            }}
                            placeholder="e.g. Visa 4891"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUMMARY BADGES */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#054AC6]" />
                      {pages.length} Receipt Image{pages.length === 1 ? '' : 's'}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#054AC6]" />
                      {items.length} Extracted Line Item{items.length === 1 ? '' : 's'}
                    </span>
                    {receiptNumber && (
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                        Ref: #{receiptNumber}
                      </span>
                    )}
                  </div>

                </div>

                {/* RIGHT/BOTTOM: RECEIPT EVIDENCE PREVIEW & LINE ITEMS SUMMARY */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Photo Preview Container */}
                  <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-md flex flex-col">
                    <div className="p-3 bg-slate-950 text-white flex items-center justify-between text-xs font-bold border-b border-slate-800">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ImageIcon className="w-3.5 h-3.5 text-[#7FA0D4]" />
                        Receipt Evidence Photo
                      </span>
                      {pages.length > 1 && (
                        <span className="text-[10px] bg-[#054AC6] px-2 py-0.5 rounded-full text-white font-bold">
                          Page {activePhotoIndex + 1} of {pages.length}
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-4/5 bg-black flex items-center justify-center overflow-hidden">
                      {pages.length > 0 && pages[activePhotoIndex]?.imageUrl ? (
                        <img
                          src={pages[activePhotoIndex].imageUrl}
                          alt={`Receipt photo ${activePhotoIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="p-6 text-center text-slate-500 space-y-2">
                          <ImageIcon className="w-10 h-10 mx-auto opacity-40" />
                          <p className="text-xs">No image preview available</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail pagination if multi-page */}
                    {pages.length > 1 && (
                      <div className="p-2 bg-slate-950 flex items-center gap-1.5 overflow-x-auto">
                        {pages.map((p, idx) => (
                          <button
                            key={p.receiptPageId || idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`relative shrink-0 w-12 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              activePhotoIndex === idx
                                ? 'border-[#054AC6] ring-1 ring-white'
                                : 'border-slate-700 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={p.imageUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center">
                              P{idx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Button to expand full line items and specifications drawer */}
                  <button
                    id="view-receipt-details-btn"
                    type="button"
                    onClick={() => setShowReceiptDetails(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#054AC6]" />
                      View Line Items & Technical Specs ({items.length})
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                </div>

              </div>
            </>
          )}

        </div>

        {/* MODAL FOOTER & ACTION BAR */}
        {!isSuccessView && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            
            <div>
              <button
                id="cancel-review-btn"
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel / Keep Draft
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="confirm-purchase-main-btn"
                type="button"
                disabled={isSaving || isRetryingOcr}
                onClick={() => handleConfirmPurchase(false)}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSaving || isRetryingOcr
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-[#054AC6] hover:bg-[#03225F] shadow-blue-900/20 active:scale-98'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving purchase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>CONFIRM PURCHASE</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* FULL LINE ITEMS & TECHNICAL SPECIFICATIONS MODAL / DRAWER */}
      {/* ========================================================================= */}
      {showReceiptDetails && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            
            <div className="bg-[#03225F] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#054AC6]/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7FA0D4]" />
                <h3 className="text-sm font-bold text-white">Extracted Line Items & Specs</h3>
              </div>
              <button
                onClick={() => setShowReceiptDetails(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No line items were extracted. Transaction authority total is recorded.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  {items.map((item, idx) => (
                    <div key={item.itemId || idx} className="p-3.5 space-y-2 bg-white hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{item.description}</span>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {item.sku && <span>SKU: <strong className="text-slate-700">{item.sku}</strong></span>}
                            {item.brand && <span>Brand: <strong className="text-slate-700">{item.brand}</strong></span>}
                            {item.category && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-sm">{item.category}</span>}
                            {item.sourcePageNumbers && item.sourcePageNumbers.length > 0 && (
                              <span className="text-[#054AC6] font-semibold">Page {item.sourcePageNumbers.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900">
                            {formatCurrency(item.lineTotal || (item.quantity * item.unitPrice))}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {item.quantity} {item.unit || 'unit'} @ {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Technical Specifications if any */}
                      {item.additionalSpecifications && item.additionalSpecifications.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-2 text-[10px] grid grid-cols-2 gap-1 border border-slate-200">
                          {item.additionalSpecifications.map((spec, sIdx) => (
                            <div key={sIdx} className="truncate">
                              <span className="text-slate-500">{spec.name}: </span>
                              <strong className="text-slate-800">{spec.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Raw OCR Text Summary */}
              {purchase.aiExtractedTextSummary && (
                <div className="p-3 bg-slate-100 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-slate-700 block">AI Extracted Text Summary:</span>
                  <p className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap">
                    {purchase.aiExtractedTextSummary}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowReceiptDetails(false)}
                className="text-xs font-bold bg-[#03225F] hover:bg-[#054AC6] text-white px-4 py-2 rounded-xl cursor-pointer"
              >
                Done Reviewing Specs
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETERMINISTIC DUPLICATE WARNING MODAL */}
      {/* ========================================================================= */}
      {showDuplicateModal && duplicateCandidates.length > 0 && (
        <div className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-amber-300">
            
            {/* Header */}
            <div className="bg-amber-600 text-white p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 text-white">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  POSSIBLE DUPLICATE PURCHASE
                </h3>
                <p className="text-xs text-amber-100">
                  {duplicateCandidates.length} existing purchase{duplicateCandidates.length > 1 ? 's match' : ' matches'} this receipt's parameters.
                </p>
              </div>
            </div>

            {/* Candidates List */}
            <div className="p-4 sm:p-5 space-y-3 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-slate-600">
                A similar purchase is already recorded in your company ledger. Please review to avoid double-charging:
              </p>

              {duplicateCandidates.map((cand, idx) => {
                const existing = cand.existingPurchase;
                const existingProj = projects.find(p => p.projectId === existing.projectId);

                return (
                  <div
                    key={existing.purchaseId || idx}
                    className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">
                          {existing.providerName || 'Unknown Merchant'}
                        </span>
                        <span className="text-xs font-semibold text-[#054AC6]">
                          Project: {existingProj?.projectName || 'Unassigned'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          {formatCurrency(existing.totalAmount)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(existing.purchaseDate)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-amber-200 flex items-center justify-between text-[11px]">
                      <span className="text-amber-900 font-medium">
                        Match reason: <strong>{cand.reason}</strong>
                      </span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-sm text-[9px] ${
                        cand.matchLevel === 'EXACT' ? 'bg-rose-600 text-white' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {cand.matchLevel} ({cand.matchScore}%)
                      </span>
                    </div>

                    {existing.receiptNumber && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Receipt #: {existing.receiptNumber}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions: Review Existing, Save Anyway, Cancel */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl cursor-pointer"
              >
                Return to Review
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleConfirmPurchase(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  SAVE ANYWAY
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
