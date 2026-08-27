import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Purchase, PurchaseItem, ReceiptPage, CaptureStatus } from '../../types';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';
import { LiveCameraScanner } from '../common/LiveCameraScanner';
import { storageService } from '../../services/firebase/storageService';
import { optimizeReceiptImage } from '../../lib/imageOptimization';
import { 
  Camera, Upload, X, CheckCircle2, AlertTriangle, RefreshCw, 
  Layers, ArrowRight, ArrowLeft, Shield, Eye, Trash2, Plus, 
  Sparkles, FileText, Check, AlertCircle, Info, Image as ImageIcon,
  DollarSign, Hash, Calendar, Store, Tag, Edit3, ZoomIn, ZoomOut,
  RotateCw, CreditCard, ShoppingBag, Receipt, Save, CheckCheck
} from 'lucide-react';

interface CapturePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string | null;
  existingPurchaseId?: string | null;
  onOpenReview?: (purchase: Purchase) => void;
}

const POPULAR_SUPPLIERS = [
  'Home Depot',
  "Lowe's",
  'Ferguson',
  'Sherwin-Williams',
  'ABC Supply',
  '84 Lumber',
  'Menards',
  'White Cap',
  'Beacon',
  'Local Supply',
];

const EXPENSE_CATEGORIES = [
  'Materials',
  'Tools & Equipment',
  'Subcontractor',
  'Hardware',
  'Electrical',
  'Plumbing',
  'Permits / Fees',
  'Fuel / Travel',
  'Other',
];

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Cash',
  'Check',
  'Vendor Account',
];

