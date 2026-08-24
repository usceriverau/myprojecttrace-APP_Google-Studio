/**
 * MyProjectTrace - Deterministic Purchase Duplicate Detection Service
 * 
 * Evaluates pending purchases against confirmed company purchases to flag
 * potential duplicates before final confirmation.
 * 
 * Rules:
 * - Deterministic arithmetic & signal comparison (zero unneeded AI calls).
 * - Same receipt number (when available) = very strong match.
 * - Same provider + same date + same total = strong match.
 * - Same provider + same total + nearby date (within 3 days) = possible match.
 */

import { Purchase, DuplicatePurchaseCandidate } from '../types';
import { normalizeMerchantName } from './providerService';

export interface DuplicateCheckInput {
  purchaseId?: string;
  companyId: string;
  providerName?: string | null;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  receiptNumber?: string | null;
}

/**
 * Calculate difference in days between two ISO date strings (YYYY-MM-DD)
 */
function getDayDifference(dateStrA: string, dateStrB: string): number {
  try {
    const a = new Date(dateStrA).getTime();
    const b = new Date(dateStrB).getTime();
    const diffMs = Math.abs(a - b);
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Check if receipt numbers match non-trivially
 */
function isReceiptNumberMatch(recA?: string | null, recB?: string | null): boolean {
  if (!recA || !recB) return false;
  const cleanA = recA.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanB = recB.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanA.length < 3 || cleanB.length < 3) return false;
  return cleanA === cleanB;
}

/**
 * Check if providers match by name or normalization
 */
function isProviderMatch(
  nameA?: string | null,
  nameB?: string | null
): boolean {
  if (!nameA || !nameB) return false;
  const normA = normalizeMerchantName(nameA);
  const normB = normalizeMerchantName(nameB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

/**
 * Detect candidate duplicates among confirmed company purchases
 */
export function detectPurchaseDuplicates(
  pending: DuplicateCheckInput,
  confirmedPurchases: Purchase[]
): DuplicatePurchaseCandidate[] {
  const candidates: DuplicatePurchaseCandidate[] = [];

  if (!pending.totalAmount || pending.totalAmount <= 0) {
    return [];
  }

  // Filter to same company and exclude same purchase ID if already recorded
  const companyConfirmed = confirmedPurchases.filter(p => 
    p.companyId === pending.companyId &&
    p.captureStatus === 'CONFIRMED' &&
    p.purchaseId !== pending.purchaseId
  );

  for (const existing of companyConfirmed) {
    let score = 0;
    const matchedFields: string[] = [];
    const reasons: string[] = [];

    const isSameReceipt = isReceiptNumberMatch(pending.receiptNumber, existing.receiptNumber);
    const isSameProv = isProviderMatch(pending.providerName, existing.providerName);
    const isExactTotal = Math.abs(Number(pending.totalAmount) - Number(existing.totalAmount)) < 0.01;
    const isNearTotal = Math.abs(Number(pending.totalAmount) - Number(existing.totalAmount)) < 1.50;
    const dayDiff = getDayDifference(pending.purchaseDate, existing.purchaseDate);

    // 1. Receipt Number Match (Very Strong Signal)
    if (isSameReceipt) {
      score += 60;
      matchedFields.push('Receipt Number');
      reasons.push(`Exact receipt # match (${existing.receiptNumber})`);
    }

    // 2. Provider Match
    if (isSameProv) {
      score += 20;
      matchedFields.push('Merchant / Provider');
    }

    // 3. Amount Match
    if (isExactTotal) {
      score += 25;
      matchedFields.push('Total Amount');
      reasons.push(`Identical total ($${existing.totalAmount.toFixed(2)})`);
    } else if (isNearTotal) {
      score += 10;
      matchedFields.push('Similar Total');
    }

    // 4. Date Match / Proximity
    if (dayDiff === 0) {
      score += 20;
      matchedFields.push('Transaction Date');
      reasons.push(`Same date (${existing.purchaseDate})`);
    } else if (dayDiff <= 3) {
      score += 10;
      matchedFields.push('Nearby Date');
      reasons.push(`Purchased ${dayDiff} day${dayDiff > 1 ? 's' : ''} apart (${existing.purchaseDate})`);
    }

    // Minimum threshold for duplicate warning consideration
    if (score >= 45) {
      let matchLevel: 'EXACT' | 'STRONG' | 'POSSIBLE' = 'POSSIBLE';
      if (isSameReceipt && (isExactTotal || isSameProv)) {
        matchLevel = 'EXACT';
      } else if (isSameProv && isExactTotal && dayDiff === 0) {
        matchLevel = 'STRONG';
      } else if (isSameProv && isExactTotal && dayDiff <= 3) {
        matchLevel = 'POSSIBLE';
      }

      candidates.push({
        existingPurchase: existing,
        matchScore: Math.min(100, score),
        matchedFields,
        matchLevel,
        reason: reasons.join(' • ') || 'Similar purchase parameters detected.',
      });
    }
  }

  // Sort descending by match score
  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}
