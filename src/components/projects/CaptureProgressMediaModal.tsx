import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Video, Upload, X, Plus, Trash2, Calendar, 
  Tag, CheckCircle2, Play, Pause, RotateCw, AlertCircle, 
  Sparkles, Check, Film, Eye, Layers, ShieldCheck, Clock
} from 'lucide-react';
import { PhotoPhase, Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { LiveCameraScanner } from '../common/LiveCameraScanner';

interface CaptureProgressMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string | null;
}

interface PendingMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: 'photo' | 'video';
  caption: string;
  phase: PhotoPhase;
  tags: string[];
  takenAt: string;
  duration?: number;
}

export const CaptureProgressMediaModal: React.FC<CaptureProgressMediaModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const { projects, selectedProjectId, addMultipleProjectPhotos } = useProjects();
  const { currentUser } = useAuth();

  // Target project
  const initialProjId = defaultProjectId || selectedProjectId || projects[0]?.projectId || '';
  const [targetProjectId, setTargetProjectId] = useState<string>(initialProjId);

  // Phase & default tags
  const [globalPhase, setGlobalPhase] = useState<PhotoPhase>('IN_PROGRESS');
  const [globalTakenAt, setGlobalTakenAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'upload' | 'camera_photo' | 'record_video'>('upload');

  // Media items list
  const [pendingItems, setPendingItems] = useState<PendingMediaItem[]>([]);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Video recording state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial target project
  useEffect(() => {
    if (defaultProjectId) {
      setTargetProjectId(defaultProjectId);
    } else if (selectedProjectId) {
      setTargetProjectId(selectedProjectId);
    } else if (projects.length > 0 && !targetProjectId) {
      setTargetProjectId(projects[0].projectId);
    }
  }, [defaultProjectId, selectedProjectId, projects, targetProjectId]);

  // Clean up media streams and object URLs on unmount/close
  const stopVideoStream = useCallback(() => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  }, [videoStream]);

  useEffect(() => {
    if (!isOpen) {
      stopVideoStream();
      // Revoke pending object URLs to avoid memory leaks
      pendingItems.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      setPendingItems([]);
      setError(null);
      setSuccessToast(null);
      setActiveTab('upload');
    }
  }, [isOpen, stopVideoStream]);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.projectId === targetProjectId) || projects[0];

  // Start video stream for recording tab
  const startVideoRecordingStream = async (mode: 'environment' | 'user') => {
    try {
      stopVideoStream();
      setCameraPermissionError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Video camera recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: true,
      });

      setVideoStream(stream);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch((e) => console.warn('Autoplay error:', e));
      }
    } catch (err: any) {
      console.error('Error starting video stream:', err);
      let msg = 'Could not access camera or microphone for video recording.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera/Microphone permission was denied. Please allow access or select a video file.';
      }
      setCameraPermissionError(msg);
    }
  };

  const handleToggleVideoTab = () => {
    setActiveTab('record_video');
    startVideoRecordingStream(facingMode);
  };

  const handleSwitchFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startVideoRecordingStream(nextMode);
  };

  // Start recording
  const handleStartRecording = () => {
    if (!videoStream) return;
    setRecordedChunks([]);
    setRecordingSeconds(0);
    setError(null);

    try {
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(videoStream, selectedMime ? { mimeType: selectedMime } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const file = new File([blob], `progress-video-${Date.now()}.webm`, {
          type: recorder.mimeType || 'video/webm',
        });
        const previewUrl = URL.createObjectURL(blob);

        setPendingItems((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            file,
            previewUrl,
            mediaType: 'video',
            caption: '',
            phase: globalPhase,
            tags: ['video', 'walkthrough'],
            takenAt: globalTakenAt,
            duration: recordingSeconds,
          },
        ]);

        stopVideoStream();
        setActiveTab('upload');
      };

      recorder.start(1000); // 1-sec slices
      setMediaRecorder(recorder);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) { // Max 3 minutes
            recorder.stop();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setError('Could not start video recording: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  // Handle files selected via file input
  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files || (files as any).length === 0) return;
    setError(null);

    const newItems: PendingMediaItem[] = [];
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|m4v|avi)$/i);
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|heic|bmp)$/i);

      if (isVideo || isImage) {
        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl,
          mediaType: isVideo ? 'video' : 'photo',
          caption: '',
          phase: globalPhase,
          tags: isVideo ? ['progress-video'] : [],
          takenAt: globalTakenAt,
        });
      }
    });

    if (newItems.length === 0) {
      setError('Please select valid photo or video files.');
      return;
    }

    setPendingItems((prev) => [...prev, ...newItems]);
  };

  const handlePhotosFromCamera = (cameraFiles: File[]) => {
    handleFilesSelected(cameraFiles);
    setIsLiveCameraOpen(false);
  };

  const handleRemovePending = (id: string) => {
    setPendingItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleUpdateItem = (id: string, field: keyof PendingMediaItem, value: any) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddTagToItem = (id: string, tag: string) => {
    setPendingItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const currentTags = item.tags || [];
          if (!currentTags.includes(tag)) {
            return { ...item, tags: [...currentTags, tag] };
          }
        }
        return item;
      })
    );
  };

  const handleRemoveTagFromItem = (id: string, tagToRemove: string) => {
    setPendingItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, tags: (item.tags || []).filter((t) => t !== tagToRemove) };
        }
        return item;
      })
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
    if (!targetProjectId) {
      setError('Please select a target project.');
      return;
    }
    if (pendingItems.length === 0) {
      setError('Please take or upload at least one photo or video.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const preparedPayload = await Promise.all(
        pendingItems.map(async (item) => {
          const dataUrl = await fileToDataUrl(item.file);
          return {
            imageUrl: dataUrl,
            mediaType: item.mediaType,
            videoUrl: item.mediaType === 'video' ? dataUrl : undefined,
            caption: item.caption.trim() || (item.mediaType === 'video' ? 'Progress Video' : 'Progress Photo'),
            phase: item.phase,
            tags: item.tags,
            takenAt: item.takenAt,
          };
        })
      );

      await addMultipleProjectPhotos(targetProjectId, preparedPayload);
      setSuccessToast(`Successfully saved ${pendingItems.length} media record(s) to ${currentProject?.projectName || 'project'}.`);
      
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save project media:', err);
      setError(err.message || 'Failed to save photos/videos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const quickTagsList = [
    'Demolition', 'Framing', 'Electrical', 'Plumbing', 
    'HVAC', 'Insulation', 'Drywall', 'Paint', 
    'Flooring', 'Tile', 'Cabinetry', 'Countertops', 
    'Fixtures', 'Exterior', 'Inspection', 'Walkthrough'
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSaving && !isRecording) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
          
          {/* Header */}
          <div className="bg-[#03225F] p-4 text-white flex items-center justify-between border-b border-[#054AC6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center border border-emerald-400/40 shadow-xs">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Project Progress Media Capture
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Photos & Videos
                  </span>
                </h3>
                <p className="text-xs text-[#7FA0D4]">
                  Capture jobsite proof, progress logs, inspections, and video walkthroughs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving || isRecording}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Target Project & Phase Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Project *
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectName} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Phase *
                </label>
                <select
                  value={globalPhase}
                  onChange={(e) => {
                    const nextPhase = e.target.value as PhotoPhase;
                    setGlobalPhase(nextPhase);
                    setPendingItems((prev) => prev.map((item) => ({ ...item, phase: nextPhase })));
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#054AC6] focus:outline-none"
                >
                  <option value="BEFORE">BEFORE (Initial Site Conditions)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (Active Construction)</option>
                  <option value="AFTER">AFTER (Completed & Final)</option>
                  <option value="INSPECTION">INSPECTION (City / Safety QA)</option>
                  <option value="GENERAL">GENERAL (Site Documentation)</option>
                </select>
              </div>
            </div>

            {/* Mode Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  stopVideoStream();
                  setActiveTab('upload');
                  fileInputRef.current?.click();
                }}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload' && !isRecording
                    ? 'bg-blue-50/70 border-[#054AC6] text-[#03225F]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-5 h-5 text-[#054AC6]" />
                <span className="text-xs font-bold">Upload Files</span>
                <span className="text-[10px] text-slate-500">Photos & MP4/MOV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopVideoStream();
                  setActiveTab('camera_photo');
                  setIsLiveCameraOpen(true);
                }}
                className="p-3 rounded-xl border bg-white hover:bg-blue-50 border-slate-200 text-slate-700 hover:text-[#054AC6] text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-[#054AC6]" />
                <span className="text-xs font-bold">Snap Photos</span>
                <span className="text-[10px] text-slate-500">Continuous Camera</span>
              </button>

              <button
                type="button"
                onClick={handleToggleVideoTab}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  activeTab === 'record_video'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <Video className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">Record Video</span>
                <span className="text-[10px] text-slate-500">Live Walkthrough</span>
              </button>
            </div>

            {/* Hidden File Input for Multiple Uploads */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            {/* Video Recording Live Studio Area if activeTab === 'record_video' */}
            {activeTab === 'record_video' && (
              <div className="bg-slate-950 rounded-2xl p-4 text-white space-y-3 border border-slate-800 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold">Live Progress Video Recorder</span>
                  </div>
                  {isRecording && (
                    <div className="bg-red-600 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                    </div>
                  )}
                </div>

                {cameraPermissionError ? (
                  <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-xl text-xs text-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{cameraPermissionError}</p>
                      <button
                        type="button"
                        onClick={() => startVideoRecordingStream(facingMode)}
                        className="mt-2 text-[11px] underline font-bold text-white hover:text-red-200"
                      >
                        Try Requesting Camera Permission Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoPreviewRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Switch Camera Button (Front/Back) */}
                    {!isRecording && (
                      <button
                        type="button"
                        onClick={handleSwitchFacingMode}
                        title="Switch Camera (Front/Rear)"
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs border border-white/20 transition-all cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Recorder Controls */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!videoStream}
                      className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      <span>Start Recording Walkthrough</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-red-600 font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer animate-pulse"
                    >
                      <div className="w-3 h-3 bg-red-600 rounded-xs" />
                      <span>Stop & Add to Progress Gallery</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      stopVideoStream();
                      setActiveTab('upload');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Toast */}
            {successToast && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{successToast}</span>
              </div>
            )}

            {/* Selected / Pending Media Queue */}
            {pendingItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#054AC6]" />
                    Ready to Save ({pendingItems.length} items)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPendingItems([])}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {pendingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 relative group"
                    >
                      {/* Media Thumbnail */}
                      <div className="w-full sm:w-28 h-28 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center border border-slate-200">
                        {item.mediaType === 'video' ? (
                          <div className="relative w-full h-full">
                            <video
                              src={item.previewUrl}
                              className="w-full h-full object-cover"
                              controls={false}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Film className="w-6 h-6 text-white" />
                            </div>
                            <span className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-mono font-bold px-1 rounded">
                              VIDEO
                            </span>
                          </div>
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt="Progress preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Details & Tags */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) => handleUpdateItem(item.id, 'caption', e.target.value)}
                            placeholder={item.mediaType === 'video' ? 'e.g. Master Bathroom Plumbing Rough-In Video' : 'e.g. Framing completed on second floor'}
                            className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#054AC6] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePending(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Phase & Date */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={item.phase}
                              onChange={(e) => handleUpdateItem(item.id, 'phase', e.target.value as PhotoPhase)}
                              className="w-full text-[11px] font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none"
                            >
                              <option value="BEFORE">BEFORE</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="AFTER">AFTER (DONE)</option>
                              <option value="INSPECTION">INSPECTION</option>
                              <option value="GENERAL">GENERAL</option>
                            </select>
                          </div>

                          <div>
                            <input
                              type="date"
                              value={item.takenAt}
                              onChange={(e) => handleUpdateItem(item.id, 'takenAt', e.target.value)}
                              className="w-full text-[11px] font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Quick Tags Selection */}
                        <div className="flex flex-wrap gap-1 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Tags:</span>
                          {item.tags.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] bg-blue-100 text-[#054AC6] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                            >
                              #{t}
                              <button
                                type="button"
                                onClick={() => handleRemoveTagFromItem(item.id, t)}
                                className="hover:text-rose-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          <div className="flex gap-1 overflow-x-auto max-w-[280px] py-0.5">
                            {quickTagsList.slice(0, 5).map((qTag) => (
                              <button
                                key={qTag}
                                type="button"
                                onClick={() => handleAddTagToItem(item.id, qTag.toLowerCase())}
                                className="text-[9px] bg-white hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 transition-colors shrink-0"
                              >
                                +{qTag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isRecording}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pendingItems.length === 0 || isSaving || isRecording}
                onClick={handleSaveAll}
                className="px-5 py-2 text-xs font-bold bg-[#054AC6] hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <span>Saving Media Records...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save {pendingItems.length > 0 ? `${pendingItems.length} Progress Media` : 'to Project'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Camera Scanner Modal */}
      {isLiveCameraOpen && (
        <LiveCameraScanner
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onPhotosCaptured={handlePhotosFromCamera}
          title="Project Progress Photo Camera"
          subtitle="Point at project jobsite work to take clear milestone photos"
          targetType="PROJECT_PHOTO"
          allowMultiple={true}
        />
      )}
    </>
  );
};
