/**
 * Firebase Storage Structure for MyProjectTrace
 * 
 * Rules:
 * - Company-isolated paths: companies/{companyId}/purchases/{purchaseId}/receipt-images/
 * - Original images are never deleted after extraction.
 * - Extracted text artifacts: companies/{companyId}/purchases/{purchaseId}/extracted/
 */

export interface StoragePaths {
  receiptImage: (companyId: string, purchaseId: string, pageNumber: number, filename: string) => string;
  extractedArtifact: (companyId: string, purchaseId: string, filename: string) => string;
  paymentEvidence: (companyId: string, projectId: string, paymentId: string, filename: string) => string;
}

export const STORAGE_PATHS: StoragePaths = {
  receiptImage: (companyId: string, purchaseId: string, pageNumber: number, filename: string) =>
    `companies/${companyId}/purchases/${purchaseId}/receipt-images/page_${String(pageNumber).padStart(3, '0')}_${filename}`,
  
  extractedArtifact: (companyId: string, purchaseId: string, filename: string) =>
    `companies/${companyId}/purchases/${purchaseId}/extracted/${filename}`,

  paymentEvidence: (companyId: string, projectId: string, paymentId: string, filename: string) =>
    `companies/${companyId}/projects/${projectId}/payments/${paymentId}/${filename}`,
};

export function getCanonicalReceiptImagePath(companyId: string, purchaseId: string, pageNumber: number): string {
  return `companies/${companyId}/purchases/${purchaseId}/receipt-images/receipt_page_${String(pageNumber).padStart(3, '0')}.jpg`;
}
