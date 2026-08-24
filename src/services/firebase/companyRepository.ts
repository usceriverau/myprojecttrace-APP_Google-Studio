/**
 * MyProjectTrace - Company Firestore Repository
 * 
 * Manages tenant company documents located at `/companies/{companyId}`
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Company, CompanySettings } from '../../types';

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
    await setDoc(docRef, company);
  },

  async updateCompanySettings(companyId: string, settings: Partial<CompanySettings>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId);
    await updateDoc(docRef, {
      'settings.minimumGrossMarginThreshold': settings.minimumGrossMarginThreshold,
      'settings.largePurchaseThreshold': settings.largePurchaseThreshold,
      'settings.currency': settings.currency,
      'settings.arWarningThreshold': settings.arWarningThreshold,
      updatedAt: new Date().toISOString(),
    });
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
