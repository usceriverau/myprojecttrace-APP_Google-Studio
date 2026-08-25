import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { PaymentType, PaymentStatus, Project } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { LiveCameraScanner } from '../common/LiveCameraScanner';
import { paymentAnalysisService, PreparedPaymentPage } from '../../services/paymentAnalysisService';
import { storageService } from '../../services/firebase/storageService';
import { 
  Camera, Upload, X, CheckCircle2, AlertTriangle, RefreshCw, 
  Layers, ArrowRight, ArrowLeft, Shield, Eye, Trash2, Plus, 
  Sparkles, FileText, Check, AlertCircle, Info, Image as ImageIcon,
  DollarSign, Hash, Calendar, User, CreditCard, Building, Loader2
} from 'lucide-react';

interface CapturePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string | null;
  onSuccess?: () => void;
}

export const CapturePaymentModal: React.FC<CapturePaymentModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId = null,
  onSuccess,
}) => {
  const { projects, addPayment } = useProjects();
  const { currentCompany } = useAuth();

  // Multi-step workflow: 'UPLOAD_PHOTOS' -> 'PROCESSING' -> 'REVIEW_CONFIRM'
  const [step, setStep] = useState<'UPLOAD_PHOTOS' | 'PROCESSING' | 'REVIEW_CONFIRM'>('UPLOAD_PHOTOS');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Extracted and Editable Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || (projects[0]?.projectId || ''));
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Check');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('PROGRESS_PAYMENT');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('RECEIVED');
  const [notes, setNotes] = useState<string>('');

  // OCR Metadata
  const [aiConfidence, setAiConfidence] = useState<number>(0.95);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [ocrTextSummary, setOcrTextSummary] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default project when opened
  useEffect(() => {
    if (isOpen) {
      if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
        const p = projects.find(proj => proj.projectId === defaultProjectId);
        if (p?.clientName && !payerName) {
          setPayerName(p.clientName);
        }
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].projectId);
        if (projects[0]?.clientName && !payerName) {
          setPayerName(projects[0].clientName);
        }
      }
    } else {
      // Reset state on close
      setStep('UPLOAD_PHOTOS');
      setFiles([]);
      setFilePreviews([]);
      setActivePreviewIndex(0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setPayerName('');
      setPaymentMethod('Check');
      setReferenceNumber('');
      setPaymentType('PROGRESS_PAYMENT');
      setPaymentStatus('RECEIVED');
      setNotes('');
      setAiConfidence(0.95);
      setAiWarnings([]);
      setOcrTextSummary('');
      setErrorMessage(null);
      setIsSaving(false);
      setIsLiveCameraOpen(false);
    }
  }, [isOpen, defaultProjectId, projects]);

  if (!isOpen) return null;

  // Handle files selected via input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    setErrorMessage(null);
  };

  // Handle files captured via camera
  const handleCameraCapture = (cameraFiles: File[]) => {
    if (cameraFiles.length === 0) return;
    const updatedFiles = [...files, ...cameraFiles];
    setFiles(updatedFiles);

    const newPreviews = cameraFiles.map(f => URL.createObjectURL(f));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    setErrorMessage(null);
  };

  // Remove a photo
  const handleRemovePhoto = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIndex >= files.length - 1) {
      setActivePreviewIndex(Math.max(0, files.length - 2));
    }
  };

  // Run AI OCR Payment Extraction
  const handleStartOcrAnalysis = async () => {
    if (files.length === 0) {
      setErrorMessage('Please capture or upload at least one payment photo or document image.');
      return;
    }

    setStep('PROCESSING');
    setErrorMessage(null);

    try {
      const companyId = currentCompany?.companyId || 'company_demo';
      const preparedPages: PreparedPaymentPage[] = files.map((file, idx) => ({
        pageNumber: idx + 1,
        file,
        previewUrl: filePreviews[idx] || URL.createObjectURL(file),
      }));

      const res = await paymentAnalysisService.analyzePayment(companyId, preparedPages);
      const { analysis, warnings } = res;

      if (analysis.payment_date) {
        setPaymentDate(analysis.payment_date);
      }
      if (analysis.amount !== null && analysis.amount !== undefined) {
        setAmount(String(analysis.amount));
      }
      if (analysis.payer_name) {
        setPayerName(analysis.payer_name);
      } else {
        // Fallback to project client if matched
        const matchedProj = projects.find(p => p.projectId === selectedProjectId);
        if (matchedProj?.clientName) {
          setPayerName(matchedProj.clientName);
        }
      }
      if (analysis.payment_method) {
        setPaymentMethod(analysis.payment_method);
      }
      if (analysis.reference_number) {
        setReferenceNumber(analysis.reference_number);
      }
      if (analysis.payment_type_hint) {
        setPaymentType(analysis.payment_type_hint);
      }
      if (analysis.notes_summary) {
        setNotes(analysis.notes_summary);
      }

      setAiConfidence(analysis.confidence || 0.95);
      setAiWarnings(warnings || []);
      setOcrTextSummary(analysis.full_extracted_text || '');
      setStep('REVIEW_CONFIRM');
    } catch (err: any) {
      console.error('Payment OCR Error:', err);
      setErrorMessage(err.message || 'Failed to extract payment details. You can enter the information manually.');
      setStep('REVIEW_CONFIRM');
    }
  };

  // Submit and save payment
  const handleSavePayment = async () => {
    if (!selectedProjectId) {
      setErrorMessage('Please select a project for this collection.');
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than $0.');
      return;
    }

    if (!paymentDate) {
      setErrorMessage('Please enter a valid payment date.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Use preview of first image or data URL for evidenceUrl
      const primaryEvidenceUrl = filePreviews[0] || null;

      await addPayment({
        projectId: selectedProjectId,
        paymentDate,
        amount: numericAmount,
        paymentType,
        paymentMethod: paymentMethod || 'Check',
        referenceNumber: referenceNumber.trim() || null,
        evidenceUrl: primaryEvidenceUrl,
        evidenceUrls: filePreviews,
        payerName: payerName.trim() || null,
        status: paymentStatus,
        notes: notes.trim() || undefined,
        createdBy: 'user',
        aiConfidence,
        aiExtractedSummary: ocrTextSummary || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Save Payment Error:', err);
      setErrorMessage(err.message || 'Could not save payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div 
        id="capture-payment-modal-overlay"
        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <div 
          id="capture-payment-modal-container"
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#03225F] via-[#054AC6] to-[#1554C8] text-white p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-emerald-300">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2 py-0.5 rounded-full">
                    Collections & Payments
                  </span>
                  <span className="text-[10px] font-semibold text-blue-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-300" /> AI OCR Scanner
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {step === 'REVIEW_CONFIRM' ? 'Verify Extracted Payment' : 'Capture Payment Proof'}
                </h1>
              </div>
            </div>

            <button
              id="close-capture-payment-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* STEP 1: UPLOAD PHOTOS OR CAMERA */}
            {step === 'UPLOAD_PHOTOS' && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#054AC6] shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-[#03225F] block mb-0.5">
                      Targeted Payment OCR
                    </span>
                    The AI scanner focuses directly on extracting the <strong>Payment Date</strong>, <strong>Amount</strong>, and the <strong>Person / Payer who made the payment</strong> from checks, bank transfer slips, Zelle receipts, or deposit vouchers.
                  </div>
                </div>

                {/* Main Action Trays: Live Camera or File Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Camera Option */}
                  <button
                    id="payment-open-camera-btn"
                    type="button"
                    onClick={() => setIsLiveCameraOpen(true)}
                    className="p-5 rounded-2xl border-2 border-dashed border-[#054AC6]/40 hover:border-[#054AC6] bg-blue-50/40 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs hover:shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#054AC6] text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                      <Camera className="w-6 h-6 text-emerald-300" />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#054AC6]">
                      Snap Photo with Camera
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Check front & back, bank slips, or screen receipts
                    </span>
                  </button>

                  {/* File Upload Option */}
                  <button
                    id="payment-upload-files-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/70 transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs hover:shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                      <Upload className="w-6 h-6 text-blue-300" />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-slate-700">
                      Upload from Device
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Single or multiple PNG, JPG, or PDF photos
                    </span>
                  </button>

                  <input
                    ref={fileInputRef}
                    id="payment-file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Photos Grid & Thumbnails Tray */}
                {files.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#054AC6]" />
                        {files.length} {files.length === 1 ? 'Photo' : 'Photos'} Attached
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-[#054AC6] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add more
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {filePreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-4/3 rounded-xl overflow-hidden border-2 border-slate-200 group bg-slate-900"
                        >
                          <img
                            src={preview}
                            alt={`Payment proof ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                            #{idx + 1}
                          </div>
                          <button
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Pre-select Target Project */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Project to Credit:
                      </label>
                      <select
                        id="payment-project-selector"
                        value={selectedProjectId}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          const p = projects.find(proj => proj.projectId === e.target.value);
                          if (p?.clientName && !payerName) {
                            setPayerName(p.clientName);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                      >
                        {projects.map(p => (
                          <option key={p.projectId} value={p.projectId}>
                            {p.projectName} ({p.clientName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Action button: Proceed to AI Scan */}
                {files.length > 0 ? (
                  <button
                    id="start-payment-ocr-btn"
                    type="button"
                    onClick={handleStartOcrAnalysis}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    Scan Payment Proof with AI ({files.length} {files.length === 1 ? 'photo' : 'photos'})
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('REVIEW_CONFIRM')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
                    >
                      Or enter payment manually without a photo →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PROCESSING / AI OCR SPINNER */}
            {step === 'PROCESSING' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-[#054AC6]/20 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-10 h-10 text-[#054AC6] animate-spin" />
                  </div>
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Extracting Payment Data...
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Analyzing check numbers, transaction date, amount ($), and payer identification via Gemini OCR.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Multi-photo synthesis in progress
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & CONFIRM EXTRACTED DATA */}
            {step === 'REVIEW_CONFIRM' && (
              <div className="space-y-4">
                {/* AI Extraction Banner */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        AI OCR Extraction Complete
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        {Math.round(aiConfidence * 100)}% confidence • Review and verify below
                      </span>
                    </div>
                  </div>

                  {filePreviews.length > 0 && (
                    <button
                      onClick={() => setStep('UPLOAD_PHOTOS')}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                    >
                      Rescan / Change Photos
                    </button>
                  )}
                </div>

                {/* Evidence Photo Preview Strip if photos exist */}
                {filePreviews.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {filePreviews.map((p, idx) => (
                      <img
                        key={idx}
                        src={p}
                        alt={`Evidence ${idx + 1}`}
                        className="w-16 h-12 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(p, '_blank')}
                        title="Click to view full photo"
                      />
                    ))}
                  </div>
                )}

                {/* Form Fields: Focus on Date, Amount, Payer */}
                <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  {/* Row 1: Target Project */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#054AC6]" />
                      Project Credited: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="confirm-payment-project-select"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                    >
                      {projects.map(p => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.projectName} — {p.clientName} ({formatCurrency(p.contractValue + p.approvedChangeOrders)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* High Priority Row: Amount, Date, Payer (User requested core focus) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Amount */}
                    <div className="bg-white p-3 rounded-xl border-2 border-emerald-200 shadow-2xs">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        Amount Received ($): <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">$</span>
                        <input
                          id="confirm-payment-amount-input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-white rounded-lg text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                        Extracted directly from check / transaction total
                      </span>
                    </div>

                    {/* Payment Date */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#054AC6]" />
                        Payment Date: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="confirm-payment-date-input"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Date funds were issued or settled
                      </span>
                    </div>
                  </div>

                  {/* Payer / Person Who Paid */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#054AC6]" />
                      Payer / Person Who Made Payment:
                    </label>
                    <input
                      id="confirm-payment-payer-input"
                      type="text"
                      placeholder="e.g. John Doe, Sarah Jenkins, Oakwood Properties"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white rounded-lg text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Account name on check, Zelle sender, or client signatory
                    </span>
                  </div>

                  {/* Row 3: Payment Method, Reference #, Type, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Method */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Payment Method:
                      </label>
                      <select
                        id="confirm-payment-method-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                      >
                        <option value="Check">Check</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Wire Transfer">Wire Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="ACH">ACH / Direct Debit</option>
                        <option value="Cash">Cash</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Reference # */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-400" />
                        Reference / Check #:
                      </label>
                      <input
                        id="confirm-payment-reference-input"
                        type="text"
                        placeholder="e.g. Check #1042 or ZLE-99412"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                      />
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Payment Classification:
                      </label>
                      <select
                        id="confirm-payment-type-select"
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                      >
                        <option value="DEPOSIT">Initial Deposit</option>
                        <option value="PROGRESS_PAYMENT">Progress Milestone Payment</option>
                        <option value="CHANGE_ORDER_PAYMENT">Change Order Payment</option>
                        <option value="FINAL_PAYMENT">Final Payment</option>
                        <option value="OTHER">Other Payment</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Deposit Status:
                      </label>
                      <select
                        id="confirm-payment-status-select"
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                      >
                        <option value="RECEIVED">Received</option>
                        <option value="CLEARED">Cleared / Settled in Bank</option>
                        <option value="PENDING">Pending Deposit</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes / Memo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes / Memo Line:
                    </label>
                    <input
                      id="confirm-payment-notes-input"
                      type="text"
                      placeholder="e.g. Deposit for framing and tile work"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs font-medium text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                    />
                  </div>
                </div>

                {/* Final Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('UPLOAD_PHOTOS')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Back to Photos
                  </button>

                  <button
                    id="submit-payment-record-btn"
                    type="button"
                    onClick={handleSavePayment}
                    disabled={isSaving}
                    className="px-6 py-3 bg-[#054AC6] hover:bg-[#03225F] text-white font-black text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Saving Collection...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        Confirm & Record Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Camera Scanner Overlay */}
      {isLiveCameraOpen && (
        <LiveCameraScanner
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onPhotosCaptured={(cameraFiles) => {
            setIsLiveCameraOpen(false);
            handleCameraCapture(cameraFiles);
          }}
          title="Payment & Check Camera"
          subtitle="Point camera at check, transfer confirmation, or payment slip"
          targetType="RECEIPT"
          allowMultiple={true}
        />
      )}
    </>
  );
};
