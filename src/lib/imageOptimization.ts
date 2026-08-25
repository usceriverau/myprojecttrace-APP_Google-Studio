/**
 * MyProjectTrace - Client-Side Image Optimization Utility
 * 
 * Optimizes receipt photos before Base64 conversion and network transmission.
 * 
 * Rules:
 * 1. Longest side capped at 1800px (preserves full readability of fine receipt text, SKUs, and taxes).
 * 2. Aspect ratio strictly preserved.
 * 3. Never enlarges images smaller than 1800px.
 * 4. High-performance JPEG compression at quality 0.80 (range: 0.78 - 0.82).
 * 5. Non-image files (e.g. PDFs) bypass canvas compression safely.
 * 6. Preserves EXIF orientation via standard browser canvas pipeline.
 */

export interface OptimizedImageResult {
  file: File;
  base64?: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  originalDimensions: { width: number; height: number };
  optimizedDimensions: { width: number; height: number };
  optimizationDurationMs: number;
}

const MAX_IMAGE_DIMENSION = 1600; // Optimal range 1600-1800px: fast processing with crystal clear OCR fidelity
const JPEG_QUALITY = 0.78; // 78% JPEG quality for high OCR accuracy and minimal payload

/**
 * Optimizes a single receipt image file.
 */
export async function optimizeReceiptImage(file: File): Promise<OptimizedImageResult> {
  const startTime = performance.now();
  const originalSizeBytes = file.size;

  // If already tagged as optimized, avoid redundant re-processing
  if ((file as any)._isOptimized && (file as any)._optimizedBase64) {
    return {
      file,
      base64: (file as any)._optimizedBase64,
      originalSizeBytes,
      optimizedSizeBytes: file.size,
      originalDimensions: (file as any)._optimizedDimensions || { width: 0, height: 0 },
      optimizedDimensions: (file as any)._optimizedDimensions || { width: 0, height: 0 },
      optimizationDurationMs: 0,
    };
  }

  // If file is not an image (e.g. PDF invoice), pass through unchanged
  if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|heic|bmp)$/i)) {
    return {
      file,
      originalSizeBytes,
      optimizedSizeBytes: originalSizeBytes,
      originalDimensions: { width: 0, height: 0 },
      optimizedDimensions: { width: 0, height: 0 },
      optimizationDurationMs: Math.round(performance.now() - startTime),
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        // Calculate proportional scale if longest side exceeds MAX_IMAGE_DIMENSION
        const longestSide = Math.max(originalWidth, originalHeight);
        if (longestSide > MAX_IMAGE_DIMENSION) {
          const scale = MAX_IMAGE_DIMENSION / longestSide;
          targetWidth = Math.round(originalWidth * scale);
          targetHeight = Math.round(originalHeight * scale);
        }

        // Draw to canvas with high smoothing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          // If canvas context fails, fallback gracefully to original file
          const duration = Math.round(performance.now() - startTime);
          resolve({
            file,
            originalSizeBytes,
            optimizedSizeBytes: originalSizeBytes,
            originalDimensions: { width: originalWidth, height: originalHeight },
            optimizedDimensions: { width: originalWidth, height: originalHeight },
            optimizationDurationMs: duration,
          });
          return;
        }

        // Fill white background for transparent PNG/WebP conversions
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Get direct base64 data URL from canvas for instant API transmission
        const directDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        // Export as JPEG blob
        canvas.toBlob(
          (blob) => {
            const duration = Math.round(performance.now() - startTime);
            if (!blob) {
              resolve({
                file,
                base64: directDataUrl,
                originalSizeBytes,
                optimizedSizeBytes: originalSizeBytes,
                originalDimensions: { width: originalWidth, height: originalHeight },
                optimizedDimensions: { width: targetWidth, height: targetHeight },
                optimizationDurationMs: duration,
              });
              return;
            }

            // Create new optimized File object with .jpg extension
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const optimizedFileName = `${baseName}.jpg`;
            const optimizedFile = new File([blob], optimizedFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            // Cache properties on object
            (optimizedFile as any)._isOptimized = true;
            (optimizedFile as any)._optimizedBase64 = directDataUrl;
            (optimizedFile as any)._optimizedDimensions = { width: targetWidth, height: targetHeight };

            resolve({
              file: optimizedFile,
              base64: directDataUrl,
              originalSizeBytes,
              optimizedSizeBytes: blob.size,
              originalDimensions: { width: originalWidth, height: originalHeight },
              optimizedDimensions: { width: targetWidth, height: targetHeight },
              optimizationDurationMs: duration,
            });
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };

      img.onerror = () => {
        // Fallback to original file on load error
        resolve({
          file,
          originalSizeBytes,
          optimizedSizeBytes: originalSizeBytes,
          originalDimensions: { width: 0, height: 0 },
          optimizedDimensions: { width: 0, height: 0 },
          optimizationDurationMs: Math.round(performance.now() - startTime),
        });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSizeBytes,
        optimizedSizeBytes: originalSizeBytes,
        originalDimensions: { width: 0, height: 0 },
        optimizedDimensions: { width: 0, height: 0 },
        optimizationDurationMs: Math.round(performance.now() - startTime),
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an array of receipt images in parallel.
 */
export async function optimizeReceiptImages(
  files: File[]
): Promise<{ files: File[]; totalOriginalBytes: number; totalOptimizedBytes: number; totalDurationMs: number }> {
  const start = performance.now();
  const results = await Promise.all(files.map((f) => optimizeReceiptImage(f)));
  const totalDurationMs = Math.round(performance.now() - start);

  const totalOriginalBytes = results.reduce((acc, r) => acc + r.originalSizeBytes, 0);
  const totalOptimizedBytes = results.reduce((acc, r) => acc + r.optimizedSizeBytes, 0);

  return {
    files: results.map((r) => r.file),
    totalOriginalBytes,
    totalOptimizedBytes,
    totalDurationMs,
  };
}
