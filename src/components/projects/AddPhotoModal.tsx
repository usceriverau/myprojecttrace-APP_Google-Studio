import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Plus, Trash2, Image, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { PhotoPhase } from '../../types';
import { LiveCameraScanner } from '../common/LiveCameraScanner';

interface AddPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onAddPhotos: (photos: Array<{ imageUrl: string; caption?: string; phase: PhotoPhase; tags?: string[]; takenAt: string }>) => Promise<void>;
}

interface PendingPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  phase: PhotoPhase;
  tagsText: string;
  takenAt: string;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  isOpen,
  onClose,
  projectName,
  onAddPhotos,
}) => {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoItem[]>([]);
  const [defaultPhase, setDefaultPhase] = useState<PhotoPhase>('IN_PROGRESS');
  const [defaultTakenAt, setDefaultTakenAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files || (files as any).length === 0) return;
    setError(null);

    const newItems: PendingPhotoItem[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl,
          caption: '',
          phase: defaultPhase,
          tagsText: '',
          takenAt: defaultTakenAt,
        });
      }
    });

    if (newItems.length === 0) {
      setError('Please select valid image files (JPG, PNG, WEBP).');
      return;
    }

    setPendingPhotos((prev) => [...prev, ...newItems]);
  };

  const handlePhotosFromCamera = (cameraFiles: File[]) => {
    handleFilesSelected(cameraFiles);
  };

  const handleRemovePending = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleUpdateItem = (id: string, field: keyof PendingPhotoItem, value: any) => {
    setPendingPhotos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Convert files to base64 Data URLs so they persist reliably
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSaveAll = async () => {
    if (pendingPhotos.length === 0) {
      setError('Please take or upload at least one project photo.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const formattedPhotos = await Promise.all(
        pendingPhotos.map(async (item) => {
          const dataUrl = await fileToDataUrl(item.file);
          const tags = item.tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

          return {
            imageUrl: dataUrl,
            caption: item.caption.trim() || undefined,
            phase: item.phase,
            tags: tags.length > 0 ? tags : undefined,
            takenAt: item.takenAt || defaultTakenAt,
          };
        })
      );

      await onAddPhotos(formattedPhotos);

      // Clean up object URLs
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingPhotos([]);
      onClose();
    } catch (err: any) {
      console.error('Failed to save project photos:', err);
      setError(err?.message || 'Failed to save project photos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#03225F] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-300" />
              <h2 className="text-base font-black tracking-tight">Add Progress Photos</h2>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Project: <span className="font-semibold text-white">{projectName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Quick Capture Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsLiveCameraOpen(true)}
              className="flex items-center justify-center gap-2.5 p-3.5 bg-blue-50 border border-blue-200 hover:bg-blue-100/80 text-[#054AC6] rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#054AC6]" />
              <span>Take Photos with Camera (Multi-Snap)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload from Gallery (Multiple)</span>
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Defaults Selector */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Default Milestone Phase
              </label>
              <select
                value={defaultPhase}
                onChange={(e) => setDefaultPhase(e.target.value as PhotoPhase)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:border-transparent outline-none"
              >
                <option value="IN_PROGRESS">In Progress (Durante la obra)</option>
                <option value="BEFORE">Before (Antes / Demo)</option>
                <option value="AFTER">After (Completado / Final)</option>
                <option value="INSPECTION">Inspection (Inspección)</option>
                <option value="GENERAL">General Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Date Taken
              </label>
              <input
                type="date"
                value={defaultTakenAt}
                onChange={(e) => setDefaultTakenAt(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#054AC6] focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Pending Photos List */}
          {pendingPhotos.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Selected Photos ({pendingPhotos.length})</span>
                <span className="text-[11px] text-slate-400">Review or add captions below</span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {pendingPhotos.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-start relative shadow-xs"
                  >
                    {/* Thumbnail */}
                    <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                      <img
                        src={item.previewUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Metadata fields */}
                    <div className="flex-1 w-full space-y-2 text-xs">
                      <div>
                        <input
                          type="text"
                          placeholder="Caption / Description (e.g. Rough framing inspection passed)"
                          value={item.caption}
                          onChange={(e) => handleUpdateItem(item.id, 'caption', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#054AC6] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <select
                            value={item.phase}
                            onChange={(e) => handleUpdateItem(item.id, 'phase', e.target.value as PhotoPhase)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 font-medium outline-none"
                          >
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="BEFORE">Before</option>
                            <option value="AFTER">After</option>
                            <option value="INSPECTION">Inspection</option>
                            <option value="GENERAL">General</option>
                          </select>
                        </div>

                        <div>
                          <input
                            type="date"
                            value={item.takenAt}
                            onChange={(e) => handleUpdateItem(item.id, 'takenAt', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <input
                            type="text"
                            placeholder="Tags (Framing, Tile)"
                            value={item.tagsText}
                            onChange={(e) => handleUpdateItem(item.id, 'tagsText', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center cursor-pointer"
                      title="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
              <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No photos selected yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Use the camera or gallery buttons above to add job site progress pictures
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={pendingPhotos.length === 0 || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-[#054AC6] hover:bg-[#03225F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {isSaving ? (
              <span>Saving {pendingPhotos.length} Photos...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save {pendingPhotos.length} Photo{pendingPhotos.length === 1 ? '' : 's'} to Project</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Multi-Snap Live Camera Viewfinder */}
      <LiveCameraScanner
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onPhotosCaptured={handlePhotosFromCamera}
        title="Project Progress Camera"
        subtitle={`Snap sequential job site photos for ${projectName}`}
        targetType="PROJECT_PHOTO"
        allowMultiple={true}
      />
    </div>
  );
};
