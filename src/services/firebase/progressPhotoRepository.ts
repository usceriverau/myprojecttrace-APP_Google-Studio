/**
 * MyProjectTrace - Progress Photos Firestore Repository
 * 
 * Manages project progress photos located at `/companies/{companyId}/projects/{projectId}/progressPhotos/{photoId}`
 */

import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, collectionGroup, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProjectPhoto } from '../../types';

export const progressPhotoRepository = {
  async getProjectPhotos(companyId: string, projectId: string): Promise<ProjectPhoto[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'projects', projectId, 'progressPhotos');
      const q = query(colRef, orderBy('takenAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ProjectPhoto);
    } catch (err) {
      console.warn('[progressPhotoRepository] getProjectPhotos fallback:', err);
      return [];
    }
  },

  async getAllCompanyPhotos(companyId: string): Promise<ProjectPhoto[]> {
    if (!db) return [];
    try {
      const q = query(
        collectionGroup(db, 'progressPhotos'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ProjectPhoto);
    } catch (err) {
      console.warn('[progressPhotoRepository] getAllCompanyPhotos fallback:', err);
      return [];
    }
  },

  async addProjectPhoto(companyId: string, projectId: string, photo: ProjectPhoto): Promise<ProjectPhoto> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'progressPhotos', photo.photoId);
    await setDoc(docRef, {
      ...photo,
      companyId,
      projectId,
    });
    return photo;
  },

  async deleteProjectPhoto(companyId: string, projectId: string, photoId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'progressPhotos', photoId);
    await deleteDoc(docRef);
  },
};
