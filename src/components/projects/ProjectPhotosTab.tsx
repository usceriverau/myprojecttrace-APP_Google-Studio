import React, { useState } from 'react';
import { 
  Project, 
  ProjectPhoto, 
  PhotoPhase 
} from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { AddPhotoModal } from './AddPhotoModal';
import { formatDate } from '../../lib/utils';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Maximize2, 
  X, 
  Filter, 
  Calendar, 
  Tag, 
  User, 
  Sparkles, 
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Play,
  Video
} from 'lucide-react';

interface ProjectPhotosTabProps {
  project: Project;
}

export const ProjectPhotosTab: React.FC<ProjectPhotosTabProps> = ({ project }) => {
  const { getProjectPhotos, addMultipleProjectPhotos, deleteProjectPhoto } = useProjects();
  const photos = getProjectPhotos(project.projectId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PhotoPhase | 'ALL'>('ALL');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered photos
  const filteredPhotos = photos.filter((ph) => {
    const matchesPhase = selectedPhase === 'ALL' || ph.phase === selectedPhase;
    const matchesSearch = 
      !searchQuery ||
      ph.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ph.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ph.uploadedBy?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPhase && matchesSearch;
  });

  const getPhaseBadge = (phase: PhotoPhase) => {
    switch (phase) {
      case 'BEFORE':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">BEFORE</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">IN PROGRESS</span>;
      case 'AFTER':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">AFTER (DONE)</span>;
      case 'INSPECTION':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md">INSPECTION</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">MILESTONE</span>;
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev! + 1) % filteredPhotos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev! - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const activePhoto = activePhotoIndex !== null ? filteredPhotos[activePhotoIndex] : null;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#054AC6]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Progress Photos</h2>
              <p className="text-xs text-slate-500">
                Visual jobsite records, inspections, and milestone documentation ({photos.length} photos)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#054AC6] hover:bg-[#03225F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Add / Take Photos</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'BEFORE', 'IN_PROGRESS', 'AFTER', 'INSPECTION'] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedPhase === phase
                  ? 'bg-[#03225F] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {phase === 'ALL' ? `All Photos (${photos.length})` : phase.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search captions or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#054AC6] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, idx) => (
            <div
              key={photo.photoId}
              onClick={() => setActivePhotoIndex(idx)}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col relative"
            >
              {/* Image / Video Thumbnail */}
              <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
                {photo.mediaType === 'video' || photo.imageUrl.startsWith('data:video') ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      src={photo.imageUrl}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                      <Film className="w-2.5 h-2.5" />
                      VIDEO
                    </span>
                  </div>
                ) : (
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || 'Project photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
                
                {/* Overlay Tag / Badge */}
                <div className="absolute top-2.5 left-2.5">
                  {getPhaseBadge(photo.phase)}
                </div>

                {photo.mediaType !== 'video' && !photo.imageUrl.startsWith('data:video') && (
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <div className="bg-slate-900/75 text-white p-1.5 rounded-lg backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/90 bg-slate-950/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    {formatDate(photo.takenAt)}
                  </span>
                  {photo.uploadedBy && (
                    <span className="truncate max-w-[90px]">{photo.uploadedBy}</span>
                  )}
                </div>
              </div>

              {/* Caption & Tags */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <p className="text-xs text-slate-800 line-clamp-2 font-medium">
                  {photo.caption || <span className="text-slate-400 italic">No caption provided</span>}
                </p>

                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {photo.tags.map((t, tidx) => (
                      <span
                        key={tidx}
                        className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#054AC6] mx-auto mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No photos found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {photos.length === 0
              ? 'Start documenting this jobsite by taking or uploading progress photos.'
              : 'No photos match the selected filter or search term.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#054AC6] hover:bg-[#03225F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Add Photos Now</span>
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 select-none animate-in fade-in duration-150"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white pb-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300">
                Photo {activePhotoIndex! + 1} of {filteredPhotos.length}
              </span>
              {getPhaseBadge(activePhoto.phase)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (confirm('Delete this photo from the project records?')) {
                    await deleteProjectPhoto(activePhoto.photoId, project.projectId);
                    setActivePhotoIndex(null);
                  }
                }}
                className="p-2 text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 rounded-xl transition-colors cursor-pointer"
                title="Delete Photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePhotoIndex(null)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main Image Container with Navigation Arrows */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {filteredPhotos.length > 1 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 sm:left-6 z-10 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {activePhoto.mediaType === 'video' || activePhoto.imageUrl.startsWith('data:video') ? (
              <video
                src={activePhoto.imageUrl}
                controls
                autoPlay
                className="max-h-[70vh] sm:max-h-[75vh] max-w-full rounded-xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.caption || 'Project visual'}
                className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}

            {filteredPhotos.length > 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 sm:right-6 z-10 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Metadata Card */}
          <div
            className="max-w-2xl mx-auto w-full bg-slate-900/90 border border-slate-800 text-white p-4 rounded-2xl backdrop-blur-md shrink-0 space-y-2 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Date: <strong className="text-white">{formatDate(activePhoto.takenAt)}</strong>
              </span>
              {activePhoto.uploadedBy && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Captured by: <strong className="text-white">{activePhoto.uploadedBy}</strong>
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-100">
              {activePhoto.caption || <span className="text-slate-500 italic">No caption provided</span>}
            </p>

            {activePhoto.tags && activePhoto.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Tag className="w-3 h-3 text-slate-400" />
                {activePhoto.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Photos Modal */}
      <AddPhotoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectName={project.projectName}
        onAddPhotos={async (photosData) => {
          await addMultipleProjectPhotos(project.projectId, photosData);
        }}
      />

    </div>
  );
};
