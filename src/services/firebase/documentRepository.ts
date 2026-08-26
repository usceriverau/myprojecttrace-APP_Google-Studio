/**
 * MyProjectTrace - Project Document Repository
 * 
 * Manages general project document entities and files:
 * Firestore Path: `/companies/{companyId}/projects/{projectId}/documents/{documentId}`
 * Storage Path: `companies/{companyId}/projects/{projectId}/documents/{documentId}_{fileName}`
 */

import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { ProjectDocument, DocumentType } from '../../types';
import { generateId, sanitizeForFirestore } from '../../lib/utils';

export const documentRepository = {
  async getAllCompanyDocuments(companyId: string): Promise<ProjectDocument[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'documents');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data() as ProjectDocument);
    } catch (err) {
      console.warn('[MyProjectTrace] Error fetching company documents:', err);
      return [];
    }
  },

  async getProjectDocuments(companyId: string, projectId: string): Promise<ProjectDocument[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'projects', projectId, 'documents');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ProjectDocument);
    } catch (err) {
      console.warn('[MyProjectTrace] Error fetching project documents:', err);
      return [];
    }
  },

  async getProjectDocument(companyId: string, projectId: string, documentId: string): Promise<ProjectDocument | null> {
    if (!db) return null;
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'documents', documentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as ProjectDocument;
  },

  async createProjectDocument(companyId: string, projectId: string, document: ProjectDocument): Promise<ProjectDocument> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'documents', document.documentId);
    const sanitized = sanitizeForFirestore({
      ...document,
      companyId,
      projectId,
    });
    await setDoc(docRef, sanitized);
    return document;
  },


  async uploadAndSaveDocument(
    companyId: string,
    projectId: string,
    documentType: DocumentType,
    file: File,
    uploadedBy: string
  ): Promise<ProjectDocument> {
    const documentId = `doc_${generateId()}`;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `companies/${companyId}/projects/${projectId}/documents/${documentId}_${cleanFileName}`;

    let fileUrl = '';
    if (storage) {
      try {
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file, {
          contentType: file.type || 'application/octet-stream',
          customMetadata: {
            companyId,
            projectId,
            documentId,
            uploadedBy,
            documentType,
          },
        });
        fileUrl = await getDownloadURL(snapshot.ref);
      } catch (err) {
        console.warn('[MyProjectTrace] Storage upload notice (using object URL fallback):', err);
        fileUrl = URL.createObjectURL(file);
      }
    } else {
      fileUrl = URL.createObjectURL(file);
    }

    const newDoc: ProjectDocument = {
      documentId,
      companyId,
      projectId,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      secureStorageReference: storagePath,
      fileUrl,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      await this.createProjectDocument(companyId, projectId, newDoc);
    }

    return newDoc;
  },

  async deleteProjectDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    storageReference?: string
  ): Promise<void> {
    if (db) {
      const docRef = doc(db, 'companies', companyId, 'projects', projectId, 'documents', documentId);
      await deleteDoc(docRef);
    }

    if (storage && storageReference) {
      try {
        const storageRef = ref(storage, storageReference);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn('[MyProjectTrace] Non-blocking storage deletion notice:', err);
      }
    }
  },
};
