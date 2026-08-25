/**
 * MyProjectTrace - Project Financial Capture & Early Warning System
 * Core TypeScript Definitions
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'FIELD_USER';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export type CaptureStatus = 
  | 'DRAFT'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'NEEDS_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED';

export type PaymentType = 
  | 'DEPOSIT'
  | 'PROGRESS_PAYMENT'
  | 'CHANGE_ORDER_PAYMENT'
  | 'FINAL_PAYMENT'
  | 'OTHER';

export type PaymentStatus = 
  | 'PENDING'
  | 'RECEIVED'
  | 'CLEARED'
  | 'CANCELLED';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type AlertType = 
  | 'SPENDING_EXCEEDS_COLLECTIONS'
  | 'NEGATIVE_CASH_POSITION'
  | 'LOW_GROSS_MARGIN'
  | 'HIGH_ACCOUNTS_RECEIVABLE'
  | 'LARGE_PURCHASE'
  | 'UNUSUAL_SPENDING_PATTERN'
  | 'UNRECONCILED_RECEIPT_TOTAL';

export interface CompanySettings {
  minimumGrossMarginThreshold: number; // e.g. 0.20 for 20%
  largePurchaseThreshold: number; // e.g. 1500 USD
  currency: string; // 'USD'
  arWarningThreshold?: number; // e.g. 15000 USD
}

export interface Company {
  companyId: string;
  companyName: string;
  ownerUid: string;
  tradeType?: 'GENERAL_CONTRACTOR' | 'REMODELER' | 'PAINTER' | 'ELECTRICIAN' | 'PLUMBER' | 'HVAC' | 'FLOORING' | 'OTHER';
  settings: CompanySettings;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Project {
  projectId: string;
  companyId: string;
  projectName: string;
  clientName: string;
  projectAddress: string;
  contractValue: number;
  approvedChangeOrders: number;
  startDate: string;
  status: ProjectStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectFinancialMetrics {
  projectId: string;
  contractValue: number;
  approvedChangeOrders: number;
  totalContractValue: number; // contractValue + approvedChangeOrders
  totalPurchases: number; // Sum of confirmed purchase totals
  totalCollected: number; // Sum of received/cleared payments
  accountsReceivable: number; // totalContractValue - totalCollected
  cashPosition: number; // totalCollected - totalPurchases
  grossProjectPosition: number; // totalContractValue - totalPurchases (Contractor Gross Position)
  grossMarginEstimate: number; // grossProjectPosition / totalContractValue (0.0 to 1.0)
  confirmedPurchasesCount: number;
  paymentsCount: number;
  openAlertsCount: number;
  highestAlertSeverity?: AlertSeverity | null;
}

export interface Provider {
  providerId: string;
  companyId: string;
  providerName: string;
  normalizedName: string;
  category?: string;
  createdAt?: string;
}

export interface AdditionalSpecification {
  name: string;
  value: string;
}

export interface PurchaseItem {
  itemId: string;
  companyId: string;
  purchaseId: string;
  description: string | null;
  sku?: string | null;
  productCode?: string | null;
  modelNumber?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  finish?: string | null;
  size?: string | null;
  dimensions?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  rawItemText: string;
  additionalSpecifications: AdditionalSpecification[];
  sourcePageNumbers: number[];
  confidence: number; // 0.0 - 1.0
  createdAt: string;
}

export interface ReceiptPage {
  receiptPageId: string;
  companyId: string;
  purchaseId: string;
  pageNumber: number; // 1-indexed order
  imageStoragePath: string;
  imageUrl: string;
  extractedText?: string;
  aiConfidence?: number;
  createdAt: string;
}

export interface Purchase {
  purchaseId: string;
  companyId: string;
  projectId: string | null; // null during initial draft / processing
  providerId: string | null;
  providerName?: string | null;
  purchaseDate: string; // YYYY-MM-DD
  subtotal: number | null;
  tax: number | null;
  totalAmount: number; // Authority financial total counted ONCE in project totals
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  receiptPageCount: number;
  aiExtractedTextSummary?: string;
  fullTextStoragePath?: string;
  aiConfidence: number; // 0.0 to 1.0
  aiWarnings: string[];
  analysisVersion?: string;
  aiModel?: string;
  analyzedAt?: string;
  captureStatus: CaptureStatus;
  createdBy: string;
  createdAt: string;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  duplicateWarningAcknowledged?: boolean;
  userEditedFields?: string[];
  manualEntry?: boolean;
}

export interface Payment {
  paymentId: string;
  companyId: string;
  projectId: string;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  paymentType: PaymentType;
  paymentMethod: string;
  referenceNumber?: string | null;
  evidenceUrl?: string | null;
  evidenceUrls?: string[];
  payerName?: string | null; // Person or entity who made the payment
  status: PaymentStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  aiConfidence?: number;
  aiExtractedSummary?: string;
}

export interface AIPaymentAnalysisResult {
  payment_date: string | null; // YYYY-MM-DD
  amount: number | null; // USD
  payer_name: string | null; // Person or entity who made the payment
  payment_method: string | null; // Check, Zelle, Wire Transfer, Credit Card, ACH, Cash, etc.
  reference_number: string | null; // Check #, transaction confirmation code
  payment_type_hint: PaymentType | null;
  notes_summary: string | null;
  full_extracted_text: string;
  confidence: number; // 0.0 to 1.0
  warnings: string[];
}

export interface FinancialAlert {
  alertId: string;
  companyId: string;
  projectId: string;
  projectName?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  whyItMatters?: string;
  recommendedAction?: string;
  detectedValue: number;
  threshold: number;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface AIReceiptAnalysisResult {
  merchant_name: string | null;
  transaction_date: string | null; // YYYY-MM-DD
  receipt_number: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  payment_method_last4: string | null;
  items: Array<{
    description: string | null;
    sku: string | null;
    product_code: string | null;
    model_number: string | null;
    brand: string | null;
    manufacturer: string | null;
    category: string | null;
    color_name: string | null;
    color_code: string | null;
    finish: string | null;
    size: string | null;
    dimensions: string | null;
    quantity: number | null;
    unit: string | null;
    unit_price: number | null;
    line_total: number | null;
    additional_specifications: AdditionalSpecification[];
    raw_item_text: string;
    source_page_numbers: number[];
    confidence: number;
  }>;
  full_extracted_text: string;
  raw_text_summary: string;
  confidence: number; // 0.0 to 1.0
  warnings: string[];
}

export interface DuplicatePurchaseCandidate {
  existingPurchase: Purchase;
  matchScore: number; // 0 to 100
  matchedFields: string[];
  matchLevel: 'EXACT' | 'STRONG' | 'POSSIBLE';
  reason: string;
}

export type PhotoPhase = 'BEFORE' | 'IN_PROGRESS' | 'AFTER' | 'INSPECTION' | 'GENERAL';

export interface ProjectPhoto {
  photoId: string;
  companyId: string;
  projectId: string;
  imageUrl: string;
  mediaType?: 'photo' | 'video';
  videoUrl?: string;
  caption?: string;
  phase: PhotoPhase;
  tags?: string[];
  takenAt: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  uploadedBy?: string;
}

export type NoteCategory = 'PAINT_COLOR' | 'SPECIFICATION' | 'ACCESS_SITE' | 'CLIENT' | 'GENERAL';

export interface ColorCodeItem {
  label?: string; // e.g. "Main Walls", "Trim", "Cabinets", "Ceiling"
  name?: string;  // Alias for label
  code: string;  // e.g. "SW 7005 Pure White" or "HC-154"
  brand?: string; // e.g. "Sherwin-Williams", "Benjamin Moore", "Behr"
  finish?: string; // e.g. "Eggshell", "Satin", "Semi-Gloss", "Flat"
  hexPreview?: string; // e.g. "#F4F1EA"
  hexColor?: string; // Alias for hexPreview
}

export interface ProjectNote {
  noteId: string;
  companyId: string;
  projectId: string;
  title: string;
  content: string;
  category: NoteCategory;
  colorCodes?: ColorCodeItem[];
  tags?: string[];
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// ==========================================
// LUKY - FINANCIAL ASSISTANT TYPES
// ==========================================

export type LukyActionType = 'RECORD_PAYMENT' | 'ADD_PROJECT_NOTE' | 'SET_PROJECT_STATUS';

export interface LukyProposedAction {
  id: string;
  type: LukyActionType;
  title: string;
  explanation: string;
  payload: {
    projectId?: string;
    projectName?: string;
    amount?: number;
    paymentType?: PaymentType;
    paymentDate?: string;
    paymentMethod?: string;
    status?: PaymentStatus;
    noteTitle?: string;
    noteContent?: string;
    noteCategory?: NoteCategory;
    projectStatus?: ProjectStatus;
    [key: string]: any;
  };
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXECUTED';
  resultMessage?: string;
}

export interface LukyExportOption {
  type: 'ANNUAL_EXCEL' | 'ANNUAL_PDF' | 'PROJECT_PDF' | 'CPA_EXCEL';
  year?: number;
  projectId?: string;
  projectName?: string;
  label: string;
}

export interface LukyDataHighlight {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export interface LukyMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  exportOptions?: LukyExportOption[];
  proposedAction?: LukyProposedAction;
  dataHighlights?: LukyDataHighlight[];
  isError?: boolean;
}

export interface AnnualMonthlyBreakdown {
  month: string; // e.g. "January"
  monthIndex: number; // 0-11
  payments: number;
  purchases: number;
  netCashMovement: number;
}

export interface AnnualProjectSummary {
  projectId: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  originalContractValue: number;
  approvedAdditions: number;
  totalContractValue: number;
  paymentsReceivedInYear: number;
  purchasesInYear: number;
  annualRecordedCashMovement: number;
  currentTotalCollected: number;
  currentTotalSpend: number;
  currentAccountsReceivable: number;
  currentGrossProfit: number;
  currentGrossMarginPct: number;
}

export interface AnnualProviderSummary {
  providerName: string;
  purchasesCount: number;
  totalSpend: number;
  percentageOfAnnualSpend: number;
  averagePurchase: number;
  mostRecentPurchaseDate?: string;
}

export interface AnnualFinancialSummary {
  year: number;
  totalValidPaymentsReceived: number;
  totalRecordedPurchases: number;
  netRecordedCashMovement: number;
  projectsWithActivityCount: number;
  purchasesCount: number;
  paymentsCount: number;
  currentAccountsReceivable: number;
  averageProjectGrossMargin: number;
  highestSpendingProject?: { projectId: string; projectName: string; amount: number };
  lowestMarginProject?: { projectId: string; projectName: string; marginPct: number };
  topProvider?: { name: string; amount: number; percentage: number };
  monthlyBreakdown: AnnualMonthlyBreakdown[];
  projectSummaries: AnnualProjectSummary[];
  providerSummaries: AnnualProviderSummary[];
}

