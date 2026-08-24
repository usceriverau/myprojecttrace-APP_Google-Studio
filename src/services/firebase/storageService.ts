/**
 * MyProjectTrace - Firebase Storage Service
 * 
 * Strict Company Isolation:
 * All receipt evidence is stored under company-isolated paths:
 * `companies/${companyId}/purchases/${purchaseId}/receipt-images/page_${pageNumber}_${filename}`
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { STORAGE_PATHS, getCanonicalReceiptImagePath } from '../storageStructure';

export interface UploadReceiptImageResult {
  imageStoragePath: string;
  imageUrl: string;
  pageNumber: number;
}

export const storageService = {
  /**
   * Upload an individual receipt page image to company-isolated Firebase Storage.
   */
  async uploadReceiptPageImage(
    companyId: string,
    purchaseId: string,
    pageNumber: number,
    file: File
  ): Promise<UploadReceiptImageResult> {
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = STORAGE_PATHS.receiptImage(companyId, purchaseId, pageNumber, filename);

    if (!storage) {
      // In Demo Mode or if storage is uninitialized, create an object URL
      const localUrl = URL.createObjectURL(file);
      return {
        imageStoragePath: storagePath,
        imageUrl: localUrl,
        pageNumber,
      };
    }

    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          companyId,
          purchaseId,
          pageNumber: String(pageNumber),
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);
      return {
        imageStoragePath: storagePath,
        imageUrl: downloadUrl,
        pageNumber,
      };
    } catch (error) {
      console.error('[Storage Service] Failed to upload receipt image:', error);
      // Graceful fallback for preview / offline environment
      const localUrl = URL.createObjectURL(file);
      return {
        imageStoragePath: storagePath,
        imageUrl: localUrl,
        pageNumber,
      };
    }
  },

  /**
   * Convert a File or Blob to a base64 string for direct API transmission
   */
  async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  },
};
