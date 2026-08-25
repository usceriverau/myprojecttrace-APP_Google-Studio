import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Purchase, PurchaseItem, ReceiptPage, CaptureStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { LiveCameraScanner } from '../common/LiveCameraScanner';
import { 
  Camera, Upload, X, CheckCircle2, AlertTriangle, RefreshCw, 
  Layers, ArrowRight, ArrowLeft, Shield, Eye, Trash2, Plus, 
  Sparkles, FileText, Check, AlertCircle, Info, Image as ImageIcon,
  DollarSign, Hash, Calendar, Store, Tag
} from 'lucide-react';

interface CapturePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string | null;
  existingPurchaseId?: string | null;
  onOpenReview?: (purchase: Purchase) => void;
}

export const CapturePurchaseModal: React.FC<CapturePurchaseModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId = null,
  existingPurchaseId = null,
  onOpenReview,
}) => {
  const {
    projects,
    createDraftPurchase,
    processReceiptCapture,
    retryReceiptAnalysis,
    getPurchaseById,
    getPurchaseReceiptPages,
    getPurchaseItems,
    deleteDraftPurchase,
  } = useProjects();

  const { isOwnerOrAdmin, currentCompany } = useAuth();

  // State machine
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(defaultProjectId);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [extractedItems, setExtractedItems] = useState<PurchaseItem[]>([]);
  const [extractedPages, setExtractedPages] = useState<ReceiptPage[]>([]);
  
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('DRAFT');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or load existing draft
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setFiles([]);
      setFilePreviews([]);
      setCurrentPurchase(null);
      setExtractedItems([]);
      setExtractedPages([]);
      setCaptureStatus('DRAFT');
      setStatusMessage('');
      setErrorMessage(null);
      setIsProcessing(false);
      setIsLiveCameraOpen(false);
      return;
    }

    if (existingPurchaseId) {
      const p = getPurchaseById(existingPurchaseId);
      if (p) {
        setCurrentPurchase(p);
        setSelectedProjectId(p.projectId || defaultProjectId);
        setCaptureStatus(p.captureStatus);
        const pages = getPurchaseReceiptPages(p.purchaseId);
        const items = getPurchaseItems(p.purchaseId);
        setExtractedPages(pages);
        setExtractedItems(items);
        if (pages.length > 0) {
          setFilePreviews(pages.map(page => page.imageUrl));
        }
      }
    } else {
      setSelectedProjectId(defaultProjectId);
      setCaptureStatus('DRAFT');
    }
  }, [isOpen, existingPurchaseId, defaultProjectId]);

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles: File[] = Array.from(e.target.files);
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    const newPreviews = newFiles.map((file: File) => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    setErrorMessage(null);
  };

  // Handle Photos Snapped Directly via Live Camera
  const handlePhotosFromCamera = (cameraFiles: File[]) => {
    if (cameraFiles.length === 0) return;
    const updatedFiles = [...files, ...cameraFiles];
    setFiles(updatedFiles);

    const newPreviews = cameraFiles.map((file: File) => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    setErrorMessage(null);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = filePreviews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setFilePreviews(updatedPreviews);
    if (activePhotoIndex >= updatedFiles.length) {
      setActivePhotoIndex(Math.max(0, updatedFiles.length - 1));
    }
  };

  // Start Capture & Analysis Workflow
  const handleStartCaptureAndAnalysis = async () => {
    if (files.length === 0) {
      setErrorMessage('Please select or capture at least one receipt image.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create or use draft purchase
      let purchase = currentPurchase;
      if (!purchase) {
        purchase = await createDraftPurchase(selectedProjectId);
        setCurrentPurchase(purchase);
      }

      // 2. Upload and analyze
      const result = await processReceiptCapture(
        purchase.purchaseId,
        files,
        (status, text) => {
          setCaptureStatus(status);
          setStatusMessage(text);
        }
      );

      setCurrentPurchase(result.purchase);
      setExtractedItems(result.items);
      setExtractedPages(result.pages);
      setCaptureStatus('NEEDS_REVIEW');
    } catch (err: any) {
      console.error('[Capture Modal] Process error:', err);
      setErrorMessage(err.message || 'Failed to process receipt. Please try again.');
      setCaptureStatus('DRAFT');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry Analysis (Idempotent)
  const handleRetryAnalysis = async () => {
    if (!currentPurchase) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await retryReceiptAnalysis(
        currentPurchase.purchaseId,
        files.length > 0 ? files : undefined,
        (status, text) => {
          setCaptureStatus(status);
          setStatusMessage(text);
        }
      );

      setCurrentPurchase(result.purchase);
      setExtractedItems(result.items);
      setExtractedPages(result.pages);
      setCaptureStatus('NEEDS_REVIEW');
    } catch (err: any) {
      console.error('[Capture Modal] Retry error:', err);
      setErrorMessage(err.message || 'Failed to re-analyze receipt.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Allow manual entry fallback while preserving any attached receipt photos
  const handleManualEntry = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let purchase = currentPurchase;
      if (!purchase) {
        purchase = await createDraftPurchase(selectedProjectId);
        setCurrentPurchase(purchase);
      }
      if (onOpenReview) {
        onClose();
        onOpenReview(purchase);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize manual purchase entry.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-[#03225F] text-white px-6 py-4 flex items-center justify-between border-b border-[#054AC6]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#054AC6] text-white shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Capture Purchase & Receipt
                </h2>
                <span className="text-[10px] bg-[#054AC6] text-[#7FA0D4] font-bold px-2 py-0.5 rounded-full border border-[#7FA0D4]/30">
                  AI OCR
                </span>
              </div>
              <p className="text-xs text-[#7FA0D4] font-medium">
                Optimized sequential receipt capture with fast line item and tax extraction.
              </p>
            </div>
          </div>

          <button
            id="close-capture-modal-btn"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* ERROR ALERT WITH IMMEDIATE RECOVERY ACTIONS */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 text-rose-900 text-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-sm">Receipt Processing Notice</span>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/80">
                <button
                  type="button"
                  onClick={handleStartCaptureAndAnalysis}
                  disabled={files.length === 0 || isProcessing}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Analysis
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Replace / Add Photos
                </button>
                {onOpenReview && (
                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className="bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Enter Manually →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD / PHOTO SELECTION (when DRAFT or no analysis yet) */}
          {captureStatus === 'DRAFT' && (
            <div className="space-y-6">
              
              {/* Optional Project Association Helper */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label htmlFor="capture-project-select" className="text-xs font-bold text-slate-800 block">
                    Associated Project (Optional for Draft Capture)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    You can tag a project now, or leave unassigned until Phase 3 final confirmation.
                  </p>
                </div>
                <select
                  id="capture-project-select"
                  aria-label="Associated Project"
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                >
                  <option value="">-- Leave Unassigned (Draft) --</option>
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectName} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Photo Instructions Notice */}
              <div className="bg-[#03225F]/5 border border-[#054AC6]/20 rounded-xl p-4 flex items-start gap-3 text-xs">
                <Info className="w-5 h-5 text-[#054AC6] shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700">
                  <span className="font-bold text-[#03225F] block">
                    Multi-Photo Receipt Capture (Sequential Pages)
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    For long receipts (Home Depot, Lowe's, Ferguson), open the camera and take 2 or 3 sequential photos from top to bottom. Our Gemini AI automatically detects overlapping lines and deduplicates them into a single accurate total.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Open Live Camera vs File Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="open-live-camera-receipt-btn"
                  type="button"
                  onClick={() => setIsLiveCameraOpen(true)}
                  className="p-4 bg-linear-to-br from-[#03225F] to-[#054AC6] hover:from-[#021845] hover:to-[#03225F] text-white rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Camera className="w-5 h-5 text-[#7FA0D4]" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black uppercase tracking-wider text-white">
                      Open Camera (Multi-Snap)
                    </span>
                    <span className="block text-[11px] text-[#7FA0D4]">
                      Snap multiple receipt slices
                    </span>
                  </div>
                </button>

                <button
                  id="choose-receipt-files-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#054AC6] text-slate-800 rounded-2xl shadow-2xs flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Upload className="w-5 h-5 text-[#054AC6]" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold text-slate-800">
                      Upload from Gallery / Files
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Select 1 or more images
                    </span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Photo Upload Dropzone (Optional drag & drop) */}
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#054AC6]/30 hover:border-[#054AC6] bg-slate-50/70 hover:bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
                >
                  <span className="text-xs font-semibold text-slate-700 block">
                    Drag and drop receipt files here, or use the buttons above
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Supports JPG, PNG, WEBP
                  </span>
                </div>

                {/* Previews Grid */}
                {filePreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Selected Photos ({filePreviews.length} page{filePreviews.length > 1 ? 's' : ''})</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsLiveCameraOpen(true)}
                          className="text-[11px] text-[#054AC6] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Snap More Pages
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {filePreviews.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-3/4 flex flex-col shadow-xs"
                        >
                          <img
                            src={url}
                            alt={`Receipt page ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-[#03225F]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Page {idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(idx);
                            }}
                            className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING / UPLOADING ANIMATION */}
          {(captureStatus === 'UPLOADING' || captureStatus === 'PROCESSING') && (
            <div className="bg-[#03225F] text-white rounded-2xl p-10 text-center space-y-6 border border-[#054AC6]/50 my-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#054AC6]/30 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-[#054AC6] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">
                  {captureStatus === 'UPLOADING' ? 'Uploading Receipt Photos' : 'Gemini AI OCR & Extraction'}
                </h3>
                <p className="text-xs text-[#7FA0D4] font-medium leading-relaxed">
                  {statusMessage || 'Analyzing receipt data, parsing line items, detecting overlap, and calculating single transaction total...'}
                </p>
              </div>

              {/* Progress Steps Indicators */}
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-[11px] pt-4">
                <div className={`p-2 rounded-lg border ${captureStatus === 'UPLOADING' ? 'bg-[#054AC6] border-white text-white font-bold' : 'bg-white/10 border-white/20 text-slate-300'}`}>
                  1. Upload Photos
                </div>
                <div className={`p-2 rounded-lg border ${captureStatus === 'PROCESSING' ? 'bg-[#054AC6] border-white text-white font-bold' : 'bg-white/10 border-white/20 text-slate-300'}`}>
                  2. Gemini OCR
                </div>
                <div className="p-2 rounded-lg border bg-white/5 border-white/10 text-slate-400">
                  3. Line Items
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: AI ANALYSIS REVIEW SCREEN (NEEDS_REVIEW) */}
          {captureStatus === 'NEEDS_REVIEW' && currentPurchase && (
            <div className="space-y-6">
              
              {/* Header Status & Confidence Banner */}
              <div className="bg-[#03225F] text-white rounded-2xl p-5 border border-[#054AC6]/50 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                          AI Extraction Complete (Needs Review)
                        </span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                          Status: NEEDS_REVIEW
                        </span>
                      </div>
                      <p className="text-xs text-[#7FA0D4] mt-0.5">
                        Please verify the merchant, authority total, and extracted line items below.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-[#021845] border border-[#054AC6]/40 px-3.5 py-2 rounded-xl text-right">
                      <span className="text-[10px] text-[#7FA0D4] block font-medium">AI Confidence</span>
                      <span className={`text-sm font-black ${
                        currentPurchase.aiConfidence >= 0.85 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {Math.round(currentPurchase.aiConfidence * 100)}%
                      </span>
                    </div>

                    <button
                      id="retry-analysis-btn"
                      onClick={handleRetryAnalysis}
                      disabled={isProcessing}
                      className="text-xs bg-[#054AC6] hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl border border-[#7FA0D4]/30 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      Retry Analysis
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Warnings / Overlap Resolution Notice if present */}
              {currentPurchase.aiWarnings && currentPurchase.aiWarnings.length > 0 && (
                <div className="space-y-2">
                  {currentPurchase.aiWarnings.map((warning, wIdx) => (
                    <div
                      key={wIdx}
                      className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">AI Observation / Overlap Resolution:</span>
                        <p>{warning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Split View: Photo Carousel (Left) & Extracted Financial Data (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT: Receipt Photos Viewer */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#054AC6]" />
                      Original Receipt Evidence ({filePreviews.length} page{filePreviews.length > 1 ? 's' : ''})
                    </span>
                    {filePreviews.length > 1 && (
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Viewing Page {activePhotoIndex + 1} of {filePreviews.length}
                      </span>
                    )}
                  </div>

                  {filePreviews.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 aspect-3/4 flex items-center justify-center shadow-xs">
                        <img
                          src={filePreviews[activePhotoIndex]}
                          alt={`Receipt page ${activePhotoIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-3 left-3 bg-[#03225F]/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                          Page {activePhotoIndex + 1}
                        </div>
                      </div>

                      {/* Thumbnail Selector if multi-page */}
                      {filePreviews.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {filePreviews.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePhotoIndex(idx)}
                              className={`relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                activePhotoIndex === idx
                                  ? 'border-[#054AC6] ring-2 ring-[#054AC6]/30'
                                  : 'border-slate-200 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                                P{idx + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                      No receipt images available.
                    </div>
                  )}
                </div>

                {/* RIGHT: Extracted Financial Summary & Line Items */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Extracted Header Meta Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-[#054AC6]" />
                        Merchant / Provider
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-1">
                        {currentPurchase.providerName || 'Unidentified'}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#054AC6]" />
                        Transaction Date
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-1">
                        {formatDate(currentPurchase.purchaseDate)}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-[#054AC6]" />
                        Receipt #
                      </span>
                      <span className="font-bold text-slate-900 text-sm block mt-1">
                        {currentPurchase.receiptNumber || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Grand Authority Financial Total Bar */}
                  <div className="bg-[#03225F] text-white p-4 rounded-xl border border-[#054AC6] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#7FA0D4] font-semibold block">
                        Authority Transaction Total
                      </span>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-300">
                        <span>Subtotal: {currentPurchase.subtotal !== null ? formatCurrency(currentPurchase.subtotal) : 'N/A'}</span>
                        <span>•</span>
                        <span>Tax: {currentPurchase.tax !== null ? formatCurrency(currentPurchase.tax) : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">
                        {formatCurrency(currentPurchase.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Extracted Line Items Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#054AC6]" />
                        Extracted Line Items ({extractedItems.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {filePreviews.length > 1 ? 'Overlap deduplicated' : 'Standard extraction'}
                      </span>
                    </div>

                    {extractedItems.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                        No line items parsed. You can retry analysis or enter details manually.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {extractedItems.map((item, iIdx) => (
                          <div key={item.itemId || iIdx} className="p-3 bg-white hover:bg-slate-50 text-xs flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  {item.description || item.rawItemText}
                                </span>
                                {item.brand && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                    {item.brand}
                                  </span>
                                )}
                                {item.sourcePageNumbers && item.sourcePageNumbers.length > 1 && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                                    Pages {item.sourcePageNumbers.join(' & ')} (Merged Overlap)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                {item.sku && <span>SKU: {item.sku}</span>}
                                {item.category && <span>Category: {item.category}</span>}
                                <span>Qty: <strong>{item.quantity || 1} {item.unit || 'EA'}</strong></span>
                                {item.unitPrice !== null && (
                                  <span>@ {formatCurrency(item.unitPrice)}</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-slate-900 text-sm">
                                {item.lineTotal !== null ? formatCurrency(item.lineTotal) : '-'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phase 2 Boundaries Notice */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                    <Shield className="w-4 h-4 text-[#054AC6] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Phase 2 Capture Complete
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Receipt draft saved with structured items in <code>NEEDS_REVIEW</code> state. Final project assignment and financial total posting will occur during Phase 3.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {captureStatus === 'NEEDS_REVIEW' && currentPurchase && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Delete this receipt draft?')) {
                    await deleteDraftPurchase(currentPurchase.purchaseId);
                    onClose();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard Draft
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              id="cancel-capture-btn"
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              {captureStatus === 'NEEDS_REVIEW' ? 'Close' : 'Cancel'}
            </button>

            {captureStatus === 'DRAFT' && (
              <button
                id="start-analysis-btn"
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={handleStartCaptureAndAnalysis}
                className={`text-xs font-bold text-white px-5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  files.length === 0 || isProcessing
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-[#054AC6] hover:bg-[#03225F]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Analyze with Gemini ({files.length} Photo{files.length === 1 ? '' : 's'})
              </button>
            )}

            {captureStatus === 'NEEDS_REVIEW' && (
              <div className="flex items-center gap-2">
                <button
                  id="keep-draft-btn"
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Keep Draft
                </button>
                {onOpenReview && currentPurchase && (
                  <button
                    id="proceed-to-review-btn"
                    type="button"
                    onClick={() => {
                      const p = currentPurchase;
                      onClose();
                      onOpenReview(p);
                    }}
                    className="text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Review & Confirm Purchase →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Live Multi-Snap Camera Scanner Modal */}
      <LiveCameraScanner
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onPhotosCaptured={handlePhotosFromCamera}
        title="Multi-Page Receipt Scanner"
        subtitle="Point and snap sequential sections from top to bottom (overlap allowed)"
        targetType="RECEIPT"
        allowMultiple={true}
      />
    </div>
  );
};
