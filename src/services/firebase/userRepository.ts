/**
 * MyProjectTrace - User Firestore Repository
 * 
 * Manages user documents located at `/companies/{companyId}/users/{userId}`
 * and user-company lookup mappings.
 */

import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { sanitizeForFirestore } from '../../lib/utils';

export const userRepository = {
  async getUser(companyId: string, userId: string): Promise<User | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as User;
  },

  async createUser(user: User): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', user.companyId, 'users', user.userId);
    await setDoc(docRef, sanitizeForFirestore(user));

    // Store minimal lookup mapping at /user_directory/{userId} for fast company resolution
    try {
      const dirRef = doc(db, 'user_directory', user.userId);
      await setDoc(dirRef, sanitizeForFirestore({
        userId: user.userId,
        companyId: user.companyId,
        createdAt: user.createdAt,
      }));
    } catch (err) {
      console.warn('[MyProjectTrace] Could not write user_directory mapping:', err);
    }
  },

  async setUserDirectoryMapping(userId: string, companyId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const dirRef = doc(db, 'user_directory', userId);
    await setDoc(dirRef, sanitizeForFirestore({
      userId,
      companyId,
      createdAt: new Date().toISOString(),
    }));
  },

  async getCompanyUsers(companyId: string): Promise<User[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'users');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as User);
  },

  async findUserCompany(userId: string): Promise<{ companyId: string } | null> {
    if (!db) return null;
    try {
      const dirRef = doc(db, 'user_directory', userId);
      const snap = await getDoc(dirRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.companyId) {
          return { companyId: data.companyId };
        }
      }
    } catch {
      // Fallback
    }
    return null;
  },
};

