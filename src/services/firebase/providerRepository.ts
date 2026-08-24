/**
 * MyProjectTrace - Provider Firestore Repository
 * 
 * Manages provider documents at `/companies/{companyId}/providers/{providerId}`
 */

import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Provider } from '../../types';

export const providerRepository = {
  async getProviders(companyId: string): Promise<Provider[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'providers');
    const q = query(colRef, orderBy('providerName', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Provider);
  },

  async getProvider(companyId: string, providerId: string): Promise<Provider | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'providers', providerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Provider;
  },

  async createProvider(companyId: string, provider: Provider): Promise<Provider> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'providers', provider.providerId);
    await setDoc(docRef, {
      ...provider,
      companyId,
    });
    return provider;
  },

  async updateProvider(companyId: string, providerId: string, updates: Partial<Provider>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'providers', providerId);
    await updateDoc(docRef, {
      ...updates,
      companyId,
      providerId,
    });
  },

  async deleteProvider(companyId: string, providerId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'providers', providerId);
    await deleteDoc(docRef);
  },
};
