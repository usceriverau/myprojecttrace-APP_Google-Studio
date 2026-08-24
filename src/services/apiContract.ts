/**
 * MyProjectTrace API & Service Contract
 * 
 * Clean REST-compatible interfaces and service contracts ensuring that the backend
 * can be consumed by FlutterFlow, native Android, and web clients without altering
 * core financial or AI logic.
 */

import {
  Purchase,
  ReceiptPage,
  PurchaseItem,
  Payment,
  Project,
  ProjectFinancialMetrics,
  FinancialAlert,
  AIReceiptAnalysisResult,
  DuplicatePurchaseCandidate,
} from '../types';

// ==========================================
// 1. PURCHASES & RECEIPT API CONTRACT
// ==========================================

export interface CreateDraftPurchaseRequest {
  companyId: string;
  projectId?: string | null;
  createdBy: string;
}

export interface CreateDraftPurchaseResponse {
  purchaseId: string;
  companyId: string;
  captureStatus: 'DRAFT';
  createdAt: string;
}

export interface UploadReceiptPagePayload {
  companyId: string;
  purchaseId: string;
  pageNumber: number;
  imageStoragePath: string;
  imageUrl: string;
}

export interface AnalyzeReceiptRequest {
  companyId: string;
  purchaseId: string;
  receiptPages: Array<{
    pageNumber: number;
    imageStoragePath?: string;
    imageUrl?: string;
    imageBase64?: string; // For direct processing in server handler
    mimeType?: string;
  }>;
}

export interface AnalyzeReceiptResponse {
  purchaseId: string;
  analysis: AIReceiptAnalysisResult;
  extractedItemsCount: number;
  warnings: string[];
  suggestedProjectId?: string | null;
}

export interface CheckDuplicatePurchasesRequest {
  companyId: string;
  providerName?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  receiptNumber?: string | null;
  excludePurchaseId?: string | null;
}

export interface CheckDuplicatePurchasesResponse {
  hasPotentialDuplicate: boolean;
  candidates: DuplicatePurchaseCandidate[];
}

export interface ConfirmPurchaseRequest {
  companyId: string;
  purchaseId: string;
  projectId: string; // Mandatory for confirmation
  providerName: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number; // Authority single financial total
  subtotal?: number | null;
  tax?: number | null;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  items?: Array<{
    description: string | null;
    rawItemText: string;
    brand?: string | null;
    sku?: string | null;
    modelNumber?: string | null;
    colorName?: string | null;
    finish?: string | null;
    size?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    lineTotal?: number | null;
    additionalSpecifications?: Array<{ name: string; value: string }>;
    sourcePageNumbers: number[];
  }>;
}

export interface ConfirmPurchaseResponse {
  purchase: Purchase;
  updatedProjectMetrics: ProjectFinancialMetrics;
  generatedAlerts: FinancialAlert[];
}

// ==========================================
// 2. PAYMENTS API CONTRACT
// ==========================================

export interface RecordPaymentRequest {
  companyId: string;
  projectId: string;
  paymentDate: string;
  amount: number;
  paymentType: 'DEPOSIT' | 'PROGRESS_PAYMENT' | 'CHANGE_ORDER_PAYMENT' | 'FINAL_PAYMENT' | 'OTHER';
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
  evidenceUrl?: string | null;
  createdBy: string;
}

export interface RecordPaymentResponse {
  payment: Payment;
  updatedProjectMetrics: ProjectFinancialMetrics;
  generatedAlerts: FinancialAlert[];
}

// ==========================================
// 3. PROJECTS & DASHBOARD API CONTRACT
// ==========================================

export interface CreateProjectRequest {
  companyId: string;
  projectName: string;
  clientName: string;
  projectAddress: string;
  contractValue: number;
  approvedChangeOrders?: number;
  startDate: string;
  notes?: string;
}

export interface GetDashboardResponse {
  companyId: string;
  activeProjectsCount: number;
  totalContractValue: number;
  totalCollected: number;
  totalAccountsReceivable: number;
  totalPurchases: number;
  currentCashPosition: number;
  openAlerts: FinancialAlert[];
  projectsWithMetrics: Array<{
    project: Project;
    metrics: ProjectFinancialMetrics;
  }>;
}

// ==========================================
// 4. PROJECT FINANCIAL ASSISTANT CONTRACT
// ==========================================

export interface AssistantQueryRequest {
  companyId: string;
  query: string;
  projectId?: string | null;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface AssistantQueryResponse {
  answer: string;
  referencedProjects?: string[];
  referencedPurchases?: string[];
  referencedItems?: string[];
  confidence: number;
}
