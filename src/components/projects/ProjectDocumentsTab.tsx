import React, { useState, useRef } from 'react';
import { Project, ProjectDocument, DocumentType } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/utils';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  Download, 
  FileCheck, 
  Layers, 
  ShieldAlert, 
  Loader2, 
  Plus,
  ExternalLink,
  Filter
} from 'lucide-react';

interface ProjectDocumentsTabProps {
  project: Project;
}

const DOCUMENT_TYPES: { type: DocumentType; label: string; color: string }[] = [
  { type: 'CONTRACT', label: 'Contract Agreement', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'CHANGE_ORDER', label: 'Change Order', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'BLUEPRINT', label: 'Blueprint / Plans', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'PERMIT', label: 'City Permit', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'INVOICE', label: 'Invoice / Billing', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'OTHER', label: 'General Document', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ project }) => {
  const { projectDocuments, uploadProjectDocument, deleteProjectDocument } = useProjects();
  const { isOwnerOrAdmin } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>('CONTRACT');
  const [filterType, setFilterType] = useState<DocumentType | 'ALL'>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const docs = projectDocuments.filter(d => d.projectId === project.projectId);
  const filteredDocs = filterType === 'ALL' ? docs : docs.filter(d => d.documentType === filterType);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadProjectDocument(project.projectId, selectedType, file);
      }
    } catch (err: any) {
      console.error('[MyProjectTrace] Document upload error:', err);
      setErrorMessage(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docItem: ProjectDocument) => {
    if (!window.confirm(`Are you sure you want to delete ${docItem.fileName}?`)) return;
    setDeletingId(docItem.documentId);
    try {
      await deleteProjectDocument(project.projectId, docItem.documentId, docItem.secureStorageReference);
    } catch (err: any) {
      console.error('[MyProjectTrace] Document delete error:', err);
      setErrorMessage(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Box */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Documents & Contracts</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Securely store blueprints, client signed contracts, city permits, and change orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-[#054AC6] hover:bg-[#03225F] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('ALL')}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-[#03225F] text-white border-[#03225F]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({docs.length})
        </button>
        {DOCUMENT_TYPES.map(t => {
          const count = docs.filter(d => d.documentType === t.type).length;
          return (
            <button
              key={t.type}
              onClick={() => setFilterType(t.type)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                filterType === t.type
                  ? 'bg-[#03225F] text-white border-[#03225F]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No documents in this category</p>
          <p className="text-xs text-slate-500">
            Upload contract scans, architectural plans, or signed change orders for safe audit-ready storage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocs.map((docItem) => {
            const typeConfig = DOCUMENT_TYPES.find(t => t.type === docItem.documentType) || DOCUMENT_TYPES[5];
            const isDeleting = deletingId === docItem.documentId;

            return (
              <div
                key={docItem.documentId}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5 text-[#054AC6]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatFileSize(docItem.fileSize)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate" title={docItem.fileName}>
                      {docItem.fileName}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Uploaded {formatDate(docItem.createdAt)} by {docItem.uploadedBy}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {docItem.fileUrl && (
                    <a
                      href={docItem.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={docItem.fileName}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Download / View document"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleDelete(docItem)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete document"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
