/**
 * MyProjectTrace - Provider Normalization & Matching Service
 * 
 * Provides normalized merchant matching to link AI-extracted merchant strings
 * with company trade provider records without automatic silent merges.
 */

import { Provider } from '../types';
import { generateId } from '../lib/utils';
import { providerRepository } from './firebase/providerRepository';

/**
 * Clean and normalize a merchant name for robust matching
 * Examples:
 * "THE HOME DEPOT #6510" -> "home depot"
 * "LOWE'S STORE 0566" -> "lowes"
 * "FERGUSON BATH & KITCHEN LLC" -> "ferguson"
 */
export function normalizeMerchantName(rawName: string | null | undefined): string {
  if (!rawName) return '';

  let normalized = rawName.toLowerCase().trim();

  // Strip common prefixes
  normalized = normalized.replace(/^the\s+/, '');

  // Strip store numbers, hashtags, and location qualifiers (e.g., #6510, store 0566, #042)
  normalized = normalized.replace(/#\s*\d+/g, '');
  normalized = normalized.replace(/\bstore\s*#?\s*\d+/g, '');
  normalized = normalized.replace(/\bloc\s*#?\s*\d+/g, '');

  // Strip legal suffixes
  normalized = normalized.replace(/\b(llc|inc|corp|co|ltd)\b/g, '');

  // Strip punctuation except letters and digits
  normalized = normalized.replace(/['’`\-_.,\/\\()]/g, '');

  // Collapse multiple whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Alias maps for common big-box and trade suppliers
  if (normalized.includes('home depot')) return 'home depot';
  if (normalized.includes('lowes')) return 'lowes';
  if (normalized.includes('floor and decor') || normalized.includes('floor & decor') || normalized.includes('floor decor')) return 'floor and decor';
  if (normalized.includes('ferguson')) return 'ferguson';
  if (normalized.includes('sherwin williams') || normalized.includes('sherwin-williams')) return 'sherwin williams';
  if (normalized.includes('menards')) return 'menards';
  if (normalized.includes('harbor freight')) return 'harbor freight';
  if (normalized.includes('grainger')) return 'grainger';
  if (normalized.includes('fastenal')) return 'fastenal';
  if (normalized.includes('ace hardware')) return 'ace hardware';
  if (normalized.includes('84 lumber')) return '84 lumber';
  if (normalized.includes('abc supply')) return 'abc supply';

  return normalized;
}

export interface ProviderMatchResult {
  matchedProvider: Provider | null;
  confidence: number;
  matchType: 'EXACT' | 'NORMALIZED' | 'PARTIAL' | 'NONE';
  suggestedName: string;
}

/**
 * Match an extracted merchant name against known company providers
 */
export function findSuggestedProvider(
  extractedMerchantName: string | null | undefined,
  companyProviders: Provider[]
): ProviderMatchResult {
  if (!extractedMerchantName || !extractedMerchantName.trim()) {
    return {
      matchedProvider: null,
      confidence: 0,
      matchType: 'NONE',
      suggestedName: '',
    };
  }

  const rawClean = extractedMerchantName.trim();
  const normalizedCandidate = normalizeMerchantName(rawClean);

  // 1. Check exact match on original provider name
  const exactMatch = companyProviders.find(
    p => p.providerName.toLowerCase() === rawClean.toLowerCase()
  );
  if (exactMatch) {
    return {
      matchedProvider: exactMatch,
      confidence: 1.0,
      matchType: 'EXACT',
      suggestedName: exactMatch.providerName,
    };
  }

  // 2. Check match on normalized names
  const normalizedMatch = companyProviders.find(
    p => normalizeMerchantName(p.providerName) === normalizedCandidate ||
         p.normalizedName === normalizedCandidate
  );
  if (normalizedMatch) {
    return {
      matchedProvider: normalizedMatch,
      confidence: 0.95,
      matchType: 'NORMALIZED',
      suggestedName: normalizedMatch.providerName,
    };
  }

  // 3. Check partial / substring containment
  if (normalizedCandidate.length >= 3) {
    const partialMatch = companyProviders.find(p => {
      const pNorm = normalizeMerchantName(p.providerName);
      return pNorm.includes(normalizedCandidate) || normalizedCandidate.includes(pNorm);
    });

    if (partialMatch) {
      return {
        matchedProvider: partialMatch,
        confidence: 0.80,
        matchType: 'PARTIAL',
        suggestedName: partialMatch.providerName,
      };
    }
  }

  // Format clean display name if no existing provider found
  const cleanDisplayName = formatMerchantDisplayName(rawClean);

  return {
    matchedProvider: null,
    confidence: 0,
    matchType: 'NONE',
    suggestedName: cleanDisplayName,
  };
}

/**
 * Clean raw merchant string into a standard title-cased display name
 */
export function formatMerchantDisplayName(raw: string): string {
  if (!raw) return '';
  // Remove trailing store codes
  let cleaned = raw.replace(/#\s*\d+/g, '').replace(/\bstore\s*#?\s*\d+/gi, '').trim();
  
  // Title case words
  return cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Quick creation helper for new company provider
 */
export async function createQuickProvider(
  companyId: string,
  providerName: string,
  category: string = 'General Supplier',
  isLiveFirestore: boolean = false
): Promise<Provider> {
  const cleanName = providerName.trim();
  const newProvider: Provider = {
    providerId: generateId('prov'),
    companyId,
    providerName: cleanName,
    normalizedName: normalizeMerchantName(cleanName),
    category,
    createdAt: new Date().toISOString(),
  };

  if (isLiveFirestore) {
    await providerRepository.createProvider(companyId, newProvider);
  }

  return newProvider;
}
