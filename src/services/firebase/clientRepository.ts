/**
 * MyProjectTrace - Client Entity Firestore Repository
 * 
 * Manages relational client entities located at `/companies/{companyId}/clients/{clientId}`
 */

import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Client } from '../../types';
import { generateId, sanitizeForFirestore } from '../../lib/utils';

export const clientRepository = {
  async getClients(companyId: string): Promise<Client[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'clients');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Client);
    } catch (err) {
      console.warn('[MyProjectTrace] Error reading clients from Firestore:', err);
      return [];
    }
  },

  async getClient(companyId: string, clientId: string): Promise<Client | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'clients', clientId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Client;
  },

  async createClient(companyId: string, client: Client): Promise<Client> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'clients', client.clientId);
    const sanitized = sanitizeForFirestore({
      ...client,
      companyId, // Ensure companyId matches path strictly
    });
    await setDoc(docRef, sanitized);
    return client;
  },

  async updateClient(companyId: string, clientId: string, updates: Partial<Client>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'clients', clientId);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  },

  async deleteClient(companyId: string, clientId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'clients', clientId);
    await deleteDoc(docRef);
  },

  /**
   * Seamless Find-or-Create Client Helper
   * Matches existing client by normalized name or creates a new client document
   */
  async findOrCreateClientByName(
    companyId: string, 
    clientName: string, 
    additionalDetails?: Partial<Client>
  ): Promise<Client> {
    const trimmed = clientName.trim();
    if (!trimmed) {
      throw new Error('Client name cannot be empty');
    }

    if (!db) {
      // Local fallback representation
      return {
        clientId: `client_${generateId()}`,
        companyId,
        clientName: trimmed,
        ...(additionalDetails || {}),
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const existingClients = await this.getClients(companyId);
      const matched = existingClients.find(
        c => c.clientName.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (matched) {
        if (additionalDetails && Object.keys(additionalDetails).length > 0) {
          await this.updateClient(companyId, matched.clientId, additionalDetails);
          return { ...matched, ...additionalDetails };
        }
        return matched;
      }

      // Create new client entity
      const newClient: Client = {
        clientId: `client_${generateId()}`,
        companyId,
        clientName: trimmed,
        ...(additionalDetails?.address ? { address: additionalDetails.address } : {}),
        ...(additionalDetails?.phone ? { phone: additionalDetails.phone } : {}),
        ...(additionalDetails?.email ? { email: additionalDetails.email } : {}),
        ...(additionalDetails?.notes ? { notes: additionalDetails.notes } : {}),
        createdAt: new Date().toISOString(),
      };

      await this.createClient(companyId, newClient);
      return newClient;
    } catch (err) {
      console.error('[MyProjectTrace] Error in findOrCreateClientByName:', err);
      // Fallback object to avoid blocking project creation
      return {
        clientId: `client_${generateId()}`,
        companyId,
        clientName: trimmed,
        ...(additionalDetails || {}),
        createdAt: new Date().toISOString(),
      };
    }
  },
};

