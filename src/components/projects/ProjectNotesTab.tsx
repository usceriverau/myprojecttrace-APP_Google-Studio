import React, { useState } from 'react';
import { 
  Project, 
  ProjectNote, 
  NoteCategory 
} from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { AddNoteModal } from './AddNoteModal';
import { formatDate } from '../../lib/utils';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Pin, 
  Palette, 
  Key, 
  User, 
  Tag, 
  Calendar, 
  Check, 
  Copy,
  Layers,
  Sparkles
} from 'lucide-react';

interface ProjectNotesTabProps {
  project: Project;
}

export const ProjectNotesTab: React.FC<ProjectNotesTabProps> = ({ project }) => {
  const { getProjectNotes, addProjectNote, updateProjectNote, deleteProjectNote } = useProjects();
  const notes = getProjectNotes(project.projectId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Sort: pinned first, then newest
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredNotes = sortedNotes.filter((note) => {
    const matchesCategory = selectedCategory === 'ALL' || note.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.colorCodes?.some((c) => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      note.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: NoteCategory) => {
    switch (category) {
      case 'PAINT_COLOR':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Palette className="w-3 h-3" />
            PAINT & COLORS
          </span>
        );
      case 'SPECIFICATION':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Layers className="w-3 h-3" />
            SPECS / MATERIALS
          </span>
        );
      case 'ACCESS_SITE':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Key className="w-3 h-3" />
            ACCESS & CODES
          </span>
        );
      case 'CLIENT':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <User className="w-3 h-3" />
            CLIENT REQUEST
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <FileText className="w-3 h-3" />
            GENERAL NOTE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & New Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#054AC6]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Notes & Specifications</h2>
              <p className="text-xs text-slate-500">
                Paint codes, material specifications, gate codes, and job instructions ({notes.length} records)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingNote(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#054AC6] hover:bg-[#03225F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note / Color Code</span>
          </button>
        </div>
      </div>

      {/* Category filters and search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PAINT_COLOR', 'SPECIFICATION', 'ACCESS_SITE', 'CLIENT', 'GENERAL'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#03225F] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'ALL' ? `All Notes (${notes.length})` : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search notes, colors, codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#054AC6] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.noteId}
              className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs ${
                note.isPinned
                  ? 'border-blue-200 ring-1 ring-blue-100 bg-linear-to-b from-blue-50/20 to-white'
                  : 'border-slate-200'
              }`}
            >
              {/* Note Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(note.category)}
                    {note.isPinned && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        PINNED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateProjectNote(project.projectId, note.noteId, { isPinned: !note.isPinned })
                      }
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        note.isPinned
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete note "${note.title}"?`)) {
                          await deleteProjectNote(project.projectId, note.noteId);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{note.title}</h3>
              </div>

              {/* Color Code Palette Items (if present) */}
              {note.colorCodes && note.colorCodes.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Color Specifications
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {note.colorCodes.map((item, cidx) => (
                      <div
                        key={cidx}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md border border-slate-300 shrink-0 shadow-inner"
                            style={{ backgroundColor: item.hexColor || '#E2DEC9' }}
                            title={`Hex: ${item.hexColor || '#E2DEC9'}`}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              <span className="font-semibold text-blue-700">{item.code}</span>
                              {item.brand && ` • ${item.brand}`}
                              {item.finish && ` • ${item.finish}`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              `${item.name}: ${item.code} (${item.brand || ''} ${item.finish || ''})`,
                              `${note.noteId}-${cidx}`
                            )
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors shrink-0 cursor-pointer"
                          title="Copy color spec"
                        >
                          {copiedCode === `${note.noteId}-${cidx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note Content Text */}
              {note.content && (
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {note.content}
                </p>
              )}

              {/* Tags & Footer Metadata */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {note.tags && note.tags.length > 0 && (
                    note.tags.map((t, tidx) => (
                      <span
                        key={tidx}
                        className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded text-[10px]"
                      >
                        #{t}
                      </span>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span>{formatDate(note.createdAt)}</span>
                  {note.createdBy && <span>by {note.createdBy}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#054AC6] mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No project notes yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Record paint codes, lock combinations, client requests, and job instructions.
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#054AC6] hover:bg-[#03225F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <AddNoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        projectName={project.projectName}
        editingNote={editingNote}
        onSaveNote={async (noteData) => {
          if (editingNote) {
            await updateProjectNote(project.projectId, editingNote.noteId, noteData);
          } else {
            await addProjectNote(project.projectId, { ...noteData, projectId: project.projectId });
          }
        }}
      />

    </div>
  );
};
