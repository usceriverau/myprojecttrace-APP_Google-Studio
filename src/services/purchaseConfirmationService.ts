/**
 * MyProjectTrace - Purchase Confirmation & Validation Service
 * 
 * Validates confirmed purchase inputs and executes idempotent updates from
 * draft/analyzed status to CONFIRMED status.
 */

import { Purchase, Project, User } from '../types';
import { purchaseRepository } from './firebase/financialDataRepository';

export interface ConfirmPurchasePayload {
  purchaseId: string;
  companyId: string;
  projectId: string;
  providerId: string | null;
  providerName: string;
  purchaseDate: string; // YYYY-MM-DD
  subtotal: number | null;
  tax: number | null;
  totalAmount: number;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  duplicateWarningAcknowledged?: boolean;
  userEditedFields?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Pure validation rule engine for Purchase confirmation
 */
export function validatePurchaseConfirmation(
  payload: ConfirmPurchasePayload,
  currentUser: User | null,
  companyProjects: Project[],
  existingPurchase?: Purchase | null
): ValidationResult {
  const errors: string[] = [];

  // 1. User & Authentication
  if (!currentUser || !currentUser.userId) {
    errors.push('Authenticated user session required to confirm purchase.');
  }

  // 2. Company Identity
  if (!payload.companyId) {
    errors.push('Invalid company context.');
  }

  if (currentUser && currentUser.companyId !== payload.companyId) {
    errors.push('User does not belong to the target company workspace.');
  }

  // 3. Purchase Existence & Ownership
  if (!payload.purchaseId) {
    errors.push('Purchase ID is required.');
  }

  if (existingPurchase && existingPurchase.companyId !== payload.companyId) {
    errors.push('Cross-company purchase access violation.');
  }

  // 4. Project Selection (MANDATORY)
  if (!payload.projectId || payload.projectId.trim() === '') {
    errors.push('Select a project before confirming this purchase.');
  } else {
    const assignedProject = companyProjects.find(p => p.projectId === payload.projectId);
    if (!assignedProject) {
      errors.push('Selected project does not exist or does not belong to your company.');
    } else if (assignedProject.companyId !== payload.companyId) {
      errors.push('Cross-company project assignment is strictly prohibited.');
    }
  }

  // 5. Provider / Merchant
  if (!payload.providerName || payload.providerName.trim() === '') {
    errors.push('Merchant / Provider name is required.');
  }

  // 6. Purchase Date
  if (!payload.purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.purchaseDate)) {
    errors.push('A valid transaction date (YYYY-MM-DD) is required.');
  }

  // 7. Total Amount (> 0)
  if (payload.totalAmount === null || payload.totalAmount === undefined || isNaN(payload.totalAmount)) {
    errors.push('Total purchase amount is required.');
  } else if (payload.totalAmount <= 0) {
    errors.push('Total amount must be greater than $0.00.');
  }

  // 8. Receipt Evidence Check (unless explicitly manual entry)
  if (existingPurchase && !existingPurchase.manualEntry && existingPurchase.receiptPageCount <= 0) {
    errors.push('Receipt evidence is missing for this purchase.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Execute final purchase confirmation
 * Idempotent: Updates the existing purchase document in Firestore or local state.
 */
export async function executePurchaseConfirmation(
  payload: ConfirmPurchasePayload,
  currentUser: User,
  isLiveFirestore: boolean
): Promise<Partial<Purchase>> {
  const confirmedAt = new Date().toISOString();

  const confirmationUpdate: Partial<Purchase> = {
    projectId: payload.projectId,
    providerId: payload.providerId || null,
    providerName: payload.providerName.trim(),
    purchaseDate: payload.purchaseDate,
    subtotal: payload.subtotal !== null ? Number(payload.subtotal) : null,
    tax: payload.tax !== null ? Number(payload.tax) : null,
    totalAmount: Number(payload.totalAmount),
    receiptNumber: payload.receiptNumber?.trim() || null,
    paymentMethod: payload.paymentMethod?.trim() || null,
    captureStatus: 'CONFIRMED',
    confirmedAt,
    confirmedBy: currentUser.userId,
    duplicateWarningAcknowledged: payload.duplicateWarningAcknowledged || false,
    userEditedFields: payload.userEditedFields || [],
  };

  if (isLiveFirestore) {
    try {
      await purchaseRepository.updatePurchase(
        payload.companyId,
        payload.purchaseId,
        confirmationUpdate
      );
    } catch (err: any) {
      console.error('[Purchase Confirmation Service] Firestore confirmation failed:', err);
      throw new Error("We couldn't confirm this purchase. Your receipt is still saved. Please try again.");
    }
  }

  return confirmationUpdate;
}
