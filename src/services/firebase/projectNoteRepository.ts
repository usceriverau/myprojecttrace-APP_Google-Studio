/**
 * MyProjectTrace - Project Notes & Specifications Firestore Repository
 * 
 * Manages project notes located at `/companies/{companyId}/projects/{projectId}/notes/{noteId}`
 */

import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, collectionGroup, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProjectNote } from '../../types';

export const projectNoteRepository = {
  async getProjectNotes(companyId: string, projectId: string): Promise<ProjectNote[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'projects', projectId, 'notes');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ProjectNote);
    } catch (err) {
      console.warn('[projectNoteRepository] getProjectNotes fallback:', err);
      return [];
    }
  },

  async getAllCompanyNotes(companyId: string): Promise<ProjectNote[]> {
    if (!db) return [];
    try {
      const q = query(
        collectionGroup(db, 'notes'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ProjectNote);
    } catch (err) {
      console.warn('[projectNoteRepository] getAllCompanyNotes fallback:', err);
      return [];
    }
  },

  async addProjectNote(companyId: string, projectId: string, note: ProjectNote): Promise<ProjectNote> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'notes', note.noteId);
    await setDoc(docRef, {
      ...note,
      companyId,
      projectId,
    });
    return note;
  },

  async updateProjectNote(companyId: string, projectId: string, noteId: string, updates: Partial<ProjectNote>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'notes', noteId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteProjectNote(companyId: string, projectId: string, noteId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'notes', noteId);
    await deleteDoc(docRef);
  },
};