export const CapturePurchaseModal: React.FC<CapturePurchaseModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId = null,
  existingPurchaseId = null,
  onOpenReview,
}) => {
  const {
    projects,
    providers,
    addCompanyProvider,
    addPurchase,
    createDraftPurchase,
    processReceiptCapture,
    retryReceiptAnalysis,
    getPurchaseById,
    getPurchaseReceiptPages,
    getPurchaseItems,
    deleteDraftPurchase,
  } = useProjects();

  const { isOwnerOrAdmin, currentCompany, currentUser } = useAuth();

  // Mode: AI Scanner vs Manual Entry
  const [entryMode, setEntryMode] = useState<'AI_SCAN' | 'MANUAL_ENTRY'>('AI_SCAN');

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

  // Manual Form States
  const [manualProjectId, setManualProjectId] = useState<string>(defaultProjectId || '');
  const [manualProviderName, setManualProviderName] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualTotal, setManualTotal] = useState<string>('');
  const [manualSubtotal, setManualSubtotal] = useState<string>('');
  const [manualTax, setManualTax] = useState<string>('');
  const [manualReceiptNumber, setManualReceiptNumber] = useState<string>('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('Credit Card');
  const [manualCategory, setManualCategory] = useState<string>('Materials');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualItems, setManualItems] = useState<Array<{ id: string; description: string; quantity: number; unitPrice: number; lineTotal: number }>>([]);
  const [showItemizedSection, setShowItemizedSection] = useState<boolean>(false);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoRotation, setPhotoRotation] = useState<number>(0);
  const [isSuccessSave, setIsSuccessSave] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle safe modal close with active request cancellation
  const handleModalClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    onClose();
  };

  // Initialize or load existing draft
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset state on close
      setEntryMode('AI_SCAN');
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
      setManualTotal('');
      setManualSubtotal('');
      setManualTax('');
      setManualProviderName('');
      setManualReceiptNumber('');
      setManualNotes('');
      setManualItems([]);
      setShowItemizedSection(false);
      setPhotoZoom(1);
      setPhotoRotation(0);
      setIsSuccessSave(false);
      return;
    }

    if (existingPurchaseId) {
      const p = getPurchaseById(existingPurchaseId);
      if (p) {
        setCurrentPurchase(p);
        setSelectedProjectId(p.projectId || defaultProjectId);
        setManualProjectId(p.projectId || defaultProjectId || '');
        setCaptureStatus(p.captureStatus);
        const pages = getPurchaseReceiptPages(p.purchaseId);
        const items = getPurchaseItems(p.purchaseId);
        setExtractedPages(pages);
        setExtractedItems(items);
        if (pages.length > 0) {
          setFilePreviews(pages.map(page => page.imageUrl));
        }
        if (p.providerName) setManualProviderName(p.providerName);
        if (p.purchaseDate) setManualDate(p.purchaseDate);
        if (p.totalAmount) setManualTotal(p.totalAmount.toString());
        if (p.subtotal) setManualSubtotal(p.subtotal.toString());
        if (p.tax) setManualTax(p.tax.toString());
        if (p.receiptNumber) setManualReceiptNumber(p.receiptNumber);
        if (p.paymentMethod) setManualPaymentMethod(p.paymentMethod);
      }
    } else {
      setSelectedProjectId(defaultProjectId);
      setManualProjectId(defaultProjectId || (projects.length === 1 ? projects[0].projectId : ''));
      setCaptureStatus('DRAFT');
      setManualDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, existingPurchaseId, defaultProjectId, projects]);

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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create or use draft purchase
      let purchase = currentPurchase;
      if (!purchase) {
        purchase = await createDraftPurchase(selectedProjectId);
        setCurrentPurchase(purchase);
      }

      // 2. Upload and analyze with active cancellation signal
      const result = await processReceiptCapture(
        purchase.purchaseId,
        files,
        (status, text) => {
          setCaptureStatus(status);
          setStatusMessage(text);
        },
        controller.signal
      );

      setCurrentPurchase(result.purchase);
      setExtractedItems(result.items);
      setExtractedPages(result.pages);
      setCaptureStatus('NEEDS_REVIEW');
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('[Capture Modal] Receipt analysis cancelled by user.');
        setCaptureStatus('DRAFT');
        setStatusMessage('');
      } else {
        console.error('[Capture Modal] Process error:', err);
        setErrorMessage(err.message || 'Failed to process receipt. Please try again.');
        setCaptureStatus('DRAFT');
      }
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  };

  // Retry Analysis (Idempotent)
  const handleRetryAnalysis = async () => {
    if (!currentPurchase) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await retryReceiptAnalysis(
        currentPurchase.purchaseId,
        files.length > 0 ? files : undefined,
        (status, text) => {
          setCaptureStatus(status);
          setStatusMessage(text);
        },
        controller.signal
      );

      setCurrentPurchase(result.purchase);
      setExtractedItems(result.items);
      setExtractedPages(result.pages);
      setCaptureStatus('NEEDS_REVIEW');
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.log('[Capture Modal] Receipt re-analysis cancelled by user.');
      } else {
        console.error('[Capture Modal] Retry error:', err);
        setErrorMessage(err.message || 'Failed to re-analyze receipt.');
      }
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  };

  // Switch to Manual Entry Mode
  const handleSwitchToManualMode = () => {
    setEntryMode('MANUAL_ENTRY');
    setErrorMessage(null);
    if (!manualProjectId && selectedProjectId) {
      setManualProjectId(selectedProjectId);
    }
  };

  // Add Item to Manual Itemizer
  const handleAddLineItem = () => {
    setManualItems(prev => [
      ...prev,
      { id: generateId('item'), description: '', quantity: 1, unitPrice: 0, lineTotal: 0 },
    ]);
    setShowItemizedSection(true);
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    setManualItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
        const p = field === 'unitPrice' ? parseFloat(value) || 0 : item.unitPrice;
        item.lineTotal = Math.round(q * p * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSumItemsToTotal = () => {
    const sum = manualItems.reduce((acc, item) => acc + (item.lineTotal || 0), 0);
    if (sum > 0) {
      setManualTotal(sum.toFixed(2));
    }
  };

  // Save Manual Purchase (Draft or Confirmed)
  const handleSaveManualPurchase = async (isDraft: boolean = false) => {
    setErrorMessage(null);
    const parsedTotal = parseFloat(manualTotal);

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setErrorMessage('Please enter a valid total amount greater than $0.00.');
      return;
    }

    if (!isDraft && (!manualProjectId || manualProjectId.trim() === '')) {
      setErrorMessage('Please select an associated project before confirming.');
      return;
    }

    setIsProcessing(true);

    try {
      const companyId = currentCompany?.companyId || 'company_demo_contractor';
      const purchaseId = currentPurchase?.purchaseId || generateId('pur');

      // 1. Process and upload receipt pages from selected files
      const createdPages: ReceiptPage[] = [];
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const pageNum = i + 1;
          try {
            const { file: optimizedFile } = await optimizeReceiptImage(file);
            const uploadRes = await storageService.uploadReceiptPageImage(
              companyId,
              purchaseId,
              pageNum,
              optimizedFile
            );
            createdPages.push({
              receiptPageId: `page_${generateId()}`,
              companyId,
              purchaseId,
              pageNumber: pageNum,
              imageStoragePath: uploadRes.imageStoragePath,
              imageUrl: uploadRes.imageUrl || filePreviews[i] || '',
              createdAt: new Date().toISOString(),
            });
          } catch (uploadErr) {
            console.warn('[Manual Entry] Page upload fallback:', uploadErr);
            createdPages.push({
              receiptPageId: `page_${generateId()}`,
              companyId,
              purchaseId,
              pageNumber: pageNum,
              imageStoragePath: `companies/${companyId}/purchases/${purchaseId}/page_${pageNum}.jpg`,
              imageUrl: filePreviews[i] || '',
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      // 2. Prepare itemized line items
      const validItems: PurchaseItem[] = manualItems
        .filter(item => item.description.trim() !== '' && (item.lineTotal > 0 || item.unitPrice > 0))
        .map((item) => ({
          itemId: `item_${generateId()}`,
          companyId,
          purchaseId,
          sourcePageNumbers: [1],
          rawItemText: item.description,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.lineTotal,
          lineTotal: item.lineTotal || ((item.quantity || 1) * (item.unitPrice || 0)),
          category: manualCategory,
          additionalSpecifications: [],
          confidence: 1.0,
          verified: true,
          createdAt: new Date().toISOString(),
        }));

      // Calculate subtotal & tax
      const parsedSubtotal = manualSubtotal ? parseFloat(manualSubtotal) : null;
      const parsedTax = manualTax ? parseFloat(manualTax) : null;

      // Matched provider
      const trimmedProvider = manualProviderName.trim() || 'General Supplier';
      const matchedProvider = providers.find(
        p => p.providerName.toLowerCase() === trimmedProvider.toLowerCase()
      );

      // Auto-register new provider if not existing
      if (!matchedProvider && trimmedProvider !== 'General Supplier') {
        try {
          await addCompanyProvider(trimmedProvider, manualCategory);
        } catch (e) {
          console.warn('[Manual Entry] Provider auto-add notice:', e);
        }
      }

      const newPurchase: Purchase = {
        purchaseId,
        companyId,
        projectId: manualProjectId || null,
        providerId: matchedProvider?.providerId || null,
        providerName: trimmedProvider,
        purchaseDate: manualDate || new Date().toISOString().split('T')[0],
        subtotal: parsedSubtotal !== null && !isNaN(parsedSubtotal) ? parsedSubtotal : null,
        tax: parsedTax !== null && !isNaN(parsedTax) ? parsedTax : null,
        totalAmount: parsedTotal,
        receiptNumber: manualReceiptNumber.trim() || null,
        paymentMethod: manualPaymentMethod || null,
        receiptPageCount: createdPages.length,
        aiExtractedTextSummary: manualNotes ? `Manual entry: ${manualNotes}` : 'Manual entry from receipt photo',
        aiConfidence: 1.0,
        aiWarnings: [],
        manualEntry: true,
        captureStatus: isDraft ? 'DRAFT' : 'CONFIRMED',
        confirmedAt: isDraft ? undefined : new Date().toISOString(),
        confirmedBy: isDraft ? undefined : (currentUser?.userId || 'user_demo_owner'),
        createdBy: currentUser?.userId || 'user_demo_owner',
        createdAt: new Date().toISOString(),
      };

      await addPurchase(newPurchase, createdPages, validItems);

      setIsSuccessSave(true);
      setTimeout(() => {
        setIsSuccessSave(false);
        handleModalClose();
      }, 700);
    } catch (err: any) {
      console.error('[Manual Entry] Save error:', err);
      setErrorMessage(err.message || 'Failed to save purchase. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Allow manual entry fallback into review modal if requested
  const handleManualEntryFallback = async () => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-[#03225F] text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-[#054AC6]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#054AC6] text-white shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Capture Purchase & Receipt
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  entryMode === 'MANUAL_ENTRY'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    : 'bg-[#054AC6] text-[#7FA0D4] border-[#7FA0D4]/30'
                }`}>
                  {entryMode === 'MANUAL_ENTRY' ? 'Manual + Photo' : 'AI OCR'}
                </span>
              </div>
              <p className="text-xs text-[#7FA0D4] font-medium hidden sm:block">
                {entryMode === 'MANUAL_ENTRY'
                  ? 'Enter purchase details manually alongside your receipt or invoice photo.'
                  : 'Fast AI OCR receipt extraction with sequential page deduplication.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs">
              <button
                type="button"
                onClick={() => setEntryMode('AI_SCAN')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  entryMode === 'AI_SCAN'
                    ? 'bg-[#054AC6] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Scanner</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToManualMode}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  entryMode === 'MANUAL_ENTRY'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manual + Photo</span>
              </button>
            </div>

            <button
              id="close-capture-modal-btn"
              onClick={handleModalClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SUCCESS BANNER OVERLAY */}
          {isSuccessSave && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center text-emerald-900 space-y-2 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Purchase Saved & Recorded!</h3>
              <p className="text-xs text-emerald-700">
                Receipt photos attached and financial metrics updated in real-time.
              </p>
            </div>
          )}

          {/* ERROR ALERT WITH IMMEDIATE RECOVERY ACTIONS */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 text-rose-900 text-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-sm">Notice</span>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>

              {entryMode === 'AI_SCAN' && (
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
                  <button
                    type="button"
                    onClick={handleSwitchToManualMode}
                    className="bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ingresar Manualmente con Foto →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 1: MANUAL DATA ENTRY ALONGSIDE RECEIPT / INVOICE PHOTO (NEW)          */}
          {/* ========================================================================= */}
          {entryMode === 'MANUAL_ENTRY' && (
            <div className="space-y-6">
              
              {/* Top Quick Tip Banner */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-amber-800">
                    <strong>Simple Manual Entry:</strong> View your receipt photo on the left while typing vendor, total, and invoice details. All photos remain attached to the purchase record.
                  </p>
                  {files.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('AI_SCAN');
                        handleStartCaptureAndAnalysis();
                      }}
                      className="text-xs bg-[#054AC6] hover:bg-[#03225F] text-white font-bold px-3 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3 text-blue-200" />
                      Scan with AI instead
                    </button>
                  )}
                </div>
              </div>

              {/* Split Workspace: Photo Viewer (Left) & Simple Form (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Receipt / Invoice Photo Viewer */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#054AC6]" />
                      Receipt Photo ({filePreviews.length} page{filePreviews.length !== 1 ? 's' : ''})
                    </span>

                    {filePreviews.length > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPhotoZoom(prev => Math.max(0.75, prev - 0.25))}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded-md"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono w-9 text-center">
                          {Math.round(photoZoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoZoom(prev => Math.min(2.5, prev + 0.25))}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded-md"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoRotation(prev => (prev + 90) % 360)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded-md ml-1"
                          title="Rotate 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {filePreviews.length > 0 ? (
                    <div className="space-y-3">
                      {/* Image Canvas Container with Zoom & Rotate */}
                      <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 aspect-3/4 flex items-center justify-center shadow-xs">
                        <div 
                          className="w-full h-full flex items-center justify-center transition-transform duration-150 overflow-auto p-2"
                        >
                          <img
                            src={filePreviews[activePhotoIndex]}
                            alt={`Receipt page ${activePhotoIndex + 1}`}
                            style={{
                              transform: `scale(${photoZoom}) rotate(${photoRotation}deg)`,
                              transformOrigin: 'center center',
                            }}
                            className="max-w-full max-h-full object-contain transition-transform duration-150 rounded"
                          />
                        </div>

                        <div className="absolute bottom-3 left-3 bg-[#03225F]/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                          Page {activePhotoIndex + 1} of {filePreviews.length}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(activePhotoIndex)}
                          className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md transition-colors cursor-pointer"
                          title="Remove this photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Multi-page Thumbnails & Add Page Controls */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {filePreviews.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActivePhotoIndex(idx);
                              setPhotoZoom(1);
                            }}
                            className={`relative shrink-0 w-14 h-18 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              activePhotoIndex === idx
                                ? 'border-[#054AC6] ring-2 ring-[#054AC6]/30 scale-102'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5">
                              P{idx + 1}
                            </span>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setIsLiveCameraOpen(true)}
                          className="shrink-0 w-14 h-18 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#054AC6] bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center text-slate-500 hover:text-[#054AC6] transition-colors cursor-pointer"
                          title="Snap another page with camera"
                        >
                          <Camera className="w-4 h-4" />
                          <span className="text-[9px] font-bold mt-1">+ Snap</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          className="shrink-0 w-14 h-18 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#054AC6] bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center text-slate-500 hover:text-[#054AC6] transition-colors cursor-pointer"
                          title="Upload file from gallery"
                        >
                          <Upload className="w-4 h-4" />
                          <span className="text-[9px] font-bold mt-1">+ File</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty Photo State with Fast Snap / Upload Triggers */
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#054AC6] flex items-center justify-center mx-auto shadow-2xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">
                          Attach Receipt or Invoice Photo
                        </span>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Snap a photo or upload an image to view it right here while you enter the data.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setIsLiveCameraOpen(true)}
                          className="bg-[#054AC6] hover:bg-[#03225F] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Take Photo (Camera)
                        </button>
                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload from Gallery
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={manualFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* RIGHT COLUMN: Streamlined Fast Manual Entry Form */}
                <div className="lg:col-span-7 space-y-4">
                  
                  <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                    
                    {/* 1. Associated Project */}
                    <div>
                      <label htmlFor="manual-project-select" className="text-xs font-bold text-slate-800 block mb-1">
                        1. Project <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="manual-project-select"
                        value={manualProjectId}
                        onChange={(e) => setManualProjectId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                      >
                        <option value="">-- Select Project --</option>
                        {projects.map((p) => (
                          <option key={p.projectId} value={p.projectId}>
                            {p.projectName} {p.clientName ? `(${p.clientName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Merchant / Supplier with Popular Quick Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="manual-provider-input" className="text-xs font-bold text-slate-800 block">
                          2. Merchant / Supplier Store
                        </label>
                        <span className="text-[10px] text-slate-500">Pick or type name</span>
                      </div>
                      
                      <div className="relative">
                        <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          id="manual-provider-input"
                          type="text"
                          placeholder="e.g. Home Depot, Ferguson, Lowe's, ABC Supply..."
                          value={manualProviderName}
                          onChange={(e) => setManualProviderName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                        />
                      </div>

                      {/* Quick Supplier Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {POPULAR_SUPPLIERS.map((sup) => (
                          <button
                            key={sup}
                            type="button"
                            onClick={() => setManualProviderName(sup)}
                            className={`text-[10px] px-2 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                              manualProviderName.toLowerCase() === sup.toLowerCase()
                                ? 'bg-[#054AC6] text-white border-[#054AC6]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {sup}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Transaction Date & Total Amount (Hero Row) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label htmlFor="manual-date-input" className="text-xs font-bold text-slate-800 block mb-1">
                          3. Date of Purchase
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            id="manual-date-input"
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="manual-total-input" className="text-xs font-bold text-slate-800 block mb-1">
                          4. Total Amount ($) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                          <input
                            id="manual-total-input"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={manualTotal}
                            onChange={(e) => setManualTotal(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-emerald-400/80 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Subtotal, Tax & Invoice # (Optional Row) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label htmlFor="manual-subtotal-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Subtotal ($)
                        </label>
                        <input
                          id="manual-subtotal-input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={manualSubtotal}
                          onChange={(e) => setManualSubtotal(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                        />
                      </div>

                      <div>
                        <label htmlFor="manual-tax-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Tax ($)
                        </label>
                        <input
                          id="manual-tax-input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={manualTax}
                          onChange={(e) => setManualTax(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                        />
                      </div>

                      <div>
                        <label htmlFor="manual-receipt-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Receipt / Invoice #
                        </label>
                        <input
                          id="manual-receipt-input"
                          type="text"
                          placeholder="#1049"
                          value={manualReceiptNumber}
                          onChange={(e) => setManualReceiptNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                        />
                      </div>
                    </div>

                    {/* 5. Expense Category Chips */}
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        5. Expense Category
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setManualCategory(cat)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              manualCategory === cat
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6. Payment Method Chips */}
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        6. Payment Method
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PAYMENT_METHODS.map((pm) => (
                          <button
                            key={pm}
                            type="button"
                            onClick={() => setManualPaymentMethod(pm)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              manualPaymentMethod === pm
                                ? 'bg-[#054AC6] text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pm}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 7. Optional Quick Line Items */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowItemizedSection(!showItemizedSection)}
                          className="text-xs font-bold text-[#054AC6] hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>{showItemizedSection ? 'Hide Itemized Rows' : '+ Add Itemized Products / Materials (Optional)'}</span>
                          {manualItems.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              {manualItems.length}
                            </span>
                          )}
                        </button>

                        {showItemizedSection && manualItems.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSumItemsToTotal}
                            className="text-[11px] text-emerald-700 hover:underline font-bold"
                          >
                            Sum items to Total
                          </button>
                        )}
                      </div>

                      {showItemizedSection && (
                        <div className="space-y-2 mt-3 bg-white p-3 rounded-xl border border-slate-200">
                          {manualItems.map((item, idx) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                              <div className="col-span-6">
                                <input
                                  type="text"
                                  placeholder="e.g. 2x4 8ft Pine Lumber"
                                  value={item.description}
                                  onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="$ Price"
                                  value={item.unitPrice || ''}
                                  onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right"
                                />
                              </div>
                              <div className="col-span-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleAddLineItem}
                            className="w-full py-1.5 border border-dashed border-slate-300 hover:border-[#054AC6] text-[#054AC6] rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Line Item
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 8. Quick Notes / Summary */}
                    <div>
                      <label htmlFor="manual-notes-input" className="text-[11px] font-bold text-slate-700 block mb-1">
                        Notes / Memo
                      </label>
                      <input
                        id="manual-notes-input"
                        type="text"
                        placeholder="Optional memo (e.g. Master bathroom tiles, urgent repair)"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                      />
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: AI OCR SCANNER (PRESERVED 100% UNCHANGED)                         */}
          {/* ========================================================================= */}
          {entryMode === 'AI_SCAN' && (
            <>
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
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value || null);
                        setManualProjectId(e.target.value || '');
                      }}
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
            </>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {entryMode === 'AI_SCAN' && captureStatus === 'NEEDS_REVIEW' && currentPurchase && (
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

            {entryMode === 'MANUAL_ENTRY' && (
              <button
                type="button"
                onClick={() => setEntryMode('AI_SCAN')}
                className="text-xs text-[#054AC6] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Switch to AI Scanner
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              id="cancel-capture-btn"
              type="button"
              onClick={handleModalClose}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 px-3.5 sm:px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* AI Scanner Mode Footer Actions */}
            {entryMode === 'AI_SCAN' && captureStatus === 'DRAFT' && (
              <>
                <button
                  id="manual-entry-switch-btn"
                  type="button"
                  onClick={handleSwitchToManualMode}
                  className="text-xs font-bold text-slate-800 bg-white border-2 border-slate-300 hover:border-[#054AC6] hover:bg-slate-50 px-3.5 sm:px-4 py-2 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#054AC6]" />
                  <span>Manual Entry</span>
                </button>

                <button
                  id="start-analysis-btn"
                  type="button"
                  disabled={files.length === 0 || isProcessing}
                  onClick={handleStartCaptureAndAnalysis}
                  className={`text-xs font-bold text-white px-4 sm:px-5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    files.length === 0 || isProcessing
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-[#054AC6] hover:bg-[#03225F]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze with Gemini ({files.length} Photo{files.length === 1 ? '' : 's'})
                </button>
              </>
            )}

            {entryMode === 'AI_SCAN' && captureStatus === 'NEEDS_REVIEW' && (
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

            {/* Manual Entry Mode Footer Actions */}
            {entryMode === 'MANUAL_ENTRY' && (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSaveManualPurchase(true)}
                  className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 sm:px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save as Draft
                </button>

                <button
                  id="save-manual-purchase-btn"
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSaveManualPurchase(false)}
                  className="text-xs font-bold text-white bg-[#054AC6] hover:bg-[#03225F] px-4 sm:px-5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isProcessing ? 'Saving...' : 'Save & Confirm Purchase'}
                </button>
              </>
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
