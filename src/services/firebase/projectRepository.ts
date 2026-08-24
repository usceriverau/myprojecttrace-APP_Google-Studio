/**
 * MyProjectTrace - Project Firestore Repository
 * 
 * Manages project documents located at `/companies/{companyId}/projects/{projectId}`
 */

import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Project } from '../../types';

export const projectRepository = {
  async getProjects(companyId: string): Promise<Project[]> {
    if (!db) return [];
    const colRef = collection(db, 'companies', companyId, 'projects');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Project);
  },

  async getProject(companyId: string, projectId: string): Promise<Project | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'projects', projectId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Project;
  },

  async createProject(companyId: string, project: Project): Promise<Project> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', project.projectId);
    await setDoc(docRef, {
      ...project,
      companyId, // Ensure companyId matches path exactly
    });
    return project;
  },

  async updateProject(companyId: string, projectId: string, updates: Partial<Project>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteProject(companyId: string, projectId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId);
    await deleteDoc(docRef);
  },
};
