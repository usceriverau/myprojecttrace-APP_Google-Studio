/**
 * MyProjectTrace - Payments & Purchases Firestore Repository
 * 
 * Manages collections at:
 * - `/companies/{companyId}/payments/{paymentId}`
 * - `/companies/{companyId}/purchases/{purchaseId}`
 * - `/companies/{companyId}/purchases/{purchaseId}/receiptPages/{receiptPageId}`
 * - `/companies/{companyId}/purchases/{purchaseId}/items/{itemId}`
 */

import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, writeBatch 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Payment, Purchase, ReceiptPage, PurchaseItem } from '../../types';

export const paymentRepository = {
  async getPayments(companyId: string, projectId?: string): Promise<Payment[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'payments');
    let q = query(colRef, orderBy('createdAt', 'desc'));
    if (projectId) {
      q = query(colRef, where('projectId', '==', projectId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Payment);
  },

  async createPayment(companyId: string, payment: Payment): Promise<Payment> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'payments', payment.paymentId);
    await setDoc(docRef, {
      ...payment,
      companyId,
    });
    return payment;
  },
};

export const purchaseRepository = {
  async getPurchases(companyId: string, projectId?: string): Promise<Purchase[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'purchases');
    let q = query(colRef, orderBy('createdAt', 'desc'));
    if (projectId) {
      q = query(colRef, where('projectId', '==', projectId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Purchase);
  },

  async getPurchase(companyId: string, purchaseId: string): Promise<Purchase | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'purchases', purchaseId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Purchase;
  },

  async createPurchase(
    companyId: string,
    purchase: Purchase,
    pages: ReceiptPage[] = [],
    items: PurchaseItem[] = []
  ): Promise<Purchase> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'purchases', purchase.purchaseId);
    await setDoc(docRef, {
      ...purchase,
      companyId,
    });

    for (const page of pages) {
      const pageRef = doc(db, 'companies', companyId, 'purchases', purchase.purchaseId, 'receiptPages', page.receiptPageId);
      await setDoc(pageRef, { ...page, companyId, purchaseId: purchase.purchaseId });
    }

    for (const item of items) {
      const itemRef = doc(db, 'companies', companyId, 'purchases', purchase.purchaseId, 'items', item.itemId);
      await setDoc(itemRef, { ...item, companyId, purchaseId: purchase.purchaseId });
    }

    return purchase;
  },

  async updatePurchase(
    companyId: string,
    purchaseId: string,
    data: Partial<Purchase>
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'purchases', purchaseId);
    await updateDoc(docRef, {
      ...data,
      companyId,
      purchaseId,
    });
  },

  async getReceiptPages(companyId: string, purchaseId: string): Promise<ReceiptPage[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'purchases', purchaseId, 'receiptPages');
    const q = query(colRef, orderBy('pageNumber', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ReceiptPage);
  },

  async getPurchaseItems(companyId: string, purchaseId: string): Promise<PurchaseItem[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'purchases', purchaseId, 'items');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as PurchaseItem);
  },

  /**
   * Idempotently replace purchase items on retry analysis so duplicates are avoided.
   */
  async replacePurchaseItems(
    companyId: string,
    purchaseId: string,
    newItems: PurchaseItem[]
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    
    // 1. Fetch existing items
    const colRef = collection(db, 'companies', companyId, 'purchases', purchaseId, 'items');
    const snap = await getDocs(colRef);
    
    const batch = writeBatch(db);
    
    // 2. Delete existing
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }

    // 3. Add new
    for (const item of newItems) {
      const itemRef = doc(db, 'companies', companyId, 'purchases', purchaseId, 'items', item.itemId);
      batch.set(itemRef, {
        ...item,
        companyId,
        purchaseId,
      });
    }

    await batch.commit();
  },

  async deletePurchase(companyId: string, purchaseId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'purchases', purchaseId);
    await deleteDoc(docRef);
  },
};
