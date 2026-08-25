/**
 * MyProjectTrace - Project & Financial Data Context
 * 
 * Provides reactive financial metrics, Cloud Firestore persistence integration,
 * deterministic risk evaluation, confirmed Firestore state transitions, and Demo Mode support.
 * 
 * Phase 2 Purchase Capture & AI Analysis Integration:
 * - Purchase draft creation
 * - Multi-image receipt capture & company-isolated storage upload
 * - Server-side Gemini analysis integration
 * - Idempotent line item storage and retry without duplication
 * - States: DRAFT -> UPLOADING -> PROCESSING -> NEEDS_REVIEW
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  Project, Purchase, Payment, FinancialAlert, 
  ProjectFinancialMetrics, ReceiptPage, PurchaseItem, CaptureStatus,
  Provider, DuplicatePurchaseCandidate, ProjectPhoto, ProjectNote, PhotoPhase 
} from '../types';
import { 
  DEMO_COMPANY, DEMO_PROJECTS, DEMO_PURCHASES, DEMO_PAYMENTS, 
  DEMO_RECEIPT_PAGES, DEMO_PURCHASE_ITEMS, DEMO_PROVIDERS,
  DEMO_PROJECT_PHOTOS, DEMO_PROJECT_NOTES 
} from '../services/mockSeedData';
import { calculateProjectMetrics } from '../services/financialFormulas';
import { evaluateProjectFinancialRisk } from '../services/riskEngine';
import { useAuth } from './AuthContext';
import { generateId } from '../lib/utils';
import { projectRepository } from '../services/firebase/projectRepository';
import { paymentRepository, purchaseRepository } from '../services/firebase/financialDataRepository';
import { providerRepository } from '../services/firebase/providerRepository';
import { progressPhotoRepository } from '../services/firebase/progressPhotoRepository';
import { projectNoteRepository } from '../services/firebase/projectNoteRepository';
import { storageService } from '../services/firebase/storageService';
import { receiptAnalysisService, PreparedReceiptPage } from '../services/receiptAnalysisService';
import { optimizeReceiptImages } from '../lib/imageOptimization';
import { createQuickProvider } from '../services/providerService';
import { detectPurchaseDuplicates, DuplicateCheckInput } from '../services/duplicateDetectionService';
import { 
  validatePurchaseConfirmation, 
  executePurchaseConfirmation, 
  ConfirmPurchasePayload 
} from '../services/purchaseConfirmationService';
import { 
  generateProjectPdfReport, 
  generateProjectExcelTaxReport,
  generateCompanyCpaExcelReport,
  generateAnnualExcelReport,
  generateAnnualPdfReport
} from '../services/exportReportService';

interface ProjectContextType {
  projects: Project[];
  purchases: Purchase[];
  payments: Payment[];
  receiptPages: ReceiptPage[];
  purchaseItems: PurchaseItem[];
  providers: Provider[];
  alerts: FinancialAlert[];
  draftPurchases: Purchase[];
  projectPhotos: ProjectPhoto[];
  projectNotes: ProjectNote[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedProject: Project | null;
  getProjectMetrics: (projectId: string) => ProjectFinancialMetrics | null;
  allProjectMetrics: Record<string, ProjectFinancialMetrics>;
  isLoadingProjects: boolean;
  
  // Phase 1 Mutations
  createProject: (data: Omit<Project, 'projectId' | 'companyId' | 'createdAt'>) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addPayment: (data: Omit<Payment, 'paymentId' | 'companyId' | 'createdAt'>) => Promise<Payment>;
  updatePayment: (paymentId: string, data: Partial<Payment>) => Promise<Payment>;
  deletePayment: (paymentId: string) => Promise<void>;
  addPurchase: (purchase: Purchase, pages?: ReceiptPage[], items?: PurchaseItem[]) => Promise<void>;
  
  // Phase 2 Capture & Analysis Mutations
  createDraftPurchase: (projectId?: string | null) => Promise<Purchase>;
  processReceiptCapture: (
    purchaseId: string,
    files: File[],
    onProgress?: (status: CaptureStatus, stepText: string) => void
  ) => Promise<{ purchase: Purchase; items: PurchaseItem[]; pages: ReceiptPage[] }>;
  retryReceiptAnalysis: (
    purchaseId: string,
    files?: File[],
    onProgress?: (status: CaptureStatus, stepText: string) => void
  ) => Promise<{ purchase: Purchase; items: PurchaseItem[]; pages: ReceiptPage[] }>;
  deleteDraftPurchase: (purchaseId: string) => Promise<void>;

  // Phase 3 Review, Assignment, Duplicate Detection & Confirmation
  addCompanyProvider: (providerName: string, category?: string) => Promise<Provider>;
  confirmPurchaseDraft: (payload: ConfirmPurchasePayload) => Promise<Purchase>;
  rejectPurchaseDraft: (purchaseId: string) => Promise<void>;
  checkPurchaseDuplicates: (pending: DuplicateCheckInput) => DuplicatePurchaseCandidate[];

  // Project Progress Photos & Notes Mutations
  addProjectPhoto: (projectId: string, photo: Omit<ProjectPhoto, 'photoId' | 'companyId' | 'createdAt'>) => Promise<ProjectPhoto>;
  addMultipleProjectPhotos: (projectId: string, photos: Array<{ imageUrl: string; mediaType?: 'photo' | 'video'; videoUrl?: string; caption?: string; phase?: PhotoPhase; tags?: string[]; takenAt?: string }>) => Promise<ProjectPhoto[]>;
  deleteProjectPhoto: (photoId: string, projectId: string) => Promise<void>;
  addProjectNote: (projectId: string, note: Omit<ProjectNote, 'noteId' | 'companyId' | 'createdAt'>) => Promise<ProjectNote>;
  updateProjectNote: (projectId: string, noteId: string, updates: Partial<ProjectNote>) => Promise<void>;
  deleteProjectNote: (projectId: string, noteId: string) => Promise<void>;

  // Report & Export Helpers
  exportProjectPdf: (projectId: string) => Promise<void>;
  exportProjectExcel: (projectId: string) => void;
  exportCompanyCpaExcel: () => void;
  exportAnnualExcel: (year: number) => void;
  exportAnnualPdf: (year: number) => Promise<void>;

  // Queries
  getProjectPurchases: (projectId: string) => Purchase[];
  getProjectPayments: (projectId: string) => Payment[];
  getProjectAlerts: (projectId: string) => FinancialAlert[];
  getPurchaseReceiptPages: (purchaseId: string) => ReceiptPage[];
  getPurchaseItems: (purchaseId: string) => PurchaseItem[];
  getPurchaseById: (purchaseId: string) => Purchase | undefined;
  getProjectPhotos: (projectId: string) => ProjectPhoto[];
  getProjectNotes: (projectId: string) => ProjectNote[];
  acknowledgeAlert: (alertId: string) => void;
  resetToDemoData: () => void;
  refreshProjectData: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PROJECTS = 'mpt_projects';
const LOCAL_STORAGE_KEY_PURCHASES = 'mpt_purchases';
const LOCAL_STORAGE_KEY_PAYMENTS = 'mpt_payments';
const LOCAL_STORAGE_KEY_PAGES = 'mpt_receipt_pages';
const LOCAL_STORAGE_KEY_ITEMS = 'mpt_purchase_items';
const LOCAL_STORAGE_KEY_PROVIDERS = 'mpt_providers';
const LOCAL_STORAGE_KEY_PHOTOS = 'mpt_project_photos';
const LOCAL_STORAGE_KEY_NOTES = 'mpt_project_notes';

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState, currentCompany, currentUser, isFirebaseAvailable } = useAuth();
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);

  // In-memory / cache states
  const [projects, setProjects] = useState<Project[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PROJECTS;
    }
    return [];
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PURCHASES);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PURCHASES;
    }
    return [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PAYMENTS);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PAYMENTS;
    }
    return [];
  });

  const [receiptPages, setReceiptPages] = useState<ReceiptPage[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PAGES);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_RECEIPT_PAGES;
    }
    return [];
  });

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PURCHASE_ITEMS;
    }
    return [];
  });

  const [providers, setProviders] = useState<Provider[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROVIDERS);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PROVIDERS;
    }
    return [];
  });

  const [projectPhotos, setProjectPhotos] = useState<ProjectPhoto[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PHOTOS);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PROJECT_PHOTOS;
    }
    return [];
  });

  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>(() => {
    if (authState === 'DEMO_MODE') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_NOTES);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      return DEMO_PROJECT_NOTES;
    }
    return [];
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Strict check: only true authenticated production sessions may touch Firestore
  const isLiveFirestoreActive = 
    authState === 'AUTHENTICATED' && 
    isFirebaseAvailable && 
    Boolean(currentCompany?.companyId) && 
    currentCompany.companyId !== DEMO_COMPANY.companyId;

  // Load from Firestore ONLY when in Authenticated Live Mode with valid companyId
  const refreshProjectData = useCallback(async () => {
    if (!isLiveFirestoreActive || !currentCompany?.companyId) {
      return;
    }

    setIsLoadingProjects(true);
    try {
      const [
        firestoreProjects, 
        firestorePayments, 
        firestorePurchases, 
        firestoreProviders,
        firestorePhotos,
        firestoreNotes,
      ] = await Promise.all([
        projectRepository.getProjects(currentCompany.companyId),
        paymentRepository.getPayments(currentCompany.companyId),
        purchaseRepository.getPurchases(currentCompany.companyId),
        providerRepository.getProviders(currentCompany.companyId),
        progressPhotoRepository.getAllCompanyPhotos(currentCompany.companyId),
        projectNoteRepository.getAllCompanyNotes(currentCompany.companyId),
      ]);

      setProjects(firestoreProjects);
      setPayments(firestorePayments);
      setPurchases(firestorePurchases);
      setProviders(firestoreProviders);
      setProjectPhotos(firestorePhotos);
      setProjectNotes(firestoreNotes);
    } catch (err) {
      console.error('[MyProjectTrace] Failed to fetch data from Firestore:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [isLiveFirestoreActive, currentCompany?.companyId]);

  useEffect(() => {
    if (isLiveFirestoreActive) {
      refreshProjectData();
    } else if (authState === 'DEMO_MODE') {
      const savedProjs = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);
      const savedPurch = localStorage.getItem(LOCAL_STORAGE_KEY_PURCHASES);
      const savedPay = localStorage.getItem(LOCAL_STORAGE_KEY_PAYMENTS);
      const savedPages = localStorage.getItem(LOCAL_STORAGE_KEY_PAGES);
      const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY_ITEMS);
      const savedProvs = localStorage.getItem(LOCAL_STORAGE_KEY_PROVIDERS);
      const savedPhotos = localStorage.getItem(LOCAL_STORAGE_KEY_PHOTOS);
      const savedNotes = localStorage.getItem(LOCAL_STORAGE_KEY_NOTES);

      setProjects(savedProjs ? JSON.parse(savedProjs) : DEMO_PROJECTS);
      setPurchases(savedPurch ? JSON.parse(savedPurch) : DEMO_PURCHASES);
      setPayments(savedPay ? JSON.parse(savedPay) : DEMO_PAYMENTS);
      setReceiptPages(savedPages ? JSON.parse(savedPages) : DEMO_RECEIPT_PAGES);
      setPurchaseItems(savedItems ? JSON.parse(savedItems) : DEMO_PURCHASE_ITEMS);
      setProviders(savedProvs ? JSON.parse(savedProvs) : DEMO_PROVIDERS);
      setProjectPhotos(savedPhotos ? JSON.parse(savedPhotos) : DEMO_PROJECT_PHOTOS);
      setProjectNotes(savedNotes ? JSON.parse(savedNotes) : DEMO_PROJECT_NOTES);
    } else {
      setProjects([]);
      setPurchases([]);
      setPayments([]);
      setReceiptPages([]);
      setPurchaseItems([]);
      setProviders([]);
      setProjectPhotos([]);
      setProjectNotes([]);
    }
  }, [authState, isLiveFirestoreActive, refreshProjectData]);

  // Sync Demo Mode local changes
  useEffect(() => {
    if (authState === 'DEMO_MODE') {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      localStorage.setItem(LOCAL_STORAGE_KEY_PURCHASES, JSON.stringify(purchases));
      localStorage.setItem(LOCAL_STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
      localStorage.setItem(LOCAL_STORAGE_KEY_PAGES, JSON.stringify(receiptPages));
      localStorage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(purchaseItems));
      localStorage.setItem(LOCAL_STORAGE_KEY_PROVIDERS, JSON.stringify(providers));
      localStorage.setItem(LOCAL_STORAGE_KEY_PHOTOS, JSON.stringify(projectPhotos));
      localStorage.setItem(LOCAL_STORAGE_KEY_NOTES, JSON.stringify(projectNotes));
    }
  }, [projects, purchases, payments, receiptPages, purchaseItems, providers, projectPhotos, projectNotes, authState]);

  // Only CONFIRMED purchases count towards financial metrics and project expenses
  const confirmedPurchases = useMemo(() => {
    return purchases.filter(p => p.captureStatus === 'CONFIRMED');
  }, [purchases]);

  // Draft / unconfirmed captures (DRAFT, UPLOADING, PROCESSING, NEEDS_REVIEW)
  const draftPurchases = useMemo(() => {
    return purchases.filter(p => p.captureStatus !== 'CONFIRMED' && p.captureStatus !== 'REJECTED');
  }, [purchases]);

  // Compute all alerts dynamically via the risk engine (using confirmed purchases only)
  const alerts = useMemo(() => {
    const allAlerts: FinancialAlert[] = [];
    projects.forEach(project => {
      const projAlerts = evaluateProjectFinancialRisk(
        project,
        confirmedPurchases,
        payments,
        currentCompany.settings
      );
      allAlerts.push(...projAlerts);
    });
    return allAlerts;
  }, [projects, confirmedPurchases, payments, currentCompany.settings]);

  // Calculate metrics for each project
  const allProjectMetrics = useMemo(() => {
    const map: Record<string, ProjectFinancialMetrics> = {};
    projects.forEach(project => {
      map[project.projectId] = calculateProjectMetrics(
        project,
        confirmedPurchases,
        payments,
        alerts
      );
    });
    return map;
  }, [projects, confirmedPurchases, payments, alerts]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => p.projectId === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const getProjectMetrics = (projectId: string): ProjectFinancialMetrics | null => {
    return allProjectMetrics[projectId] || null;
  };

  // ----------------------------------------------------
  // PHASE 1 MUTATIONS
  // ----------------------------------------------------
  const createProject = async (data: Omit<Project, 'projectId' | 'companyId' | 'createdAt'>): Promise<Project> => {
    const newProject: Project = {
      ...data,
      projectId: generateId('proj'),
      companyId: currentCompany.companyId,
      createdAt: new Date().toISOString(),
    };

    if (isLiveFirestoreActive) {
      try {
        await projectRepository.createProject(currentCompany.companyId, newProject);
        setProjects(prev => [newProject, ...prev]);
        return newProject;
      } catch (err) {
        console.error('[MyProjectTrace] Firestore createProject error:', err);
        throw new Error("We couldn't save this project. Please check your connection and try again.");
      }
    } else {
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    }
  };

  const updateProject = async (projectId: string, data: Partial<Project>): Promise<void> => {
    if (isLiveFirestoreActive) {
      try {
        await projectRepository.updateProject(currentCompany.companyId, projectId, data);
        setProjects(prev =>
          prev.map(p =>
            p.projectId === projectId
              ? { ...p, ...data, updatedAt: new Date().toISOString() }
              : p
          )
        );
      } catch (err) {
        console.error('[MyProjectTrace] Firestore updateProject error:', err);
        throw new Error("We couldn't save this project. Please check your connection and try again.");
      }
    } else {
      setProjects(prev =>
        prev.map(p =>
          p.projectId === projectId
            ? { ...p, ...data, updatedAt: new Date().toISOString() }
            : p
        )
      );
    }
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    if (isLiveFirestoreActive) {
      try {
        await projectRepository.deleteProject(currentCompany.companyId, projectId);
        setProjects(prev => prev.filter(p => p.projectId !== projectId));
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
      } catch (err) {
        console.error('[MyProjectTrace] Firestore deleteProject error:', err);
        throw new Error("We couldn't delete this project. Please check your connection and try again.");
      }
    } else {
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
    }
  };

  const addPayment = async (data: Omit<Payment, 'paymentId' | 'companyId' | 'createdAt'>): Promise<Payment> => {
    const newPayment: Payment = {
      ...data,
      paymentId: generateId('pay'),
      companyId: currentCompany.companyId,
      createdAt: new Date().toISOString(),
    };

    if (isLiveFirestoreActive) {
      try {
        await paymentRepository.createPayment(currentCompany.companyId, newPayment);
        setPayments(prev => [newPayment, ...prev]);
        return newPayment;
      } catch (err) {
        console.error('[MyProjectTrace] Firestore addPayment error:', err);
        throw new Error("We couldn't save this payment. Please check your connection and try again.");
      }
    } else {
      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    }
  };

  const updatePayment = async (paymentId: string, data: Partial<Payment>): Promise<Payment> => {
    if (isLiveFirestoreActive) {
      try {
        await paymentRepository.updatePayment(currentCompany.companyId, paymentId, data);
      } catch (err) {
        console.error('[MyProjectTrace] Firestore updatePayment error:', err);
        throw new Error("We couldn't update this payment. Please check your connection and try again.");
      }
    }

    let updatedPayment: Payment | null = null;
    setPayments(prev =>
      prev.map(p => {
        if (p.paymentId === paymentId) {
          updatedPayment = { ...p, ...data };
          return updatedPayment;
        }
        return p;
      })
    );

    if (!updatedPayment) {
      throw new Error('Payment record not found.');
    }

    return updatedPayment;
  };

  const deletePayment = async (paymentId: string): Promise<void> => {
    if (isLiveFirestoreActive) {
      try {
        await paymentRepository.deletePayment(currentCompany.companyId, paymentId);
      } catch (err) {
        console.error('[MyProjectTrace] Firestore deletePayment error:', err);
        throw new Error("We couldn't delete this payment. Please check your connection and try again.");
      }
    }

    setPayments(prev => prev.filter(p => p.paymentId !== paymentId));
  };

  const addPurchase = async (purchase: Purchase, pages: ReceiptPage[] = [], items: PurchaseItem[] = []) => {
    if (isLiveFirestoreActive) {
      try {
        await purchaseRepository.createPurchase(currentCompany.companyId, purchase, pages, items);
        setPurchases(prev => [purchase, ...prev]);
        if (pages.length > 0) {
          setReceiptPages(prev => [...prev, ...pages]);
        }
        if (items.length > 0) {
          setPurchaseItems(prev => [...prev, ...items]);
        }
      } catch (err) {
        console.error('[MyProjectTrace] Firestore addPurchase error:', err);
        throw new Error("We couldn't save this purchase. Please check your connection and try again.");
      }
    } else {
      setPurchases(prev => [purchase, ...prev]);
      if (pages.length > 0) {
        setReceiptPages(prev => [...prev, ...pages]);
      }
      if (items.length > 0) {
        setPurchaseItems(prev => [...prev, ...items]);
      }
    }
  };

  // ----------------------------------------------------
  // PHASE 2 CAPTURE & AI ANALYSIS MUTATIONS
  // ----------------------------------------------------
  const createDraftPurchase = async (projectId: string | null = null): Promise<Purchase> => {
    const newDraft: Purchase = {
      purchaseId: generateId('pur'),
      companyId: currentCompany.companyId,
      projectId: projectId || null,
      providerId: null,
      providerName: null,
      purchaseDate: new Date().toISOString().split('T')[0],
      subtotal: null,
      tax: null,
      totalAmount: 0,
      receiptNumber: null,
      paymentMethod: null,
      receiptPageCount: 0,
      aiExtractedTextSummary: '',
      aiConfidence: 0,
      aiWarnings: [],
      captureStatus: 'DRAFT',
      createdBy: currentUser.userId,
      createdAt: new Date().toISOString(),
    };

    if (isLiveFirestoreActive) {
      try {
        await purchaseRepository.createPurchase(currentCompany.companyId, newDraft, [], []);
        setPurchases(prev => [newDraft, ...prev]);
        return newDraft;
      } catch (err) {
        console.error('[MyProjectTrace] Firestore createDraftPurchase error:', err);
        throw new Error("We couldn't initialize the receipt draft. Please try again.");
      }
    } else {
      setPurchases(prev => [newDraft, ...prev]);
      return newDraft;
    }
  };

  const processReceiptCapture = async (
    purchaseId: string,
    files: File[],
    onProgress?: (status: CaptureStatus, stepText: string) => void
  ): Promise<{ purchase: Purchase; items: PurchaseItem[]; pages: ReceiptPage[] }> => {
    if (!files || files.length === 0) {
      throw new Error('At least one receipt photo is required.');
    }

    const companyId = currentCompany.companyId;

    // STEP 1: Client-Side Optimization & Storage Upload
    onProgress?.('UPLOADING', 'Reading receipt...');
    
    // Optimize images first to minimize network bandwidth and storage latency
    const { files: optimizedFiles } = await optimizeReceiptImages(files);

    // Update local & firestore status to UPLOADING
    const uploadingUpdate: Partial<Purchase> = {
      captureStatus: 'UPLOADING',
      receiptPageCount: optimizedFiles.length,
    };
    if (isLiveFirestoreActive) {
      await purchaseRepository.updatePurchase(companyId, purchaseId, uploadingUpdate);
    }
    setPurchases(prev => prev.map(p => p.purchaseId === purchaseId ? { ...p, ...uploadingUpdate } : p));

    // Upload optimized pages in parallel
    const uploadPromises = optimizedFiles.map(async (file, i) => {
      const pageNum = i + 1;
      const uploadRes = await storageService.uploadReceiptPageImage(companyId, purchaseId, pageNum, file);
      return {
        uploadedPage: {
          pageNumber: pageNum,
          file,
          previewUrl: uploadRes.imageUrl,
          imageStoragePath: uploadRes.imageStoragePath,
          imageUrl: uploadRes.imageUrl,
        } as PreparedReceiptPage,
        createdPage: {
          receiptPageId: `page_${generateId()}`,
          companyId,
          purchaseId,
          pageNumber: pageNum,
          imageStoragePath: uploadRes.imageStoragePath,
          imageUrl: uploadRes.imageUrl,
          createdAt: new Date().toISOString(),
        } as ReceiptPage,
      };
    });

    const uploadResults = await Promise.all(uploadPromises);
    const uploadedPages: PreparedReceiptPage[] = uploadResults.map(r => r.uploadedPage);
    const createdReceiptPages: ReceiptPage[] = uploadResults.map(r => r.createdPage);

    // STEP 2: Server-Side Gemini AI OCR & Line Item Extraction
    onProgress?.('PROCESSING', 'Extracting purchase details...');
    
    const processingUpdate: Partial<Purchase> = {
      captureStatus: 'PROCESSING',
    };
    if (isLiveFirestoreActive) {
      await purchaseRepository.updatePurchase(companyId, purchaseId, processingUpdate);
    }
    setPurchases(prev => prev.map(p => p.purchaseId === purchaseId ? { ...p, ...processingUpdate } : p));

    const analysisRes = await receiptAnalysisService.analyzeReceipt(
      companyId,
      purchaseId,
      uploadedPages
    );

    const { analysis, purchaseItems: newItems, warnings, modelUsed } = analysisRes;

    // STEP 3: Complete Analysis -> Transition to NEEDS_REVIEW
    onProgress?.('NEEDS_REVIEW', 'Extraction complete. Ready for verification.');

    const activeModel = modelUsed || 'gemini-2.5-flash';
    const analyzedPurchaseUpdate: Partial<Purchase> = {
      providerName: analysis.merchant_name || 'Unidentified Merchant',
      purchaseDate: analysis.transaction_date || new Date().toISOString().split('T')[0],
      receiptNumber: analysis.receipt_number || null,
      paymentMethod: analysis.payment_method_last4 || null,
      subtotal: analysis.subtotal,
      tax: analysis.tax,
      totalAmount: analysis.total !== null && analysis.total !== undefined ? analysis.total : 0,
      aiExtractedTextSummary: analysis.raw_text_summary,
      aiConfidence: analysis.confidence,
      aiWarnings: warnings,
      analysisVersion: `2.0.0-${activeModel}`,
      aiModel: activeModel,
      analyzedAt: new Date().toISOString(),
      captureStatus: 'NEEDS_REVIEW',
    };

    if (isLiveFirestoreActive) {
      try {
        await purchaseRepository.updatePurchase(companyId, purchaseId, analyzedPurchaseUpdate);
        await purchaseRepository.replacePurchaseItems(companyId, purchaseId, newItems);
      } catch (err) {
        console.error('[MyProjectTrace] Failed to save analyzed receipt to Firestore:', err);
        throw new Error("We couldn't save the AI receipt analysis results. Please try again.");
      }
    }

    // Update React states
    let finalUpdatedPurchase: Purchase | null = null;
    setPurchases(prev =>
      prev.map(p => {
        if (p.purchaseId === purchaseId) {
          finalUpdatedPurchase = { ...p, ...analyzedPurchaseUpdate };
          return finalUpdatedPurchase;
        }
        return p;
      })
    );

    // Save pages and replace items in memory
    setReceiptPages(prev => [
      ...prev.filter(page => page.purchaseId !== purchaseId),
      ...createdReceiptPages,
    ]);

    setPurchaseItems(prev => [
      ...prev.filter(item => item.purchaseId !== purchaseId),
      ...newItems,
    ]);

    return {
      purchase: finalUpdatedPurchase || ({ ...analyzedPurchaseUpdate, purchaseId, companyId } as Purchase),
      items: newItems,
      pages: createdReceiptPages,
    };
  };

  const retryReceiptAnalysis = async (
    purchaseId: string,
    files?: File[],
    onProgress?: (status: CaptureStatus, stepText: string) => void
  ): Promise<{ purchase: Purchase; items: PurchaseItem[]; pages: ReceiptPage[] }> => {
    // If new files were supplied, run full capture workflow
    if (files && files.length > 0) {
      return processReceiptCapture(purchaseId, files, onProgress);
    }

    // Otherwise use existing stored pages
    const existingPages = receiptPages.filter(p => p.purchaseId === purchaseId);
    if (existingPages.length === 0) {
      throw new Error('No receipt images available for retry analysis. Please take or upload new photos.');
    }

    onProgress?.('PROCESSING', 'Re-analyzing stored receipt pages with Gemini AI...');

    const preparedPages: PreparedReceiptPage[] = existingPages.map(p => ({
      pageNumber: p.pageNumber,
      file: new File([], `page_${p.pageNumber}.jpg`), // dummy file object
      previewUrl: p.imageUrl,
      imageStoragePath: p.imageStoragePath,
      imageUrl: p.imageUrl,
    }));

    const analysisRes = await receiptAnalysisService.analyzeReceipt(
      currentCompany.companyId,
      purchaseId,
      preparedPages
    );

    const { analysis, purchaseItems: newItems, warnings, modelUsed } = analysisRes;

    const activeModel = modelUsed || 'gemini-2.5-flash';
    const analyzedPurchaseUpdate: Partial<Purchase> = {
      providerName: analysis.merchant_name || 'Unidentified Merchant',
      purchaseDate: analysis.transaction_date || new Date().toISOString().split('T')[0],
      receiptNumber: analysis.receipt_number || null,
      paymentMethod: analysis.payment_method_last4 || null,
      subtotal: analysis.subtotal,
      tax: analysis.tax,
      totalAmount: analysis.total !== null && analysis.total !== undefined ? analysis.total : 0,
      aiExtractedTextSummary: analysis.raw_text_summary,
      aiConfidence: analysis.confidence,
      aiWarnings: warnings,
      analysisVersion: `2.0.0-${activeModel}`,
      aiModel: activeModel,
      analyzedAt: new Date().toISOString(),
      captureStatus: 'NEEDS_REVIEW',
    };

    if (isLiveFirestoreActive) {
      await purchaseRepository.updatePurchase(currentCompany.companyId, purchaseId, analyzedPurchaseUpdate);
      await purchaseRepository.replacePurchaseItems(currentCompany.companyId, purchaseId, newItems);
    }

    let finalUpdatedPurchase: Purchase | null = null;
    setPurchases(prev =>
      prev.map(p => {
        if (p.purchaseId === purchaseId) {
          finalUpdatedPurchase = { ...p, ...analyzedPurchaseUpdate };
          return finalUpdatedPurchase;
        }
        return p;
      })
    );

    // Replace items idempotently
    setPurchaseItems(prev => [
      ...prev.filter(item => item.purchaseId !== purchaseId),
      ...newItems,
    ]);

    return {
      purchase: finalUpdatedPurchase || ({ ...analyzedPurchaseUpdate, purchaseId, companyId: currentCompany.companyId } as Purchase),
      items: newItems,
      pages: existingPages,
    };
  };

  const addCompanyProvider = async (providerName: string, category: string = 'General Supplier'): Promise<Provider> => {
    const newProv = await createQuickProvider(
      currentCompany.companyId,
      providerName,
      category,
      isLiveFirestoreActive
    );
    setProviders(prev => {
      // Avoid duplicate names in state
      if (prev.some(p => p.providerName.toLowerCase() === newProv.providerName.toLowerCase())) {
        return prev;
      }
      return [...prev, newProv];
    });
    return newProv;
  };

  const checkPurchaseDuplicates = (pending: DuplicateCheckInput): DuplicatePurchaseCandidate[] => {
    return detectPurchaseDuplicates(pending, purchases);
  };

  const confirmPurchaseDraft = async (payload: ConfirmPurchasePayload): Promise<Purchase> => {
    const existing = purchases.find(p => p.purchaseId === payload.purchaseId);
    
    // Strict Validation
    const validation = validatePurchaseConfirmation(payload, currentUser, projects, existing);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    if (!currentUser) {
      throw new Error('User session not found.');
    }

    // Execute idempotent update
    const confirmationUpdates = await executePurchaseConfirmation(
      payload,
      currentUser,
      isLiveFirestoreActive
    );

    let confirmedResult: Purchase | null = null;

    setPurchases(prev =>
      prev.map(p => {
        if (p.purchaseId === payload.purchaseId) {
          confirmedResult = {
            ...p,
            ...confirmationUpdates,
          };
          return confirmedResult;
        }
        return p;
      })
    );

    // If a new provider was typed in and not existing in list, register it
    if (payload.providerName && !providers.some(p => p.providerName.toLowerCase() === payload.providerName.toLowerCase())) {
      addCompanyProvider(payload.providerName).catch(() => {});
    }

    if (!confirmedResult) {
      throw new Error('Purchase record could not be updated.');
    }

    return confirmedResult;
  };

  const rejectPurchaseDraft = async (purchaseId: string): Promise<void> => {
    const rejectionUpdate: Partial<Purchase> = {
      captureStatus: 'REJECTED',
    };

    if (isLiveFirestoreActive) {
      await purchaseRepository.updatePurchase(currentCompany.companyId, purchaseId, rejectionUpdate);
    }

    setPurchases(prev =>
      prev.map(p => (p.purchaseId === purchaseId ? { ...p, ...rejectionUpdate } : p))
    );
  };

  const deleteDraftPurchase = async (purchaseId: string): Promise<void> => {
    if (isLiveFirestoreActive) {
      try {
        await purchaseRepository.deletePurchase(currentCompany.companyId, purchaseId);
      } catch (err) {
        console.error('[MyProjectTrace] Error deleting draft purchase:', err);
      }
    }
    setPurchases(prev => prev.filter(p => p.purchaseId !== purchaseId));
    setReceiptPages(prev => prev.filter(p => p.purchaseId !== purchaseId));
    setPurchaseItems(prev => prev.filter(i => i.purchaseId !== purchaseId));
  };

  // Progress Photo Mutations
  const addProjectPhoto = async (
    projectId: string, 
    photoData: Omit<ProjectPhoto, 'photoId' | 'companyId' | 'createdAt'>
  ): Promise<ProjectPhoto> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    const photoId = generateId('photo');
    const newPhoto: ProjectPhoto = {
      ...photoData,
      photoId,
      companyId,
      projectId,
      createdAt: new Date().toISOString(),
      takenAt: photoData.takenAt || new Date().toISOString().split('T')[0],
      uploadedBy: photoData.uploadedBy || currentUser?.name || 'Staff',
    };

    if (isLiveFirestoreActive) {
      await progressPhotoRepository.addProjectPhoto(companyId, projectId, newPhoto);
    }

    setProjectPhotos(prev => [newPhoto, ...prev]);
    return newPhoto;
  };

  const addMultipleProjectPhotos = async (
    projectId: string, 
    photosData: Array<{ imageUrl: string; mediaType?: 'photo' | 'video'; videoUrl?: string; caption?: string; phase?: PhotoPhase; tags?: string[]; takenAt?: string }>
  ): Promise<ProjectPhoto[]> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    const createdList: ProjectPhoto[] = [];

    for (const item of photosData) {
      const photoId = generateId('photo');
      const newPhoto: ProjectPhoto = {
        photoId,
        companyId,
        projectId,
        imageUrl: item.imageUrl,
        mediaType: item.mediaType || (item.imageUrl.startsWith('data:video') || item.imageUrl.includes('.mp4') || item.imageUrl.includes('.webm') ? 'video' : 'photo'),
        videoUrl: item.videoUrl,
        caption: item.caption || '',
        phase: item.phase || 'IN_PROGRESS',
        tags: item.tags || [],
        takenAt: item.takenAt || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        uploadedBy: currentUser?.name || 'Staff',
      };

      if (isLiveFirestoreActive) {
        await progressPhotoRepository.addProjectPhoto(companyId, projectId, newPhoto);
      }
      createdList.push(newPhoto);
    }

    setProjectPhotos(prev => [...createdList, ...prev]);
    return createdList;
  };

  const deleteProjectPhoto = async (photoId: string, projectId: string): Promise<void> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    if (isLiveFirestoreActive) {
      await progressPhotoRepository.deleteProjectPhoto(companyId, projectId, photoId);
    }
    setProjectPhotos(prev => prev.filter(p => p.photoId !== photoId));
  };

  // Project Notes & Specs Mutations
  const addProjectNote = async (
    projectId: string, 
    noteData: Omit<ProjectNote, 'noteId' | 'companyId' | 'createdAt'>
  ): Promise<ProjectNote> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    const noteId = generateId('note');
    const newNote: ProjectNote = {
      ...noteData,
      noteId,
      companyId,
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: noteData.createdBy || currentUser?.name || 'Staff',
    };

    if (isLiveFirestoreActive) {
      await projectNoteRepository.addProjectNote(companyId, projectId, newNote);
    }

    setProjectNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  const updateProjectNote = async (
    projectId: string, 
    noteId: string, 
    updates: Partial<ProjectNote>
  ): Promise<void> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    if (isLiveFirestoreActive) {
      await projectNoteRepository.updateProjectNote(companyId, projectId, noteId, updates);
    }
    setProjectNotes(prev =>
      prev.map(n => (n.noteId === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
    );
  };

  const deleteProjectNote = async (projectId: string, noteId: string): Promise<void> => {
    const companyId = currentCompany?.companyId || DEMO_COMPANY.companyId;
    if (isLiveFirestoreActive) {
      await projectNoteRepository.deleteProjectNote(companyId, projectId, noteId);
    }
    setProjectNotes(prev => prev.filter(n => n.noteId !== noteId));
  };

  // Report & Export Helpers
  const exportProjectPdf = async (projectId: string): Promise<void> => {
    const project = projects.find(p => p.projectId === projectId);
    if (!project) return;

    const metrics = getProjectMetrics(projectId);
    if (!metrics) return;

    const projectPurchases = getProjectPurchases(projectId).filter(p => p.captureStatus === 'CONFIRMED');
    const projectPayments = getProjectPayments(projectId);
    const projectNotesList = getProjectNotes(projectId);
    const projectPhotosList = getProjectPhotos(projectId);
    const company = currentCompany || DEMO_COMPANY;

    await generateProjectPdfReport({
      project,
      metrics,
      purchases: projectPurchases,
      payments: projectPayments,
      notes: projectNotesList,
      photos: projectPhotosList,
      company,
      authorName: currentUser?.name || 'Staff',
    });
  };

  const exportProjectExcel = (projectId: string): void => {
    const project = projects.find(p => p.projectId === projectId);
    if (!project) return;

    const metrics = getProjectMetrics(projectId);
    if (!metrics) return;

    const projectPurchases = getProjectPurchases(projectId).filter(p => p.captureStatus === 'CONFIRMED');
    const projectPayments = getProjectPayments(projectId);
    const projectPurchasesIds = new Set(projectPurchases.map(p => p.purchaseId));
    const projectPurchaseItems = purchaseItems.filter(i => projectPurchasesIds.has(i.purchaseId));
    const projectNotesList = getProjectNotes(projectId);
    const company = currentCompany || DEMO_COMPANY;

    generateProjectExcelTaxReport({
      project,
      metrics,
      purchases: projectPurchases,
      payments: projectPayments,
      purchaseItems: projectPurchaseItems,
      notes: projectNotesList,
      company,
    });
  };

  const exportCompanyCpaExcel = (): void => {
    const company = currentCompany || DEMO_COMPANY;
    const confirmedPurchases = purchases.filter(p => p.captureStatus === 'CONFIRMED');
    const confirmedPurchaseIds = new Set(confirmedPurchases.map(p => p.purchaseId));
    const relevantItems = purchaseItems.filter(i => confirmedPurchaseIds.has(i.purchaseId));

    generateCompanyCpaExcelReport({
      company,
      projects,
      purchases: confirmedPurchases,
      payments,
      purchaseItems: relevantItems,
      notes: projectNotes,
      photos: projectPhotos,
      authorName: currentUser?.name || 'Company Admin',
    });
  };

  const exportAnnualExcel = (year: number): void => {
    const company = currentCompany || DEMO_COMPANY;
    const confirmedPurchases = purchases.filter(p => p.captureStatus === 'CONFIRMED');
    const confirmedPurchaseIds = new Set(confirmedPurchases.map(p => p.purchaseId));
    const relevantItems = purchaseItems.filter(i => confirmedPurchaseIds.has(i.purchaseId));

    generateAnnualExcelReport({
      year,
      company,
      projects,
      purchases: confirmedPurchases,
      payments,
      purchaseItems: relevantItems,
      alerts,
      authorName: currentUser?.name || 'Company Admin',
    });
  };

  const exportAnnualPdf = async (year: number): Promise<void> => {
    const company = currentCompany || DEMO_COMPANY;
    const confirmedPurchases = purchases.filter(p => p.captureStatus === 'CONFIRMED');

    await generateAnnualPdfReport({
      year,
      company,
      projects,
      purchases: confirmedPurchases,
      payments,
      authorName: currentUser?.name || 'Company Admin',
    });
  };

  const getProjectPurchases = (projectId: string) => {
    return purchases.filter(p => p.projectId === projectId);
  };

  const getProjectPayments = (projectId: string) => {
    return payments.filter(p => p.projectId === projectId);
  };

  const getProjectAlerts = (projectId: string) => {
    return alerts.filter(a => a.projectId === projectId);
  };

  const getPurchaseReceiptPages = (purchaseId: string) => {
    return receiptPages
      .filter(p => p.purchaseId === purchaseId)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  };

  const getPurchaseItems = (purchaseId: string) => {
    return purchaseItems.filter(item => item.purchaseId === purchaseId);
  };

  const getPurchaseById = (purchaseId: string) => {
    return purchases.find(p => p.purchaseId === purchaseId);
  };

  const getProjectPhotos = (projectId: string) => {
    return projectPhotos.filter(ph => ph.projectId === projectId);
  };

  const getProjectNotes = (projectId: string) => {
    return projectNotes.filter(n => n.projectId === projectId);
  };

  const acknowledgeAlert = (_alertId: string) => {
    // Alert acknowledged in reactive view
  };

  const resetToDemoData = () => {
    if (authState !== 'DEMO_MODE') return;
    setProjects(DEMO_PROJECTS);
    setPurchases(DEMO_PURCHASES);
    setPayments(DEMO_PAYMENTS);
    setReceiptPages(DEMO_RECEIPT_PAGES);
    setPurchaseItems(DEMO_PURCHASE_ITEMS);
    setProjectPhotos(DEMO_PROJECT_PHOTOS);
    setProjectNotes(DEMO_PROJECT_NOTES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PROJECTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PURCHASES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PAYMENTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PAGES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ITEMS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PHOTOS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_NOTES);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        purchases,
        payments,
        receiptPages,
        purchaseItems,
        providers,
        alerts,
        draftPurchases,
        projectPhotos,
        projectNotes,
        selectedProjectId,
        setSelectedProjectId,
        selectedProject,
        getProjectMetrics,
        allProjectMetrics,
        isLoadingProjects,
        createProject,
        updateProject,
        deleteProject,
        addPayment,
        updatePayment,
        deletePayment,
        addPurchase,
        createDraftPurchase,
        processReceiptCapture,
        retryReceiptAnalysis,
        deleteDraftPurchase,
        addCompanyProvider,
        confirmPurchaseDraft,
        rejectPurchaseDraft,
        checkPurchaseDuplicates,
        addProjectPhoto,
        addMultipleProjectPhotos,
        deleteProjectPhoto,
        addProjectNote,
        updateProjectNote,
        deleteProjectNote,
        exportProjectPdf,
        exportProjectExcel,
        exportCompanyCpaExcel,
        exportAnnualExcel,
        exportAnnualPdf,
        getProjectPurchases,
        getProjectPayments,
        getProjectAlerts,
        getPurchaseReceiptPages,
        getPurchaseItems,
        getPurchaseById,
        getProjectPhotos,
        getProjectNotes,
        acknowledgeAlert,
        resetToDemoData,
        refreshProjectData,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
