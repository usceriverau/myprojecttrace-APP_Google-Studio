/**
 * MyProjectTrace - Company Firestore Repository
 * 
 * Manages tenant company documents located at `/companies/{companyId}`
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Company, CompanySettings } from '../../types';
import { sanitizeForFirestore } from '../../lib/utils';

export const companyRepository = {
  async getCompany(companyId: string): Promise<Company | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Company;
  },

  async createCompany(company: Company): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', company.companyId);
    await setDoc(docRef, sanitizeForFirestore(company));
  },

  async updateCompanySettings(companyId: string, settings: Partial<CompanySettings>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId);
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (settings.minimumGrossMarginThreshold !== undefined) {
      updates['settings.minimumGrossMarginThreshold'] = settings.minimumGrossMarginThreshold;
    }
    if (settings.largePurchaseThreshold !== undefined) {
      updates['settings.largePurchaseThreshold'] = settings.largePurchaseThreshold;
    }
    if (settings.currency !== undefined) {
      updates['settings.currency'] = settings.currency;
    }
    if (settings.arWarningThreshold !== undefined) {
      updates['settings.arWarningThreshold'] = settings.arWarningThreshold;
    }
    await updateDoc(docRef, updates);
  },

  async updateCompanyName(companyId: string, companyName: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId);
    await updateDoc(docRef, {
      companyName,
      updatedAt: new Date().toISOString(),
    });
  },
};

