import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Trash2, 
  Check, 
  Plus, 
  Layers, 
  AlertCircle, 
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface LiveCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosCaptured: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  targetType?: 'RECEIPT' | 'PROJECT_PHOTO';
  allowMultiple?: boolean;
}

export const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({
  isOpen,
  onClose,
  onPhotosCaptured,
  title = 'Multi-Page Receipt Camera',
  subtitle = 'Point at top, middle, and bottom of long receipts to capture sequential slices',
  targetType = 'RECEIPT',
  allowMultiple = true,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [snappedPhotos, setSnappedPhotos] = useState<Array<{ id: string; url: string; file: File }>>([]);
  const [shutterAnimation, setShutterAnimation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputFallbackRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks helper
  const stopCameraTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    try {
      setIsStartingCamera(true);
      setCameraError(null);

      // Stop previous tracks if any
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please use photo file upload.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch((e) => {
          console.warn('Video auto-play interrupted:', e);
        });
      }
    } catch (err: any) {
      console.error('Failed to open camera stream:', err);
      let errMsg = 'Could not access the camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Please allow camera access in your browser or choose files from your device.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is currently in use by another application.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setCameraError(errMsg);
    } finally {
      setIsStartingCamera(false);
    }
  }, [stream]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCameraTracks();
      // Clean up preview URLs
      snappedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
      setSnappedPhotos([]);
      setCameraError(null);
    }

    return () => {
      stopCameraTracks();
    };
  }, [isOpen]);

  // Switch between back/front camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Shutter action: snap high-res frame from video
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    // Trigger visual flash animation
    setShutterAnimation(true);
    setTimeout(() => setShutterAnimation(false), 200);

    // Resize to maximum 1800px longest side if needed
    const longestSide = Math.max(video.videoWidth, video.videoHeight);
    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    if (longestSide > 1800) {
      const scale = 1800 / longestSide;
      targetWidth = Math.round(video.videoWidth * scale);
      targetHeight = Math.round(video.videoHeight * scale);
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Convert canvas to blob & File with optimized 0.80 JPEG quality
    canvas.toBlob((blob) => {
      if (!blob) return;

      const pageNumber = snappedPhotos.length + 1;
      const fileName = `${targetType.toLowerCase()}_page_${pageNumber}_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      setSnappedPhotos((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          url,
          file,
        },
      ]);
    }, 'image/jpeg', 0.80);
  };

  // Remove a snapped photo from the reel
  const handleRemovePhoto = (id: string) => {
    setSnappedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  // Confirm and finish
  const handleFinishAndUse = () => {
    if (snappedPhotos.length === 0) return;
    const files = snappedPhotos.map((p) => p.file);
    stopCameraTracks();
    onPhotosCaptured(files);
    onClose();
  };

  // Fallback file input handler (if camera is unavailable or user chooses files)
  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles: File[] = Array.from(e.target.files);
    const newSnapped = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
      file,
    }));
    setSnappedPhotos((prev) => [...prev, ...newSnapped]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-3 sm:p-5 overflow-hidden select-none">
      {/* Hidden elements for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputFallbackRef}
        type="file"
        multiple={allowMultiple}
        accept="image/*"
        onChange={handleFallbackFileSelect}
        className="hidden"
      />

      {/* Top Controls Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between text-white py-2 px-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 z-20">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-[#7FA0D4]" />
            {title}
          </h2>
          <p className="text-[11px] text-slate-300 line-clamp-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip camera button */}
          <button
            type="button"
            onClick={handleToggleFacingMode}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Switch Camera (Front/Rear)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Close modal */}
          <button
            type="button"
            onClick={() => {
              stopCameraTracks();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Viewfinder Container */}
      <div className="relative w-full max-w-md flex-1 my-3 flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl">
        {/* Shutter flash animation */}
        {shutterAnimation && (
          <div className="absolute inset-0 bg-white z-30 opacity-90 transition-opacity pointer-events-none" />
        )}

        {/* Live Video Element */}
        {!cameraError && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Camera Loading Overlay */}
        {isStartingCamera && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-[#054AC6]" />
            <span className="text-xs font-semibold text-slate-300">Opening Camera...</span>
          </div>
        )}

        {/* Receipt Alignment Framing Guide (Overlay) */}
        {!cameraError && !isStartingCamera && targetType === 'RECEIPT' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="w-full h-[85%] border-2 border-dashed border-white/60 rounded-xl flex flex-col justify-between p-3 relative bg-blue-500/5">
              <div className="flex justify-between items-center text-[10px] font-bold text-white/90 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs self-center">
                <span>Align receipt slice inside box</span>
              </div>
              <div className="text-[10px] text-center text-white/80 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs self-center">
                {snappedPhotos.length === 0 ? 'Step 1: Snap Header / Store Name' : `Step ${snappedPhotos.length + 1}: Snap Next Section / Items`}
              </div>
            </div>
          </div>
        )}

        {/* Camera Error / Permission Blocked Fallback */}
        {cameraError && (
          <div className="p-6 text-center text-white max-w-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
              <p className="text-xs text-slate-300 mt-1">{cameraError}</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera Access
              </button>
              <button
                type="button"
                onClick={() => fileInputFallbackRef.current?.click()}
                className="text-xs font-bold bg-[#054AC6] hover:bg-[#03225F] text-white py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Choose Photos from Device / Gallery
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Reel & Shutter */}
      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 p-3 sm:p-4 text-white z-20 space-y-3">
        {/* Snapped Photos Reel */}
        {snappedPhotos.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Layers className="w-3.5 h-3.5" />
                {snappedPhotos.length} {snappedPhotos.length === 1 ? 'Page' : 'Pages'} Snapped
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {targetType === 'RECEIPT' ? 'Gemini AI will combine into 1 transaction' : 'Project progress records'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin">
              {snappedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative shrink-0 w-16 h-20 bg-slate-800 rounded-lg overflow-hidden border border-white/30 shadow-md group"
                >
                  <img
                    src={photo.url}
                    alt={`Snapped page ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute bottom-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md cursor-pointer transition-colors shadow-xs"
                    title="Delete page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shutter Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Gallery / File picker button */}
          <button
            type="button"
            onClick={() => fileInputFallbackRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
            title="Upload from gallery instead"
          >
            <ImageIcon className="w-4 h-4 text-[#7FA0D4]" />
            <span className="hidden sm:inline">Upload Files</span>
          </button>

          {/* Big Multi-Snap Shutter Button */}
          <button
            id="shutter-snap-button"
            type="button"
            onClick={handleSnapPhoto}
            disabled={isStartingCamera || Boolean(cameraError)}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white hover:bg-slate-100 active:scale-95 transition-all shadow-xl disabled:opacity-50 cursor-pointer group"
            title="Take Photo"
          >
            <div className="w-13 h-13 rounded-full border-2 border-slate-900 flex items-center justify-center bg-white group-hover:bg-slate-50">
              <Camera className="w-6 h-6 text-[#03225F]" />
            </div>
            {/* Pulsing badge showing next page number */}
            <span className="absolute -top-1 -right-1 bg-[#054AC6] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
              +{snappedPhotos.length + 1}
            </span>
          </button>

          {/* Finish & Review Button */}
          <button
            id="finish-camera-capture-btn"
            type="button"
            onClick={handleFinishAndUse}
            disabled={snappedPhotos.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all shadow-lg cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Use ({snappedPhotos.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
